import { llmChat } from "./client";
import { SYSTEM_CURATOR, promptSegmentAndClassifyChapters } from "./prompts";
import { chunkNotes, numberPieces, formatNumberedPieces, joinPieceRange, repairPieceRanges, estimateTokens, type NumberedPiece } from "./chunker";
import { CallCounter } from "./logger";
import { MAX_CHUNKS_PER_CHAPTER, MAX_TOKENS_FOR_DIRECT_PIPELINE } from "./config";
import { parseJSON, toArray } from "./jsonParse";
import type { Chapter } from "@/lib/db/chapters";

export type ChapterGroup =
  | { kind: "existing"; chapterId: string; content: string }
  | { kind: "new"; title: string; sub: string; summary: string; tags: string[]; content: string };

type Assignment = {
  piece_range: [number, number];
  action: "existing" | "new";
  chapter_id: string | null;
  chapter_title: string | null;
  chapter_sub: string | null;
  chapter_summary: string | null;
  chapter_tags: string[] | null;
};

/** Whether a chapter's accumulated notes are large enough that new content should prefer a fresh chapter. */
export function isChapterAtCapacity(chapter: Chapter): boolean {
  return chunkNotes(chapter.raw_text).length >= MAX_CHUNKS_PER_CHAPTER;
}

type ChapterContext = { id: string; title: string; sub: string; summary: string; tags: string[]; atCap: boolean };

async function classifyOneWindow(
  trackTitle: string,
  existingChapters: ChapterContext[],
  pieces: NumberedPiece[],
  counter: CallCounter,
  windowLabel: string
): Promise<Assignment[]> {
  const label = counter.label(
    `Chapter classification — ${pieces.length} piece(s) against ${existingChapters.length} existing chapter(s) for "${trackTitle}"${windowLabel}`
  );
  const raw = await llmChat(
    promptSegmentAndClassifyChapters(trackTitle, existingChapters, formatNumberedPieces(pieces), pieces.length),
    SYSTEM_CURATOR,
    label
  );
  const assignments = toArray(parseJSON<Assignment[] | Record<string, Assignment[]>>(raw));
  return repairPieceRanges(assignments, pieces.length, () => ({
    piece_range: [0, pieces.length - 1],
    action: "new",
    chapter_id: null,
    chapter_title: "New chapter",
    chapter_sub: "",
    chapter_summary: "",
    chapter_tags: [],
  }));
}

/**
 * Classifies a raw submission into chapter groups in one holistic call —
 * the model sees numbered pieces of the whole submission at once and decides
 * both how many chapters are needed and which pieces belong to each, biased
 * toward the fewest chapters the content actually supports. Falls back to
 * windowed processing (chunkNotes) only for a submission too large for one
 * call — expected to be rare.
 */
export async function classifyIntoChapters(
  trackTitle: string,
  existingChapters: Chapter[],
  rawText: string,
  counter: CallCounter
): Promise<ChapterGroup[]> {
  const baseContext: ChapterContext[] = existingChapters.map((c) => ({
    id: c.id,
    title: c.title,
    sub: c.sub,
    summary: c.summary,
    tags: c.tags,
    atCap: isChapterAtCapacity(c),
  }));

  const textChunks = estimateTokens(rawText) <= MAX_TOKENS_FOR_DIRECT_PIPELINE ? [rawText] : chunkNotes(rawText);

  // In-memory proposals for new chapters created by earlier windows in this
  // same submission, so a later window can merge into them by title match
  // instead of always treating them as unrelated new chapters.
  const proposedNew = new Map<string, { sub: string; summary: string; tags: string[] }>();
  const existingGroups = new Map<string, string[]>();
  const newGroups = new Map<string, { sub: string; summary: string; tags: string[]; contents: string[] }>();

  for (let w = 0; w < textChunks.length; w++) {
    const pieces = numberPieces(textChunks[w]);
    if (pieces.length === 0) continue;

    const windowContext: ChapterContext[] = [
      ...baseContext,
      ...[...proposedNew.entries()].map(([title, v]) => ({
        id: `__pending__${title}`,
        title,
        sub: v.sub,
        summary: v.summary,
        tags: v.tags,
        atCap: false,
      })),
    ];

    const windowLabel = textChunks.length > 1 ? ` (window ${w + 1}/${textChunks.length})` : "";
    const assignments = await classifyOneWindow(trackTitle, windowContext, pieces, counter, windowLabel);

    for (const a of assignments) {
      const content = joinPieceRange(pieces, a.piece_range[0], a.piece_range[1]);
      if (!content) continue;

      if (a.action === "existing" && a.chapter_id?.startsWith("__pending__")) {
        const title = a.chapter_id.replace("__pending__", "");
        const entry = newGroups.get(title);
        if (entry) entry.contents.push(content);
        continue;
      }
      if (a.action === "existing" && a.chapter_id) {
        const list = existingGroups.get(a.chapter_id) ?? [];
        list.push(content);
        existingGroups.set(a.chapter_id, list);
      } else {
        const title = a.chapter_title || "Untitled chapter";
        const entry = newGroups.get(title) ?? { sub: a.chapter_sub ?? "", summary: a.chapter_summary ?? "", tags: a.chapter_tags ?? [], contents: [] };
        entry.contents.push(content);
        newGroups.set(title, entry);
        proposedNew.set(title, { sub: entry.sub, summary: entry.summary, tags: entry.tags });
      }
    }
  }

  const groups: ChapterGroup[] = [];
  for (const [chapterId, contents] of existingGroups) {
    groups.push({ kind: "existing", chapterId, content: contents.join("\n\n") });
  }
  for (const [title, entry] of newGroups) {
    groups.push({ kind: "new", title, sub: entry.sub, summary: entry.summary, tags: entry.tags, content: entry.contents.join("\n\n") });
  }
  return groups;
}
