import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/ollama/client";
import type { Flashcard } from "@/types/schema";

const SYSTEM_PROMPT = `You generate flashcards for one chapter of a self-paced course.
Respond with ONLY a valid JSON array — start with [ end with ] — no prose, no code fences.
Produce 4 to 6 flashcard objects. Each has:
"question" (one clear, specific, testable question) and "answer" (2-4 sentences that fully answer it).
Output ONLY the JSON array.`;

function parseJson(text: string): { question: string; answer: string }[] | null {
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
  }));

  return NextResponse.json({ flashcards });
}
