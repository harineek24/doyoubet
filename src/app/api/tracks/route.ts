import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { DEV_USER_ID } from "@/lib/db/localClient";
import { llmAvailable } from "@/lib/ollama/client";
import { processSubmission } from "@/lib/ollama/chapterOrchestrator";

async function resolveUserId(): Promise<string | null> {
  if (db.isLocal) return DEV_USER_ID;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// GET /api/tracks — list the current user's AI-generated tracks (pure DB read).
export async function GET() {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracks = await db.tracks.getByUser(userId);
  const withCounts = await Promise.all(
    tracks.map(async (t) => ({ ...t, chapter_count: (await db.chapters.getByTrack(t.id)).length }))
  );
  return NextResponse.json({ tracks: withCounts });
}

// POST /api/tracks — create a new track and process its first note submission.
export async function POST(req: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, raw_text, images } = body as {
    title?: string;
    raw_text: string;
    images?: Array<{ url: string; caption: string }>;
  };

  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!raw_text?.trim()) return NextResponse.json({ error: "raw_text is required" }, { status: 400 });

  const available = await llmAvailable();
  if (!available) {
    return NextResponse.json(
      { error: "No LLM backend available. Set GROQ_API_KEY or start Ollama with: ollama serve" },
      { status: 503 }
    );
  }

  const track = await db.tracks.create({ user_id: userId, title: title.trim() });

  try {
    const result = await processSubmission(track.id, raw_text.trim(), images ?? []);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Track creation failed", detail: msg, track_id: track.id }, { status: 500 });
  }
}
