import { getSupabaseServerClient } from "@/lib/supabase/server";

export type SceneType = "hook" | "concept" | "analogy" | "reveal" | "callout" | "recap";

export type Phase1Scene = {
  order: number;
  type: SceneType;
  headline: string;
  body: string | null;
  code: string | null;
};

export type Phase2DisplayMode =
  | "heading"    // word kinetic — words slide up from below
  | "decode"     // text scramble that resolves left-to-right
  | "prose"      // masked curtain reveal per paragraph
  | "callout"    // full-bleed clip-path wipe
  | "code"       // line-by-line terminal reveal
  | "list"       // stagger translateX (auto-upgrades to bento/timeline)
  | "bento"      // css grid cards
  | "stat"       // animated counter + ghost number bg
  | "timeline"   // SVG path draw + nodes
  | "horizontal" // horizontal scroll-snap panels
  | "stacked"    // card deck lift
  | "image";     // fade + translateY

export type Phase2Section = {
  original_index: number;
  display_mode: Phase2DisplayMode;
  pull_quote: string | null;
  order: number;
  content: string;
};

export type Experience = {
  id: string;
  note_id: string;
  status: "processing" | "ready" | "error";
  phase1_script: Phase1Scene[] | null;
  phase2_sections: Phase2Section[] | null;
  error_msg: string | null;
  created_at: string;
  completed_at: string | null;
};

export async function createExperience(noteId: string): Promise<Experience> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("experiences")
    .insert({ note_id: noteId, status: "processing" })
    .select()
    .single();

  if (error) throw new Error(`createExperience: ${error.message}`);
  return data as Experience;
}

export async function markExperienceReady(
  id: string,
  phase1_script: Phase1Scene[],
  phase2_sections: Phase2Section[]
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase
    .from("experiences")
    .update({
      status: "ready",
      phase1_script,
      phase2_sections,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`markExperienceReady: ${error.message}`);
}

export async function markExperienceError(id: string, msg: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;

  await supabase
    .from("experiences")
    .update({ status: "error", error_msg: msg })
    .eq("id", id);
}

export async function getExperienceByNoteId(noteId: string): Promise<Experience | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("note_id", noteId)
    .single();

  if (error) return null;
  return data as Experience;
}
