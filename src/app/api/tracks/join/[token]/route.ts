import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data, error } = await supabase
    .from("shared_tracks")
    .select("title, tagline, track_data, owner_id")
    .eq("share_token", token)
    .single();

  if (error || !data) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  return NextResponse.json({ title: data.title, tagline: data.tagline, chapters: data.track_data, ownerId: data.owner_id });
}
