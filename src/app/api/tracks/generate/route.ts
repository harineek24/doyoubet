import { NextRequest, NextResponse } from "next/server";
import { chapter } from "@/lib/store/tracks";
import type { TrackChapter } from "@/types/schema";

interface RawChapter {
  title: string;
  sub: string;
  desc: string;
  tags: string[];
}

// Split raw notes roughly evenly across n chapters by paragraph boundaries
function splitNotes(notes: string, n: number): string[] {
  const paragraphs = notes.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return Array(n).fill(notes);
  const chunkSize = Math.ceil(paragraphs.length / n);
  const chunks: string[] = [];
  for (let i = 0; i < n; i++) {
    chunks.push(paragraphs.slice(i * chunkSize, (i + 1) * chunkSize).join("\n\n") || paragraphs[0]);
  }
  return chunks;
}

// Keep output small — Pollinations free tier caps at ~300 tokens regardless of max_tokens.
// Body content comes from the user's own notes; we only generate the lightweight structure here.
const SYSTEM_PROMPT = `You turn a learner's raw notes into a structured mini-course outline.
Your entire response must be ONLY a valid JSON array. Start with [ and end with ]. No prose, no code fences.
Produce 4 to 6 chapters. Each element has exactly these fields:
"title" (5 words max), "sub" (4 words max), "desc" (one sentence), "tags" (2-3 strings).
Example: [{"title":"Intro","sub":"Why it matters","desc":"Overview of X.","tags":["basics"]}]
Output ONLY the JSON array.`;

// Handles JSON wrapped in markdown fences, leading/trailing prose, or truncation
function extractJsonArray(text: string): RawChapter[] | null {
  // First try the full text directly
  try {
    const direct = JSON.parse(text.trim());
    if (Array.isArray(direct)) return direct;
  } catch { /* fall through */ }

  // Find first [ and matching last ] and try that slice
  const start = text.indexOf("[");
  const end   = text.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }
  }

  // Strip markdown code fences (```json ... ```) and retry
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      const parsed = JSON.parse(fenced[1].trim());
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }
  }

  return null;
}

// Safely extract content from either OpenAI-format or Pollinations raw format
function extractContent(data: unknown): string {
  if (typeof data === "string") return data;
  if (typeof data !== "object" || data === null) return "";
  const d = data as Record<string, unknown>;

  // OpenAI choices format
  const choices = d.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const msg = (choices[0] as Record<string, unknown>)?.message;
    if (msg && typeof (msg as Record<string, unknown>).content === "string") {
      return (msg as Record<string, unknown>).content as string;
    }
    // Some variants put content directly on the choice object
    if (typeof (choices[0] as Record<string, unknown>).text === "string") {
      return (choices[0] as Record<string, unknown>).text as string;
    }
  }

  // Simpler Pollinations formats
  if (typeof d.text === "string") return d.text;
  if (typeof d.response === "string") return d.response;
  if (typeof d.generated_text === "string") return d.generated_text;

  return JSON.stringify(data); // last resort: stringify the whole thing and try to find JSON in it
}

export async function POST(request: NextRequest) {
  const { title, notes } = await request.json();

  if (!title?.trim() || !notes?.trim()) {
    return NextResponse.json({ error: "Title and notes are required." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        stream: false,
        max_tokens: 4096,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Subject: ${title}\n\nNotes:\n${notes}` },
        ],
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Pollinations fetch error", msg);
    return NextResponse.json({ error: `Could not reach the generation API: ${msg}` }, { status: 502 });
  }

  const rawBody = await res.text();

  if (!res.ok) {
    console.error("Pollinations HTTP error", res.status, rawBody);
    return NextResponse.json(
      { error: `Generation API returned ${res.status}. ${rawBody.slice(0, 200)}` },
      { status: 502 }
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(rawBody);
  } catch {
    // If the body itself is parseable as a JSON array, use it directly
    const direct = extractJsonArray(rawBody);
    if (direct && direct.length > 0) {
      data = { choices: [{ message: { content: rawBody } }] };
    } else {
      console.error("Pollinations returned non-JSON body", rawBody.slice(0, 300));
      return NextResponse.json(
        { error: `Unexpected response format from generation API. Preview: ${rawBody.slice(0, 200)}` },
        { status: 502 }
      );
    }
  }

  const content = extractContent(data);
  const raw = extractJsonArray(content);

  if (!raw || raw.length === 0) {
    console.error("Could not extract JSON array. Content preview:", content.slice(0, 400));
    return NextResponse.json(
      { error: `Could not parse a structured outline. API returned: "${content.slice(0, 300)}"` },
      { status: 502 }
    );
  }

  const trackId = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Split the user's raw notes into chunks — one per chapter — so each lesson
  // reader has real content even though we didn't ask the AI to generate body text.
  const noteChunks = splitNotes(notes, raw.length);

  const chapters: TrackChapter[] = raw.map((c, i) =>
    chapter(
      trackId,
      i + 1,
      c.title ?? `Chapter ${i + 1}`,
      c.sub ?? "",
      c.desc ?? "",
      Array.isArray(c.tags) ? c.tags : [],
      noteChunks[i] ?? ""
    )
  );

  return NextResponse.json({ trackId, chapters });
}
