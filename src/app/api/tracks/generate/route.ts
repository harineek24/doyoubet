import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/ollama/client";
import { chapter } from "@/lib/store/tracks";
import type { Flashcard, TrackChapter } from "@/types/schema";

// Derives a short chapter title from a Socratic question.
// e.g. "How does in-order traversal work?" → "In-order Traversal"
function titleFromQuestion(q: string): string {
  return q
    .replace(/^(what is|what are|how does|how do|why is|why are|when (do|should|is)|what('s| is) the difference between)\s+/i, "")
    .replace(/\?$/, "")
    .trim()
    .split(" ")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
    .slice(0, 40);
}

function uid() { return Math.random().toString(36).slice(2, 10); }

function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { const d = JSON.parse(cleaned); return d; } catch { /* */ }
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
        try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { break; }
      }
    }
  }
  return null;
}

const CARDS_SYSTEM = `You generate a structured set of learning cards for one Socratic question about a programming/CS subject.

OUTPUT FORMAT
Respond with ONLY a valid JSON array — first character [ last character ] — no prose, no markdown, no code fences.
Produce EXACTLY 6 card objects in this order:

1. { "cardType": "key-concept", "question": "Key Concept", "answer": "..." }
   One clear sentence defining the concept. No code.

2. { "cardType": "how-it-works", "question": "How It Works", "answer": "..." }
   2-3 sentences explaining the mechanism or process. No code.

3. { "cardType": "example", "exampleIndex": 1, "question": "Example 1", "answer": "...", "code": "..." }
   One sentence explaining what the code demonstrates. See code rules below.

4. { "cardType": "example", "exampleIndex": 2, "question": "Example 2", "answer": "...", "code": "..." }
   A different angle or variation from Example 1. See code rules below.

5. { "cardType": "example", "exampleIndex": 3, "question": "Example 3", "answer": "...", "code": "..." }
   An edge case, gotcha, or real-world usage. See code rules below.

6. { "cardType": "why-it-matters", "question": "Why It Matters", "answer": "..." }
   2-3 sentences on real-world relevance, when to use it, common interview context. No code.

CODE RULES (all three example cards must follow every rule):
- Self-contained: no file I/O, no network calls, no user input(), no external packages
- Only Python stdlib imports are allowed (e.g. collections, itertools, math, heapq, re, functools)
- Must produce visible output — every snippet must have at least one print() call
- ≤10 lines, no class definitions unless the question is specifically about OOP
- Must actually run without errors — test mentally before writing
- Properly escaped for JSON: use \\n for newlines, \\" for quotes inside strings

Rules:
- answer is always plain prose — no bullet lists, no markdown headers inside the string
- Output ONLY the JSON array`;

async function generateCardsForQuestion(
  subject: string,
  question: string
): Promise<Flashcard[]> {
  const prompt = `Subject: ${subject}\nQuestion: ${question}`;
  const content = await llmChat(prompt, CARDS_SYSTEM);
  const raw = parseJson<{ cardType: string; question: string; answer: string; code?: string; exampleIndex?: number }[]>(content);
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((c) => ({
    id: uid(),
    question: c.question ?? "",
    answer: c.answer ?? "",
    ...(c.code ? { code: c.code } : {}),
    ...(c.cardType ? { cardType: c.cardType as Flashcard["cardType"] } : {}),
    ...(c.exampleIndex ? { exampleIndex: c.exampleIndex } : {}),
  }));
}

export async function POST(request: NextRequest) {
  const { title, questions } = await request.json();

  if (!title?.trim())
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  if (!Array.isArray(questions) || questions.length === 0)
    return NextResponse.json({ error: "questions array is required." }, { status: 400 });

  const trackId = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const chapters: TrackChapter[] = [];
  const errors: string[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as string;
    const chTitle = titleFromQuestion(q);

    let flashcards: Flashcard[] = [];
    try {
      flashcards = await generateCardsForQuestion(title, q);
    } catch (e) {
      errors.push(`Q${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
    }

    const ch = chapter(trackId, i + 1, chTitle, q, `Explore: ${q}`, [], "");
    chapters.push({ ...ch, flashcards });
  }

  if (chapters.length === 0)
    return NextResponse.json({ error: errors.join("; ") || "Generation failed." }, { status: 502 });

  return NextResponse.json({ trackId, chapters, errors: errors.length ? errors : undefined });
}
