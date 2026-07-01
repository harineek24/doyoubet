const MAX_TOKENS = 1800;
const OVERLAP_TOKENS = 200;
const CHARS_PER_TOKEN = 3.5;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function chunkNotes(text: string): string[] {
  if (estimateTokens(text) <= MAX_TOKENS) return [text];

  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text];
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;
  let overlapBuffer: string[] = [];

  for (const sentence of sentences) {
    const sentTokens = estimateTokens(sentence);

    if (currentTokens + sentTokens > MAX_TOKENS && current.length > 0) {
      chunks.push(current.join(" ").trim());
      current = [...overlapBuffer];
      currentTokens = estimateTokens(current.join(" "));
    }

    current.push(sentence.trim());
    currentTokens += sentTokens;

    overlapBuffer.push(sentence.trim());
    while (
      overlapBuffer.length > 1 &&
      estimateTokens(overlapBuffer.join(" ")) > OVERLAP_TOKENS
    ) {
      overlapBuffer.shift();
    }
  }

  if (current.length > 0) chunks.push(current.join(" ").trim());
  return chunks.filter(Boolean);
}

export function splitIntoSections(
  text: string
): Array<{ index: number; content: string; preview: string }> {
  const parts = text
    .split(/\n(?=#{1,3}\s)|\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.map((content, index) => ({
    index,
    content,
    preview: content.slice(0, 300) + (content.length > 300 ? "..." : ""),
  }));
}
