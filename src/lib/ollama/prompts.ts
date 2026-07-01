export const SYSTEM_CURATOR = `You are an expert learning designer who transforms raw study notes into structured, engaging learning experiences. Always respond with valid JSON only — no prose, no markdown fences, no explanation.`;

export function promptExtractConcepts(chunk: string): string {
  return `Extract the key concepts from these study notes. Return a JSON array of strings — each a clear, standalone concept statement (1 sentence max). Maximum 15 items.

Notes:
${chunk}

Return format: ["concept one", "concept two", ...]`;
}

export function promptMergeConcepts(allConcepts: string[]): string {
  return `Merge and deduplicate these concepts from study notes. Keep only the most important and distinct ones. Return a JSON array of max 20 unique concept strings.

Concepts:
${allConcepts.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Return format: ["concept one", "concept two", ...]`;
}

export function promptSequencePhase1(concepts: string[], subject: string): string {
  return `Design a 10-12 scene cinematic learning experience for "${subject}".

Select and sequence the most important concepts. Assign each scene a type.

Scene types:
- "hook": a surprising fact or provocative question — grabs attention before any teaching
- "concept": explains a core idea clearly
- "analogy": bridges a concept to something the learner already knows
- "reveal": a concrete code example or real-world demonstration
- "callout": a single punchy key insight (one memorable sentence)
- "recap": summary of what was learned

Rules:
- First scene must be "hook"
- Last scene must be "recap"
- Build foundational ideas before advanced ones
- Include at least 1 analogy, 1 reveal, 1 callout

Concepts to choose from:
${concepts.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Return JSON array:
[{"type": "hook", "concept": "the concept to use", "order": 1}, ...]`;
}

export function promptWriteScenes(
  sequenced: Array<{ type: string; concept: string; order: number }>,
  subject: string
): string {
  return `Write the scene scripts for a "${subject}" cinematic learning experience. Each scene appears full-screen. Write for maximum impact — sharp, precise, memorable. No filler sentences.

Scene writing rules by type:
- hook: headline = a striking question or surprising fact (max 12 words). body = 2 sentences that intrigue without revealing everything.
- concept: headline = the idea's name. body = 2-3 sentences of clear explanation.
- analogy: headline = "Think of it like [X]". body = 1-2 sentences completing the analogy.
- reveal: headline = what we're showing. body = 1 sentence. Add code field with real working code.
- callout: headline = the single most powerful insight (max 12 words). body = null.
- recap: headline = "What you just learned". body = bullet points joined with " · " (no line breaks).

Scenes:
${JSON.stringify(sequenced, null, 2)}

Return JSON array:
[{
  "order": 1,
  "type": "hook",
  "headline": "...",
  "body": "...",
  "code": null
}, ...]`;
}

export function promptPhase2Sections(
  sections: Array<{ index: number; preview: string }>
): string {
  return `You are classifying and reordering sections of study notes for a scroll-driven animated reading experience.

For each section decide:

1. display_mode — how to render it:
   - "heading": a title or section header → kinetic typography (letters assemble)
   - "prose": a flowing explanation → word-by-word amber highlight reveal
   - "callout": a key insight, definition, or pivotal sentence → full-screen dark background + amber rule + large centred text
   - "code": a code block → scroll-driven typewriter reveal
   - "list": a list or enumeration → items cascade in from the left
   - "image": an image or figure reference → parallax container

2. order: reorder for the best logical learning flow (foundational first)

3. pull_quote: for "callout" sections only — extract the single most powerful sentence (max 15 words). null for all other types.

Sections to classify:
${sections.map((s) => `[index ${s.index}]\n${s.preview}`).join("\n\n---\n\n")}

Return a JSON array ordered by learning flow:
[{
  "original_index": 0,
  "display_mode": "heading",
  "pull_quote": null,
  "order": 1
}, ...]`;
}
