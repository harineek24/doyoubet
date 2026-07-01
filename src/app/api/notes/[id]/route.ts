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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const note = await db.notes.getById(id);
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (note.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const experience = await db.experiences.getByNoteId(id);
  return NextResponse.json({ note, experience });
}
