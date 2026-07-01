/**
 * Unified DB adapter — auto-selects backend:
 *   - Local Postgres (doyoubet_test) when Supabase keys are absent (dev without Supabase)
 *   - Supabase Postgres when NEXT_PUBLIC_SUPABASE_URL is set (staging / production)
 */
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { createNote, getNoteById, getNotesByUser } from "./notes";
import { createNoteLocal, getNoteByIdLocal, getNotesByUserLocal } from "./localNotes";

import {
  createExperience,
  markExperienceReady,
  markExperienceError,
  getExperienceByNoteId,
} from "./experiences";
import {
  createExperienceLocal,
  markExperienceReadyLocal,
  markExperienceErrorLocal,
  getExperienceByNoteIdLocal,
} from "./localExperiences";

export type { Note, NoteImage } from "./notes";
export type { Experience, Phase1Scene, Phase2Section, SceneType, Phase2DisplayMode } from "./experiences";

const local = !isSupabaseConfigured;

export const db = {
  notes: {
    create:      local ? createNoteLocal      : createNote,
    getById:     local ? getNoteByIdLocal     : getNoteById,
    getByUser:   local ? getNotesByUserLocal  : getNotesByUser,
  },
  experiences: {
    create:      local ? createExperienceLocal      : createExperience,
    markReady:   local ? markExperienceReadyLocal   : markExperienceReady,
    markError:   local ? markExperienceErrorLocal   : markExperienceError,
    getByNoteId: local ? getExperienceByNoteIdLocal : getExperienceByNoteId,
  },
  isLocal: local,
};
