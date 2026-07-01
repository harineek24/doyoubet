import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { DEV_USER_ID } from "@/lib/db/localClient";
import { runFullPipeline } from "@/lib/ollama/pipeline";
import { ollamaAvailable } from "@/lib/ollama/client";

async function resolveUserId(): Promise<string | null> {
  if (db.isLocal) return DEV_USER_ID;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, raw_text, images } = body as {
    title?: string;
    raw_text: string;
    images?: Array<{ url: string; caption: string }>;
  };

  if (!raw_text?.trim()) {
    return NextResponse.json({ error: "raw_text is required" }, { status: 400 });
  }

  const available = await ollamaAvailable();
  if (!available) {
    return NextResponse.json(
      { error: "Ollama is not running. Start it with: ollama serve" },
      { status: 503 }
    );
  }

  const note = await db.notes.create({
    user_id: userId,
    title: title?.trim() ?? "",
    raw_text: raw_text.trim(),
    images: images ?? [],
  });

  const experience = await db.experiences.create(note.id);

  try {
    const { phase1, phase2 } = await runFullPipeline(raw_text.trim(), title?.trim() ?? "");
    await db.experiences.markReady(experience.id, phase1, phase2);

    return NextResponse.json({
      note_id: note.id,
      experience_id: experience.id,
      status: "ready",
      phase1_count: phase1.length,
      phase2_count: phase2.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.experiences.markError(experience.id, msg);
    return NextResponse.json(
      { error: "AI pipeline failed", detail: msg, note_id: note.id },
      { status: 500 }
    );
  }
}
