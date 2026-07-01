import { llmChat } from "./client";
import { SYSTEM_CURATOR, promptPhase2Segment, promptExpandByIndex } from "./prompts";
import {
  chunkNotes,
  numberPieces,
  formatNumberedPieces,
  joinPieceRange,
  repairPieceRanges,
  estimateTokens,
} from "./chunker";
import { MAX_TOKENS_FOR_DIRECT_PIPELINE } from "./config";
import { CallCounter } from "./logger";
import { parseJSON, toArray } from "./jsonParse";
import type { ChapterPhase2Section } from "@/lib/db/chapters";

type SegmentDecision = {
  piece_range: [number, number];
  display_mode: ChapterPhase2Section["display_mode"];
  pull_quote: string | null;
  order: number;
};

type SlicedSection = SegmentDecision & { original_content: string };

// Groups sections into ~1800-token batches so a long chapter's expand step
// splits into multiple parallel calls instead of one oversized prompt.
function batchSections(sections: SlicedSection[]): SlicedSection[][] {
  const batches: SlicedSection[][] = [];
  let current: SlicedSection[] = [];
  let currentTokens = 0;

  for (const section of sections) {
    const tokens = estimateTokens(section.original_content);
    if (currentTokens + tokens > 1800 && current.length > 0) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(section);
    currentTokens += tokens;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function expandBatch(
  batch: SlicedSection[],
  indexOf: Map<SlicedSection, number>,
  counter: CallCounter,
  batchLabel: string
): Promise<Map<number, string>> {
  const label = counter.label(`Phase2 expand — ${batchLabel} (${batch.length} section(s))`);
  const raw = await llmChat(
    promptExpandByIndex(batch.map((s) => ({ index: indexOf.get(s)!, display_mode: s.display_mode, content: s.original_content }))),
    SYSTEM_CURATOR,
    label
  );
  const results = toArray(parseJSON<Array<{ index: number; enhanced_content: string }> | Record<string, Array<{ index: number; enhanced_content: string }>>>(raw));
  const map = new Map<number, string>();
  for (const r of results) map.set(r.index, r.enhanced_content);
  return map;
}

async function segmentOneWindow(text: string, counter: CallCounter, windowLabel: string): Promise<SlicedSection[]> {
  const pieces = numberPieces(text);
  if (pieces.length === 0) return [];

  const label = counter.label(`Phase2 segment — ${pieces.length} piece(s)${windowLabel}`);
  const raw = await llmChat(promptPhase2Segment(formatNumberedPieces(pieces), pieces.length), SYSTEM_CURATOR, label);
  const parsed = toArray(parseJSON<SegmentDecision[] | Record<string, SegmentDecision[]>>(raw));
  const decisions = repairPieceRanges(parsed, pieces.length, (): SegmentDecision => ({
    piece_range: [0, pieces.length - 1],
    display_mode: "prose",
    pull_quote: null,
    order: 1,
  }));

  return decisions.map((d) => ({ ...d, original_content: joinPieceRange(pieces, d.piece_range[0], d.piece_range[1]) }));
}

async function runOneWindow(text: string, counter: CallCounter, windowLabel: string): Promise<ChapterPhase2Section[]> {
  const sliced = await segmentOneWindow(text, counter, windowLabel);
  if (sliced.length === 0) return [];

  // Code is never rewritten — send only non-code sections to the expand step.
  const expandable = sliced.filter((s) => s.display_mode !== "code");
  const indexOf = new Map<SlicedSection, number>(sliced.map((s, i) => [s, i]));
  const batches = batchSections(expandable);
  const expandedMaps = await Promise.all(
    batches.map((batch, i) => expandBatch(batch, indexOf, counter, `batch ${i + 1}/${batches.length}${windowLabel}`))
  );
  const enhanced = new Map<number, string>();
  for (const m of expandedMaps) for (const [k, v] of m) enhanced.set(k, v);

  return sliced.map((s, i) => {
    const original = s.original_content;
    if (s.display_mode === "code") {
      return { order: s.order, display_mode: s.display_mode, pull_quote: s.pull_quote, original_content: original, enhanced_content: original };
    }
    const expandedText = enhanced.get(i);
    // Never let "enhanced" silently lose information — if the model's
    // expansion is missing or suspiciously shorter than the original (a
    // sign it summarized or gave up partway), fall back to the verbatim
    // original rather than show something that dropped content.
    const looksTruncated = !expandedText || expandedText.length < original.length * 0.6;
    return {
      order: s.order,
      display_mode: s.display_mode,
      pull_quote: s.pull_quote,
      original_content: original,
      enhanced_content: looksTruncated ? original : expandedText,
    };
  });
}

/**
 * Produces Phase2 sections (display mode + elaborated prose) for a chapter's
 * full accumulated notes. Segmentation/classification (structure only) and
 * content expansion are deliberately separate calls — combining them risks
 * the model losing sync between which generated text belongs to which
 * section. Falls back to token-budget windows only for a chapter large
 * enough to risk one call's output budget — expected to be rare.
 */
export async function runChapterPhase2Pipeline(
  rawText: string,
  counter: CallCounter = new CallCounter()
): Promise<ChapterPhase2Section[]> {
  if (estimateTokens(rawText) <= MAX_TOKENS_FOR_DIRECT_PIPELINE) {
    const sections = await runOneWindow(rawText, counter, "");
    return sections.sort((a, b) => a.order - b.order);
  }

  const chunks = chunkNotes(rawText);
  const allSections: ChapterPhase2Section[] = [];
  for (let w = 0; w < chunks.length; w++) {
    const sections = await runOneWindow(chunks[w], counter, ` (window ${w + 1}/${chunks.length})`);
    allSections.push(...sections);
  }
  return allSections.map((s, i) => ({ ...s, order: i + 1 }));
}
