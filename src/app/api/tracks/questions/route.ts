import { NextRequest, NextResponse } from "next/server";
import { llmChat } from "@/lib/ollama/client";

const SYSTEM_PROMPT = `You suggest Socratic learning questions for a given subject.
Respond with ONLY a valid JSON array — start with [ end with ] — no prose, no code fences.
Produce 8 to 10 questions. Each question must:
- Be a clear, specific, answerable question about the subject
- Start with "What", "How", "Why", "When", or "What is the difference"
- Cover a distinct concept (no duplicates or near-duplicates)
- Be ordered from foundational to advanced
Output ONLY the JSON array of strings.`;

export async function POST(req: NextRequest) {
  const { title } = await req.json();
  if (!title?.trim())
    return NextResponse.json({ error: "title is required" }, { status: 400 });

  let content: string;
  try {
    content = await llmChat(`Subject: ${title}`, SYSTEM_PROMPT);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  let questions: string[] = [];
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) questions = parsed.filter((q) => typeof q === "string");
  } catch {
    const start = cleaned.indexOf("[");
    if (start !== -1) {
      try { questions = JSON.parse(cleaned.slice(start)); } catch { /* */ }
    }
  }

  if (questions.length === 0)
    return NextResponse.json({ error: "Could not generate questions." }, { status: 502 });

  return NextResponse.json({ questions });
}
