"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { Chapter } from "@/lib/db/chapters";
import { FlashcardPlayer, FlashcardLoadingScreen, FlashcardErrorScreen } from "@/components/learn/FlashcardPlayer";

export default function ChapterFlashcardsPage({
  params,
}: {
  params: Promise<{ trackId: string; chapterId: string }>;
}) {
  const { trackId, chapterId } = use(params);
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/tracks/${trackId}`);
      if (!res.ok) { setErrorMsg("Track not found or access denied."); setLoading(false); return; }
      const { chapters } = await res.json();
      const found = (chapters as Chapter[]).find((c) => c.id === chapterId);
      if (!found) { setErrorMsg("Chapter not found."); setLoading(false); return; }
      if (found.status !== "ready") { setErrorMsg("This chapter is still being generated. Refresh in a moment."); setLoading(false); return; }
      setChapter(found);
      setLoading(false);
    }
    load();
  }, [trackId, chapterId]);

  const backToRoadmap = () => router.push(`/cs-journey/${trackId}/roadmap`);

  if (loading) return <FlashcardLoadingScreen />;
  if (errorMsg) return <FlashcardErrorScreen message={errorMsg} onBack={backToRoadmap} backLabel="← Back to roadmap" />;
  if (!chapter || (chapter.phase1_scenes ?? []).length === 0) {
    return <FlashcardErrorScreen message="No flashcards found for this chapter." onBack={backToRoadmap} backLabel="← Back to roadmap" />;
  }

  return (
    <FlashcardPlayer
      scenes={chapter.phase1_scenes ?? []}
      title={chapter.title}
      onExploreFull={() => router.push(`/cs-journey/${trackId}/chapters/${chapterId}/deep`)}
      onCompare={() => router.push(`/cs-journey/${trackId}/chapters/${chapterId}/compare`)}
    />
  );
}
