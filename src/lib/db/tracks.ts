import { getSupabaseServerClient } from "@/lib/supabase/server";

// AI-generated user tracks (Postgres-backed). Distinct from the hardcoded
// `Track`/`TrackChapter` in src/types/schema.ts, which serves the builtin
// (non-AI) tracks and never touches the database.
export type UserTrack = {
  id: string;
  user_id: string;
  title: string;
  tagline: string;
  accent_color: string;
  created_at: string;
  updated_at: string;
};

export async function createUserTrack(data: {
  user_id: string;
  title: string;
  tagline?: string;
}): Promise<UserTrack> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: track, error } = await supabase
    .from("tracks")
    .insert({
      user_id: data.user_id,
      title: data.title,
      tagline: data.tagline ?? "",
    })
    .select()
    .single();

  if (error) throw new Error(`createUserTrack: ${error.message}`);
  return track as UserTrack;
}

export async function getUserTrackById(id: string): Promise<UserTrack | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("tracks").select("*").eq("id", id).single();
  if (error) return null;
  return data as UserTrack;
}

export async function getUserTracksByUser(userId: string): Promise<UserTrack[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as UserTrack[];
}

export async function updateUserTrackAccent(id: string, accentColor: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("tracks")
    .update({ accent_color: accentColor, updated_at: new Date().toISOString() })
    .eq("id", id);
}
