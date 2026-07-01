import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Phase1Scene, Phase2DisplayMode } from "./experiences";

export type NoteFragment = {
  submitted_at: string;
  raw_text: string;
  images: Array<{ url: string; caption: string }>;
};

// Phase 2 section for a Chapter — unlike the notes/experiences Phase2Section,
// this carries both the user's verbatim text and an AI-elaborated version,
// so the compare view can show them side by side.
export type ChapterPhase2Section = {
  order: number;
  display_mode: Phase2DisplayMode;
  pull_quote: string | null;
  original_content: string;
  enhanced_content: string;
};

export type Chapter = {
  id: string;
  track_id: string;
  position: number;
  title: string;
  sub: string;
  summary: string;
  tags: string[];
  accent: string;
  g1: string;
  g2: string;
  g3: string;
  raw_text: string;
  note_fragments: NoteFragment[];
  phase1_scenes: Phase1Scene[] | null;
  phase2_sections: ChapterPhase2Section[] | null;
  status: "processing" | "ready" | "error";
  error_msg: string | null;
  created_at: string;
  updated_at: string;
};

export type NewChapterPalette = { accent: string; g1: string; g2: string; g3: string };

export async function createChapter(data: {
  track_id: string;
  position: number;
  title: string;
  sub?: string;
  summary?: string;
  tags?: string[];
  palette: NewChapterPalette;
  raw_text: string;
  fragment: NoteFragment;
}): Promise<Chapter> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: chapter, error } = await supabase
    .from("chapters")
    .insert({
      track_id: data.track_id,
      position: data.position,
      title: data.title,
      sub: data.sub ?? "",
      summary: data.summary ?? "",
      tags: data.tags ?? [],
      accent: data.palette.accent,
      g1: data.palette.g1,
      g2: data.palette.g2,
      g3: data.palette.g3,
      raw_text: data.raw_text,
      note_fragments: [data.fragment],
      status: "processing",
    })
    .select()
    .single();

  if (error) throw new Error(`createChapter: ${error.message}`);
  return chapter as Chapter;
}

export async function getChapterById(id: string): Promise<Chapter | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from("chapters").select("*").eq("id", id).single();
  if (error) return null;
  return data as Chapter;
}

export async function getChaptersByTrack(trackId: string): Promise<Chapter[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("track_id", trackId)
    .order("position", { ascending: true });

  if (error) return [];
  return (data ?? []) as Chapter[];
}

export async function appendChapterFragment(
  id: string,
  additionalRawText: string,
  fragment: NoteFragment
): Promise<Chapter> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const existing = await getChapterById(id);
  if (!existing) throw new Error(`appendChapterFragment: chapter ${id} not found`);

  const raw_text = `${existing.raw_text}\n\n${additionalRawText}`.trim();
  const note_fragments = [...existing.note_fragments, fragment];

  const { data, error } = await supabase
    .from("chapters")
    .update({ raw_text, note_fragments, status: "processing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`appendChapterFragment: ${error.message}`);
  return data as Chapter;
}

export async function markChapterReady(
  id: string,
  phase1_scenes: Phase1Scene[],
  phase2_sections: ChapterPhase2Section[]
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase
    .from("chapters")
    .update({
      status: "ready",
      phase1_scenes,
      phase2_sections,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`markChapterReady: ${error.message}`);
}

export async function markChapterError(id: string, msg: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("chapters")
    .update({ status: "error", error_msg: msg, updated_at: new Date().toISOString() })
    .eq("id", id);
}
