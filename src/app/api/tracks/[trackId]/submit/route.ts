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

// POST /api/tracks/[trackId]/submit — add more notes to an existing track.
// Classifies against the track's existing chapters (append vs new chapter)
// and regenerates every chapter touched.
export async function POST(req: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;

  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const track = await db.tracks.getById(trackId);
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
  if (track.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { raw_text, images } = body as { raw_text: string; images?: Array<{ url: string; caption: string }> };

  if (!raw_text?.trim()) return NextResponse.json({ error: "raw_text is required" }, { status: 400 });

  const available = await llmAvailable();
  if (!available) {
    return NextResponse.json(
      { error: "No LLM backend available. Set GROQ_API_KEY or start Ollama with: ollama serve" },
      { status: 503 }
    );
  }

  try {
    const result = await processSubmission(trackId, raw_text.trim(), images ?? []);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Submission failed", detail: msg }, { status: 500 });
  }
}
