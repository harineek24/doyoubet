import { llmChat as ollamaChat } from "./client";
import {
  SYSTEM_CURATOR,
  promptExtractConcepts,
  promptMergeConcepts,
  promptSequencePhase1,
  promptWriteScenes,
  promptPhase2Sections,
} from "./prompts";
import { chunkNotes, splitIntoSections } from "./chunker";
import type { Phase1Scene, Phase2Section } from "@/lib/db/experiences";

function parseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Direct parse first
  try { return JSON.parse(cleaned) as T; } catch {}

  // Bracket-matching extraction — handles trailing text after the JSON
  for (const [open, close] of [["[", "]"], ["{", "}"]]) {
    const start = cleaned.indexOf(open);
    if (start === -1) continue;
    let depth = 0, inStr = false, escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inStr) { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(cleaned.slice(start, i + 1)) as T; } catch {}
          break;
        }
      }
    }
  }

  throw new Error(`Model returned invalid JSON. First 300 chars: ${raw.slice(0, 300)}`);
}

function toArray<T>(val: T[] | Record<string, T[]>): T[] {
  if (Array.isArray(val)) return val;
  const first = Object.values(val as Record<string, T[]>).find(Array.isArray);
  return first ?? [];
}

async function extractConcepts(chunk: string): Promise<string[]> {
  const raw = await ollamaChat(promptExtractConcepts(chunk), SYSTEM_CURATOR);
  return toArray(parseJSON<string[] | Record<string, string[]>>(raw));
}

export async function runPhase1Pipeline(
  rawText: string,
  subject: string
): Promise<Phase1Scene[]> {
  const chunks = chunkNotes(rawText);

  // Step 1: extract concepts from each chunk (parallel for multi-chunk)
  const conceptsPerChunk = await Promise.all(chunks.map(extractConcepts));
  const allConcepts = conceptsPerChunk.flat();

  // Step 2: merge + deduplicate if multiple chunks
  let mergedConcepts: string[];
  if (chunks.length === 1) {
    mergedConcepts = allConcepts;
  } else {
    const mergedRaw = await ollamaChat(
      promptMergeConcepts(allConcepts),
      SYSTEM_CURATOR
    );
    mergedConcepts = toArray(parseJSON<string[] | Record<string, string[]>>(mergedRaw));
  }

  // Step 3: curate + sequence into 10-12 scenes
  const sequencedRaw = await ollamaChat(
    promptSequencePhase1(mergedConcepts, subject),
    SYSTEM_CURATOR
  );
  const sequenced = toArray(
    parseJSON<Array<{ type: string; concept: string; order: number }> | Record<string, Array<{ type: string; concept: string; order: number }>>>(sequencedRaw)
  );

  // Step 4: write full scene scripts
  const scenesRaw = await ollamaChat(
    promptWriteScenes(sequenced, subject),
    SYSTEM_CURATOR
  );
  const scenesRaw2 = parseJSON<Phase1Scene[] | { scenes: Phase1Scene[] }>(scenesRaw);
  const scenes: Phase1Scene[] = Array.isArray(scenesRaw2)
    ? scenesRaw2
    : (scenesRaw2 as { scenes: Phase1Scene[] }).scenes ?? [];

  return scenes.sort((a, b) => a.order - b.order);
}

export async function runPhase2Pipeline(
  rawText: string,
  sections: Array<{ index: number; content: string; preview: string }>
): Promise<Phase2Section[]> {
  const classified = await ollamaChat(
    promptPhase2Sections(sections.map((s) => ({ index: s.index, preview: s.preview }))),
    SYSTEM_CURATOR
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

  const [phase1, phase2] = await Promise.all([
    runPhase1Pipeline(rawText, subject),
    runPhase2Pipeline(rawText, sections),
  ]);

  return { phase1, phase2 };
}
