import type { Flashcard } from "@/types/schema";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Splits a prose body into 2-4 flashcards by sentence chunks.
// Used so existing builtin body content is immediately usable as flashcards
// without requiring manual re-authoring of every chapter.
export function bodyToCards(title: string, sub: string, body: string): Flashcard[] {
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return [{ id: uid(), question: `What is ${title}?`, answer: body }];
  }

  const chunkSize = Math.ceil(sentences.length / Math.min(3, sentences.length));
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    chunks.push(sentences.slice(i, i + chunkSize).join(" "));
  }

  const questions = [
    `What is ${sub} and why does it matter in ${title}?`,
    `What are the key mechanics / rules to remember about ${title}?`,
    `What is the most important thing to know before moving on from ${title}?`,
  ];

  return chunks.map((chunk, i) => ({
    id: uid(),
    question: questions[i] ?? `Review: ${title} — part ${i + 1}`,
    answer: chunk,
  }));
}

export function blankCard(): Flashcard {
  return { id: uid(), question: "", answer: "" };
}
