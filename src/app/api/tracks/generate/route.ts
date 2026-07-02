import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/ollama/client";
import { chapter } from "@/lib/store/tracks";
import type { Flashcard, TrackChapter } from "@/types/schema";

interface RawFlashcard {
  question: string;
  answer: string;
}

interface RawChapter {
  title: string;
  sub: string;
  desc: string;
  tags: string[];
  flashcards: RawFlashcard[];
}

const SYSTEM_PROMPT = `You turn a learner's raw notes into a structured mini-course outline.
Your entire response must be ONLY a valid JSON array. Start with [ and end with ]. No prose, no code fences.
Produce 4 to 6 chapters breaking the subject into a logical learning order.
Each element must have exactly these fields:
- "title": short chapter title (5 words max)
- "sub": kicker subtitle (4 words max)
- "desc": one sentence teaser
- "tags": array of 2-3 topic strings
- "flashcards": array of 3-5 objects, each with "question" (one clear testable question) and "answer" (2-4 sentence explanation)

Output ONLY the JSON array. Nothing else.`;

function parseJson(text: string): RawChapter[] | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) return direct;
  } catch { /* fall through */ }

  for (const [open, close] of [["[", "]"]] as [string, string][]) {
    const start = cleaned.indexOf(open);
    if (start === -1) continue;
    let depth = 0, inStr = false, escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inStr) { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(cleaned.slice(start, i + 1));
            if (Array.isArray(parsed)) return parsed;
          } catch { break; }
        }
      }
    }
  }

  return null;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(request: NextRequest) {
  const { title, notes } = await request.json();

  if (!title?.trim() || !notes?.trim()) {
    return NextResponse.json({ error: "Title and notes are required." }, { status: 400 });
  }

  let content: string;
  try {
    content = await llmChat(
      `Subject: ${title}\n\nNotes:\n${notes}`,
      SYSTEM_PROMPT
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[tracks/generate]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const raw = parseJson(content);

  if (!raw || raw.length === 0) {
    console.error("[tracks/generate] Could not parse response:", content.slice(0, 400));
    return NextResponse.json(
      { error: `Could not parse outline. Response: "${content.slice(0, 300)}"` },
      { status: 502 }
    );
  }

  const trackId = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const chapters: TrackChapter[] = raw.map((c, i) => {
    const flashcards: Flashcard[] = (c.flashcards ?? []).map((f) => ({
      id: uid(),
      question: f.question ?? "",
      answer: f.answer ?? "",
    }));

    return {
      ...chapter(
        trackId,
        i + 1,
        c.title ?? `Chapter ${i + 1}`,
        c.sub ?? "",
        c.desc ?? "",
        Array.isArray(c.tags) ? c.tags : [],
        ""
      ),
      flashcards,
    };
  });

  return NextResponse.json({ trackId, chapters });
}
