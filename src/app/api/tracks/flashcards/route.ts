import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/ollama/client";
import type { Flashcard } from "@/types/schema";

const SYSTEM_PROMPT = `You generate flashcards for one chapter of a self-paced course.

OUTPUT FORMAT
Respond with ONLY a valid JSON array — first character [ , last character ] — no prose, no markdown, no code fences, no trailing commas.
Each element is an object with exactly these keys, in this order:
- "question": string — one clear, specific, testable plain-text question. NO code in the question field — not even inline snippets or function signatures. If the question is about reading a piece of code, put the code in the "code" field and ask e.g. "What does the function above do?" or "What will this code output?". No compound "and/or" questions.
- "answer": string — 2-4 sentences of plain prose that fully explain the concept. Must ADD information beyond what's implied by the question; never restate or reword the question. Do NOT include code blocks or bullet lists in the answer — keep it flowing prose.
- "code": string or omit the key entirely — a runnable Python snippet ≤8 lines, included ONLY when seeing real syntax genuinely helps understanding. Omit the key for pure theory questions rather than setting it to null or "".

Escape all newlines and quotes inside string values properly so the result is valid, parseable JSON.

COVERAGE AND COUNT
Produce 5 to 7 flashcards total.
Together they must cover every major concept in the chapter — prioritize breadth over depth given the small card count.
Each card should test a distinct concept or a distinct angle on a concept (e.g., definition vs. common pitfall vs. contrast with a related idea). Do not create two cards that test the same fact from the same angle.
If the chapter genuinely doesn't contain enough distinct material for 5 cards, produce fewer rather than padding with redundant or trivial questions.

QUESTION QUALITY
Avoid yes/no and "true/false" questions — prefer questions that require recalling or explaining something.
Vary question style across the set: mix definition, "why," "what happens if," and comparison/contrast questions rather than making every card a definition lookup.

Output ONLY the JSON array — nothing before or after it.`;

function parseJson(text: string): { question: string; answer: string; code?: string }[] | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { const d = JSON.parse(cleaned); if (Array.isArray(d)) return d; } catch { /* */ }
  const start = cleaned.indexOf("[");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "[") depth++;
    else if (c === "]") {
      if (--depth === 0) {
        try { const p = JSON.parse(cleaned.slice(start, i + 1)); if (Array.isArray(p)) return p; } catch { break; }
      }
    }
  }
  return null;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

export async function POST(req: NextRequest) {
  const { title, sub, desc, tags, notes } = await req.json();
  if (!title?.trim())
    return NextResponse.json({ error: "title is required" }, { status: 400 });

  const context = [
    `Chapter: ${title}`,
    sub ? `Subtitle: ${sub}` : "",
    desc ? `Description: ${desc}` : "",
    tags?.length ? `Topics: ${tags.join(", ")}` : "",
    notes ? `\nLearner's raw notes for context:\n${notes}` : "",
  ].filter(Boolean).join("\n");

  let content: string;
  try {
    content = await llmChat(context, SYSTEM_PROMPT);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const raw = parseJson(content);
  if (!raw || raw.length === 0)
    return NextResponse.json({ error: `Could not parse flashcards. Got: "${content.slice(0, 200)}"` }, { status: 502 });

  const flashcards: Flashcard[] = raw.map((f) => ({
    id: uid(),
    question: f.question ?? "",
    answer: f.answer ?? "",
    ...(f.code ? { code: f.code } : {}),
  }));

  return NextResponse.json({ flashcards });
}
