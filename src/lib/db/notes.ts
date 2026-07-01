import { getSupabaseServerClient } from "@/lib/supabase/server";

export type NoteImage = { url: string; caption: string };

export type Note = {
  id: string;
  user_id: string;
  title: string;
  raw_text: string;
  images: NoteImage[];
  created_at: string;
};

export async function createNote(data: {
  user_id: string;
  title: string;
  raw_text: string;
  images?: NoteImage[];
}): Promise<Note> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: note, error } = await supabase
    .from("notes")
    .insert({ ...data, images: data.images ?? [] })
    .select()
    .single();

  if (error) throw new Error(`createNote: ${error.message}`);
  return note as Note;
}

export async function getNoteById(id: string): Promise<Note | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Note;
}

export async function getNotesByUser(userId: string): Promise<Note[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("notes")
    .select("id, user_id, title, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Note[];
}
