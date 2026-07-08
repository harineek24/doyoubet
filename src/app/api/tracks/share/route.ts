import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { TrackChapter } from "@/types/schema";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { trackId, title, tagline, chapters } = await req.json();
  if (!trackId || !title) return NextResponse.json({ error: "trackId and title required" }, { status: 400 });

  // Strip body and flashcards — recipient regenerates their own
  const stripped = (chapters as TrackChapter[]).map(({ body: _b, flashcards: _f, ...rest }) => rest);

  const { data, error } = await supabase
    .from("shared_tracks")
    .upsert(
      { owner_id: user.id, local_track_id: trackId, title, tagline: tagline ?? "", track_data: stripped },
      { onConflict: "owner_id,local_track_id" }
    )
    .select("share_token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({ shareToken: data.share_token, shareUrl: `${origin}/cs-journey/join/${data.share_token}` });
}
