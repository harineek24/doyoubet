"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { Chapter } from "@/lib/db/chapters";
import { DeepReader, DeepReaderLoadingScreen, DeepReaderErrorScreen, type DeepSection } from "@/components/learn/DeepReader";

export default function ChapterDeepPage({
  params,
}: {
  params: Promise<{ trackId: string; chapterId: string }>;
}) {
  const { trackId, chapterId } = use(params);
  const router = useRouter();
  const [sections, setSections] = useState<DeepSection[]>([]);
  const [chapterTitle, setChapterTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/tracks/${trackId}`);
      if (!res.ok) { setErrorMsg("Track not found or access denied."); setLoading(false); return; }
      const { chapters } = await res.json();
      const found = (chapters as Chapter[]).find((c) => c.id === chapterId);
      if (!found) { setErrorMsg("Chapter not found."); setLoading(false); return; }
      if (found.status !== "ready") { setErrorMsg("This chapter is still being generated."); setLoading(false); return; }

      // Cinematic mode always shows the AI-elaborated version of the notes.
      setSections(
        (found.phase2_sections ?? []).map((s) => ({
          display_mode: s.display_mode,
          pull_quote: s.pull_quote,
          content: s.enhanced_content,
        }))
      );
      setChapterTitle(found.title);
      setLoading(false);
    }
    load();
  }, [trackId, chapterId]);

  if (loading) return <DeepReaderLoadingScreen />;
  if (errorMsg) return <DeepReaderErrorScreen message={errorMsg} />;

  return (
    <DeepReader
      sections={sections}
      title={chapterTitle}
      onBack={() => router.push(`/cs-journey/${trackId}/chapters/${chapterId}`)}
    />
  );
}
