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

import {
  createUserTrack,
  getUserTrackById,
  getUserTracksByUser,
  updateUserTrackAccent,
} from "./tracks";
import {
  createUserTrackLocal,
  getUserTrackByIdLocal,
  getUserTracksByUserLocal,
  updateUserTrackAccentLocal,
} from "./tracksLocal";

import {
  createChapter,
  getChapterById,
  getChaptersByTrack,
  appendChapterFragment,
  markChapterReady,
  markChapterError,
} from "./chapters";
import {
  createChapterLocal,
  getChapterByIdLocal,
  getChaptersByTrackLocal,
  appendChapterFragmentLocal,
  markChapterReadyLocal,
  markChapterErrorLocal,
} from "./chaptersLocal";

export type { Note, NoteImage } from "./notes";
export type { Experience, Phase1Scene, Phase2Section, SceneType, Phase2DisplayMode } from "./experiences";
export type { UserTrack } from "./tracks";
export type { Chapter, ChapterPhase2Section, NoteFragment, NewChapterPalette } from "./chapters";

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
  tracks: {
    create:       local ? createUserTrackLocal       : createUserTrack,
    getById:      local ? getUserTrackByIdLocal      : getUserTrackById,
    getByUser:    local ? getUserTracksByUserLocal   : getUserTracksByUser,
    updateAccent: local ? updateUserTrackAccentLocal : updateUserTrackAccent,
  },
  chapters: {
    create:          local ? createChapterLocal          : createChapter,
    getById:         local ? getChapterByIdLocal          : getChapterById,
    getByTrack:      local ? getChaptersByTrackLocal      : getChaptersByTrack,
    appendFragment:  local ? appendChapterFragmentLocal   : appendChapterFragment,
    markReady:       local ? markChapterReadyLocal        : markChapterReady,
    markError:       local ? markChapterErrorLocal        : markChapterError,
  },
  isLocal: local,
};
