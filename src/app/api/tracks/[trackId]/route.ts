import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { DEV_USER_ID } from "@/lib/db/localClient";

async function resolveUserId(): Promise<string | null> {
  if (db.isLocal) return DEV_USER_ID;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// GET /api/tracks/[trackId] — track + all its chapters. Pure DB read, no LLM calls.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;

  const userId = await resolveUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const track = await db.tracks.getById(trackId);
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
  if (track.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const chapters = await db.chapters.getByTrack(trackId);
  return NextResponse.json({ track, chapters });
}
