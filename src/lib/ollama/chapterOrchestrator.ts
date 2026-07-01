import { db } from "@/lib/db";
import { paletteForIndex } from "@/lib/palettes";
import { classifyIntoChapters } from "./chapterClassifier";
import { runPhase1Pipeline } from "./pipeline";
import { runChapterPhase2Pipeline } from "./chapterPipeline";
import { CallCounter } from "./logger";
import type { NoteFragment } from "@/lib/db/chapters";

export type ChapterSubmissionOutcome = {
  chapter_id: string;
  title: string;
  action: "created" | "updated";
  status: "ready" | "error";
  phase1_count?: number;
  phase2_count?: number;
  error?: string;
};

export type SubmissionResult = {
  track_id: string;
  chapters_affected: ChapterSubmissionOutcome[];
  total_llm_calls: number;
};

/**
 * Classifies incoming raw notes into existing/new chapters for a track, then
 * regenerates Phase1 flashcards + Phase2 expanded notes for every chapter
 * touched — from that chapter's full accumulated history, not just the new
 * fragment. Chapters untouched by this submission are left untouched (cached).
 */
export async function processSubmission(
  trackId: string,
  rawText: string,
  images: Array<{ url: string; caption: string }> = []
): Promise<SubmissionResult> {
  const track = await db.tracks.getById(trackId);
  if (!track) throw new Error(`Track ${trackId} not found`);

  const existingChapters = await db.chapters.getByTrack(trackId);
  const counter = new CallCounter();
  const submittedAt = new Date().toISOString();

  console.log(`=== Submission for track "${track.title}" (${existingChapters.length} existing chapter(s)) ===`);

  const groups = await classifyIntoChapters(track.title, existingChapters, rawText, counter);

  const results: ChapterSubmissionOutcome[] = [];
  let newChapterCount = 0;

  for (const group of groups) {
    const fragment: NoteFragment = { submitted_at: submittedAt, raw_text: group.content, images };
    let chapterId: string;
    let chapterTitle: string;
    let action: "created" | "updated";

    if (group.kind === "existing") {
      const updated = await db.chapters.appendFragment(group.chapterId, group.content, fragment);
      chapterId = updated.id;
      chapterTitle = updated.title;
      action = "updated";
    } else {
      const position = existingChapters.length + newChapterCount;
      newChapterCount += 1;
      const created = await db.chapters.create({
        track_id: trackId,
        position,
        title: group.title,
        sub: group.sub,
        summary: group.summary,
        tags: group.tags,
        palette: paletteForIndex(position),
        raw_text: group.content,
        fragment,
      });
      chapterId = created.id;
      chapterTitle = created.title;
      action = "created";
    }

    try {
      const chapter = await db.chapters.getById(chapterId);
      if (!chapter) throw new Error("Chapter disappeared mid-pipeline");

      const [phase1, phase2] = await Promise.all([
        runPhase1Pipeline(chapter.raw_text, `${track.title} — ${chapter.title}`, counter),
        runChapterPhase2Pipeline(chapter.raw_text, counter),
      ]);

      await db.chapters.markReady(chapterId, phase1, phase2);
      results.push({
        chapter_id: chapterId,
        title: chapterTitle,
        action,
        status: "ready",
        phase1_count: phase1.length,
        phase2_count: phase2.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.chapters.markError(chapterId, msg);
      results.push({ chapter_id: chapterId, title: chapterTitle, action, status: "error", error: msg });
    }
  }

  console.log(`=== Submission complete for "${track.title}" — ${counter.count} LLM calls, ${results.length} chapter(s) affected ===`);

  return { track_id: trackId, chapters_affected: results, total_llm_calls: counter.count };
}
