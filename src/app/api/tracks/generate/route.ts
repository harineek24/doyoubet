import { NextRequest, NextResponse } from "next/server";
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
Respond with ONLY a JSON array, no prose, no markdown code fences. Produce 4 to 8 chapters that
break the subject into a sensible learning order. Each array element must be an object with
exactly these fields:
- "title": short chapter title (string)
- "sub": a short kicker/subtitle, under 6 words (string)
- "desc": a 1-2 sentence teaser summary (string)
- "tags": 2-4 short topic tags (array of strings)
- "body": the actual lesson content as markdown, 120-220 words, written in a clear teaching voice

Example shape: [{"title":"...","sub":"...","desc":"...","tags":["..."],"body":"..."}]`;

function extractJsonArray(text: string): RawChapter[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const { title, notes } = await request.json();

  if (!title?.trim() || !notes?.trim()) {
    return NextResponse.json({ error: "Title and notes are required." }, { status: 400 });
  }

  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Subject title: ${title}\n\nLearner's notes:\n${notes}` },
      ],
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Pollinations generate failed", res.status, errorBody);
    return NextResponse.json({ error: "Generation request failed." }, { status: 502 });
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const raw = extractJsonArray(content);

  if (!raw || raw.length === 0) {
    console.error("Pollinations returned unparseable content", content);
    return NextResponse.json({ error: "Could not parse a structured outline from the response." }, { status: 502 });
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
