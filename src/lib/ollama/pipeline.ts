import { llmChat as ollamaChat } from "./client";
import {
  SYSTEM_CURATOR,
  promptExtractConcepts,
  promptMergeConcepts,
  promptSequencePhase1,
  promptWriteScenes,
  promptPhase2Sections,
  promptGenerateFlashcardsDirect,
} from "./prompts";
import { chunkNotes, splitIntoSections, estimateTokens } from "./chunker";
import { MAX_TOKENS_FOR_DIRECT_PIPELINE } from "./config";
import { CallCounter } from "./logger";
import { parseJSON, toArray } from "./jsonParse";
import type { Phase1Scene, Phase2Section } from "@/lib/db/experiences";

function parseScenes(raw: string): Phase1Scene[] {
  const parsed = parseJSON<Phase1Scene[] | { scenes: Phase1Scene[] }>(raw);
  const scenes: Phase1Scene[] = Array.isArray(parsed) ? parsed : (parsed as { scenes: Phase1Scene[] }).scenes ?? [];
  return scenes.sort((a, b) => a.order - b.order);
}

async function extractConcepts(
  chunk: string,
  counter: CallCounter,
  chunkIdx: number,
  totalChunks: number,
  contextLabel: string
): Promise<string[]> {
  const label = counter.label(`Phase1 concept extraction — chunk ${chunkIdx + 1}/${totalChunks} (${contextLabel})`);
  const raw = await ollamaChat(promptExtractConcepts(chunk), SYSTEM_CURATOR, label);
  return toArray(parseJSON<string[] | Record<string, string[]>>(raw));
}

export async function runPhase1Pipeline(
  rawText: string,
  subject: string,
  counter: CallCounter = new CallCounter()
): Promise<Phase1Scene[]> {
  const contextLabel = `"${subject}"`;

  // Fast path: for anything that fits comfortably in one call (the common
  // case), skip the extract -> merge -> sequence -> write staging entirely
  // and go straight from raw text to final flashcard scenes. The decomposed
  // pipeline below is a dormant fallback for chapters that grow very large.
  if (estimateTokens(rawText) <= MAX_TOKENS_FOR_DIRECT_PIPELINE) {
    const label = counter.label(`Phase1 flashcards (direct) — ${contextLabel}`);
    const raw = await ollamaChat(promptGenerateFlashcardsDirect(rawText, subject), SYSTEM_CURATOR, label);
    return parseScenes(raw);
  }

  const chunks = chunkNotes(rawText);

  // Step 1: extract concepts from each chunk (parallel for multi-chunk)
  const conceptsPerChunk = await Promise.all(
    chunks.map((chunk, i) => extractConcepts(chunk, counter, i, chunks.length, contextLabel))
  );
  const allConcepts = conceptsPerChunk.flat();

  // Step 2: merge + deduplicate if multiple chunks
  let mergedConcepts: string[];
  if (chunks.length === 1) {
    mergedConcepts = allConcepts;
  } else {
    const mergeLabel = counter.label(`Phase1 concept merge — ${allConcepts.length} concepts across ${chunks.length} chunks (${contextLabel})`);
    const mergedRaw = await ollamaChat(promptMergeConcepts(allConcepts), SYSTEM_CURATOR, mergeLabel);
    mergedConcepts = toArray(parseJSON<string[] | Record<string, string[]>>(mergedRaw));
  }

  // Step 3: curate + sequence into 10-12 scenes
  const sequenceLabel = counter.label(`Phase1 scene sequencing — ${mergedConcepts.length} concepts (${contextLabel})`);
  const sequencedRaw = await ollamaChat(promptSequencePhase1(mergedConcepts, subject), SYSTEM_CURATOR, sequenceLabel);
  const sequenced = toArray(
    parseJSON<Array<{ type: string; concept: string; order: number }> | Record<string, Array<{ type: string; concept: string; order: number }>>>(sequencedRaw)
  );

  // Step 4: write full scene scripts
  const writeLabel = counter.label(`Phase1 scene writing — ${sequenced.length} scenes (${contextLabel})`);
  const scenesRaw = await ollamaChat(promptWriteScenes(sequenced, subject), SYSTEM_CURATOR, writeLabel);
  return parseScenes(scenesRaw);
}

export async function runPhase2Pipeline(
  rawText: string,
  sections: Array<{ index: number; content: string; preview: string }>,
  counter: CallCounter = new CallCounter()
): Promise<Phase2Section[]> {
  const classifyLabel = counter.label(`Phase2 classify + reorder — ${sections.length} sections`);
  const classified = await ollamaChat(
    promptPhase2Sections(sections.map((s) => ({ index: s.index, preview: s.preview }))),
    SYSTEM_CURATOR,
    classifyLabel
  );

  type OrderItem = {
    original_index: number;
    display_mode: Phase2Section["display_mode"];
    pull_quote: string | null;
    order: number;
  };
  const ordering = toArray(parseJSON<OrderItem[] | Record<string, OrderItem[]>>(classified));

  // Attach the original content back
  return ordering
    .map((item) => {
      const section = sections.find((s) => s.index === item.original_index);
      return {
        ...item,
        content: section?.content ?? "",
      } as Phase2Section;
    })
    .sort((a, b) => a.order - b.order);
}

export async function runFullPipeline(
  rawText: string,
  title: string
): Promise<{ phase1: Phase1Scene[]; phase2: Phase2Section[] }> {
  const subject = title.trim() || "these notes";
  const sections = splitIntoSections(rawText);
  const counter = new CallCounter();

  console.log(`=== Starting AI pipeline for "${subject}" ===`);
  const [phase1, phase2] = await Promise.all([
    runPhase1Pipeline(rawText, subject, counter),
    runPhase2Pipeline(rawText, sections, counter),
  ]);
  console.log(`=== Pipeline complete for "${subject}" — ${counter.count} LLM calls total ===`);

  return { phase1, phase2 };
}
