// Soft cap on how many ~1800-token chunks a single chapter's accumulated
// notes can grow to before the classifier is nudged to start a new chapter
// instead of continuing to extend this one. Keeps per-submission LLM call
// counts (and Groq free-tier rate-limit exposure) bounded over time.
//
// Raise this once on a paid tier — it's the only thing that needs to change.
export const MAX_CHUNKS_PER_CHAPTER = 4;

// Above this, a single "direct" LLM call (raw text in, final result out) is
// skipped in favor of the decomposed multi-call pipeline (chunk -> extract ->
// merge -> sequence/expand). Groq's 128k context could handle far more than
// this in one call, but this cap keeps typical output well within a single
// completion's token budget and is already generous for one note-taking
// session (~1,750 words). This should almost never trigger in practice —
// it exists as a dormant safety net for chapters that grow very large after
// many accumulated submissions, not as the common path.
export const MAX_TOKENS_FOR_DIRECT_PIPELINE = 3000;
