import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/ollama/client";
import { chapter } from "@/lib/store/tracks";
import type { TrackChapter } from "@/types/schema";

interface RawChapter {
  title: string;
  sub: string;
  desc: string;
  tags: string[];
  body: string;
}

const SYSTEM_PROMPT = `You turn a learner's raw notes into a structured mini-course outline.
Your entire response must be ONLY a valid JSON array. Start with [ and end with ]. No prose, no code fences.
Produce 4 to 8 chapters breaking the subject into a sensible learning order.
Each element must have exactly these fields:
- "title": short chapter title (5 words max)
- "sub": kicker subtitle (4 words max)
- "desc": one sentence teaser
- "tags": array of 2-4 topic strings
- "body": full lesson content in markdown, 120-200 words, clear teaching voice

Output ONLY the JSON array. Nothing else.`;

function parseJson(text: string): RawChapter[] | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct)) return direct;
  } catch { /* fall through */ }

  // Depth-counting bracket extraction — handles trailing prose after the JSON
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
      { error: `Could not parse a structured outline. Response: "${content.slice(0, 300)}"` },
      { status: 502 }
    );
  }

  const trackId = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const chapters: TrackChapter[] = raw.map((c, i) =>
    chapter(
      trackId,
      i + 1,
      c.title ?? `Chapter ${i + 1}`,
      c.sub ?? "",
      c.desc ?? "",
      Array.isArray(c.tags) ? c.tags : [],
      c.body ?? ""
    )
  );

  return NextResponse.json({ trackId, chapters });
}
