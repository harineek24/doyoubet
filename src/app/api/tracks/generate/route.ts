import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/ollama/client";
import { chapter } from "@/lib/store/tracks";
import type { TrackChapter } from "@/types/schema";

// Stage-1 generation: chapters only (title/sub/desc/tags).
// Flashcards are generated lazily per-chapter via /api/tracks/flashcards.
// Keeping output small (~80-150 tokens) makes this reliable even on free-tier Groq.
interface RawChapter {
  title: string;
  sub: string;
  desc: string;
  tags: string[];
}

const SYSTEM_PROMPT = `You turn a learner's notes into a structured mini-course outline.
Respond with ONLY a valid JSON array — start with [ end with ] — no prose, no code fences.
Produce 4 to 6 chapter objects. Each object has exactly:
"title" (≤5 words), "sub" (≤4 words), "desc" (one sentence), "tags" (2-3 strings).
Output ONLY the JSON array.`;

function parseJson(text: string): RawChapter[] | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    const d = JSON.parse(cleaned);
    if (Array.isArray(d)) return d;
  } catch { /* fall through */ }
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

export async function POST(request: NextRequest) {
  const { title, notes } = await request.json();
  if (!title?.trim() || !notes?.trim())
    return NextResponse.json({ error: "Title and notes are required." }, { status: 400 });

  let content: string;
  try {
    content = await llmChat(`Subject: ${title}\n\nNotes:\n${notes}`, SYSTEM_PROMPT);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const raw = parseJson(content);
  if (!raw || raw.length === 0)
    return NextResponse.json({ error: `Could not parse outline. Got: "${content.slice(0, 200)}"` }, { status: 502 });

  const trackId = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const chapters: TrackChapter[] = raw.map((c, i) =>
    chapter(trackId, i + 1, c.title ?? `Chapter ${i + 1}`, c.sub ?? "", c.desc ?? "", Array.isArray(c.tags) ? c.tags : [], "")
  );

  return NextResponse.json({ trackId, chapters });
}
