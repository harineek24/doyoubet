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

export function promptSegmentAndClassifyChapters(
  trackTitle: string,
  existingChapters: Array<{ id: string; title: string; sub: string; summary: string; tags: string[]; atCap: boolean }>,
  numberedPiecesText: string,
  pieceCount: number
): string {
  const chapterList = existingChapters.length
    ? existingChapters
        .map(
          (c) =>
            `[chapter_id: ${c.id}] "${c.title}" — ${c.sub}. ${c.summary} (tags: ${c.tags.join(", ") || "none"})${
              c.atCap ? " [AT CAPACITY — do not add more to this chapter, prefer a new one]" : ""
            }`
        )
        .join("\n")
    : "(none yet — this is the first submission for this subject)";

  return `You are organizing a user's incoming study notes on "${trackTitle}" into chapters within a personal study app. Chapters grow over multiple sessions as the user adds more notes over time.

Existing chapters:
${chapterList}

Below is the user's new submission, split into ${pieceCount} numbered pieces purely for reference. The piece boundaries are NOT topic boundaries — they're just blank-line breaks in how the user happened to type. Multiple consecutive pieces are very often part of the exact same idea.

${numberedPiecesText}

Decide how to GROUP these pieces into chapters. Bias heavily toward FEWER, broader chapters:
- A block of text with several labeled sub-points, examples, or asides (e.g. a database intro that mentions "amount of information", "concurrency", and "surprises" as sub-challenges, or a NoSQL aside within the same intro) is normally ONE chapter, not several — those are sub-points of one coherent idea, not separate subjects.
- Worked example: if pieces 0 through 6 together read as one continuous introduction to a topic — even though piece 3 starts talking about "concurrency" and piece 5 mentions "NoSQL" — group all of them as ONE chapter. Only start a new chapter group when the subject matter changes completely (e.g. switching from "how databases work" to "how compilers work"), not just because the vocabulary shifts within one intro.
- Prefer matching an existing chapter (by chapter_id) over creating a new one whenever there's real topical overlap. Only route into a chapter marked AT CAPACITY as an absolute last resort — otherwise start a new chapter instead of extending it further.
- If genuinely distinct chapters are needed, give each a concise chapter_title, chapter_sub (a kicker, under 6 words), chapter_summary (1-2 sentences), and chapter_tags (2-4 short tags).

Every piece from 0 to ${pieceCount - 1} must belong to exactly one group, in order, with no gaps or overlaps — piece_range values must be contiguous across the whole set of groups.

Return ONLY a JSON array:
[
  {"piece_range": [0, 6], "action": "existing", "chapter_id": "...", "chapter_title": null, "chapter_sub": null, "chapter_summary": null, "chapter_tags": null},
  {"piece_range": [7, 8], "action": "new", "chapter_id": null, "chapter_title": "...", "chapter_sub": "...", "chapter_summary": "...", "chapter_tags": ["...", "..."]}
]`;
}

export function promptGenerateFlashcardsDirect(rawText: string, subject: string): string {
  return `Write a 10-12 scene cinematic flashcard learning experience for "${subject}", directly from these notes. Select and sequence the most important ideas yourself — you are choosing what matters, not just summarizing everything.

Scene types (assign one per scene):
- "hook": a surprising fact or provocative question — grabs attention before any teaching. Must be scene 1.
- "concept": explains a core idea clearly.
- "analogy": bridges a concept to something the learner already knows.
- "reveal": a concrete code example or real-world demonstration.
- "callout": a single punchy key insight (one memorable sentence).
- "recap": summary of what was learned. Must be the last scene.

Include at least 1 analogy, 1 reveal, and 1 callout among the 10-12 scenes.

Scene writing rules by type:
- hook: headline = a striking question or surprising fact (max 12 words). body = 2 sentences that intrigue without revealing everything.
- concept: headline = the idea's name. body = 2-3 sentences of clear explanation.
- analogy: headline = "Think of it like [X]". body = 1-2 sentences completing the analogy.
- reveal: headline = what we're showing. body = 1 sentence. Add a code field with real working code.
- callout: headline = the single most powerful insight (max 12 words). body = null.
- recap: headline = "What you just learned". body = bullet points joined with " · " (no line breaks).

Notes:
${rawText}

Return ONLY a JSON array:
[{
  "order": 1,
  "type": "hook",
  "headline": "...",
  "body": "...",
  "code": null
}, ...]`;
}

// Structure decisions only — no generated content in this call. Keeping
// content generation out of this response is what makes it safe: a call
// that only ever returns labels/indices can't misattribute generated text
// to the wrong row, because there's no generated text here to misattribute.
export function promptPhase2Segment(numberedPiecesText: string, pieceCount: number): string {
  return `You are preparing a user's own study notes for a scroll-driven animated reading experience.

Below are the notes split into ${pieceCount} numbered pieces purely for reference — piece boundaries are NOT the final section boundaries.

${numberedPiecesText}

GROUP pieces into reading sections. This is the OPPOSITE bias from chapter-level grouping — here you want enough sections for a good scroll-driven reading rhythm, not one giant block. Concrete rules, not judgment calls:
- A section should almost always span only 1-2 pieces. Only merge 3+ consecutive pieces if they are unmistakably one continuous sentence that just happened to get a stray blank line in the middle of it.
- A heading or short standalone label line (e.g. "How to import NumPy") ALWAYS starts a brand new section — never merge the heading and the paragraph after it into the same section as an unrelated earlier paragraph.
- A code block is ALWAYS its own separate section, never merged with surrounding prose.
- Each distinct instructional step or sub-topic (e.g. "how to import it" vs "how to create an array" vs "reading the example code") gets its own section, even if they're topically related — this is different from chapter grouping, where related sub-topics stay together. Here, related-but-distinct steps should still be separate sections so each gets its own moment on screen.
- Every piece from 0 to ${pieceCount - 1} must belong to exactly one group, in order, contiguous, no gaps or overlaps.

For each section, assign:
- display_mode: "heading" (a title/header only, one short line, NOT a large multi-paragraph block → kinetic typography), "prose" (flowing explanation → word reveal), "callout" (a key insight/definition → full-screen emphasis), "code" (a code block → typewriter reveal), "list" (an enumeration → cascade), "image" (a figure reference → parallax)
- order: reorder for the best logical learning flow (foundational first)
- pull_quote: for "callout" sections only, the single most powerful sentence (max 15 words) — null otherwise

Return ONLY a JSON array:
[{"piece_range": [0, 1], "display_mode": "prose", "pull_quote": null, "order": 1}, ...]`;
}

export function promptExpandByIndex(
  sections: Array<{ index: number; display_mode: string; content: string }>
): string {
  return `You are elaborating a user's own shorthand study notes into fuller prose for a reading experience — you are an editor and explainer, not a new author. The user wrote these tersely (fragments, abbreviations, half-sentences); your job is to expand them into clear, complete, well-formed sentences while staying strictly faithful to what they wrote.

Rules:
- Do NOT invent facts, examples, or claims not already implied by the original text.
- Do NOT change the meaning or add opinions.
- Do NOT summarize, shorten, or drop any part of a section's content — every fact in the original must still be present, just phrased more fully.
- DO turn fragments into full sentences, spell out abbreviations on first use, and add connective words so the passage reads smoothly.
- Keep roughly the same length ratio — a one-sentence fragment becomes 1-2 sentences, not a paragraph.
- If a section's display_mode is "code", leave the code itself completely unchanged — do not "expand" code.

Each section below is tagged with its index. Return exactly one result per index, and make sure the enhanced_content you write for a given index is the expansion of THAT index's own content — not a neighboring one.

Sections:
${sections.map((s) => `[index ${s.index}, display_mode: ${s.display_mode}]\n${s.content}`).join("\n\n---\n\n")}

Return ONLY a JSON array:
[{"index": 0, "enhanced_content": "..."}, ...]`;
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
