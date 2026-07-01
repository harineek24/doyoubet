"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { Chapter } from "@/lib/db/chapters";
import { CompareView } from "@/components/learn/CompareView";
import { DeepReaderLoadingScreen, DeepReaderErrorScreen } from "@/components/learn/DeepReader";

export default function ChapterComparePage({
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
      if (found.status !== "ready") { setErrorMsg("This chapter is still being generated."); setLoading(false); return; }
      setChapter(found);
      setLoading(false);
    }
    load();
  }, [trackId, chapterId]);

  if (loading) return <DeepReaderLoadingScreen />;
  if (errorMsg) return <DeepReaderErrorScreen message={errorMsg} />;
  if (!chapter) return null;

  return (
    <CompareView
      sections={chapter.phase2_sections ?? []}
      title={chapter.title}
      onBack={() => router.push(`/cs-journey/${trackId}/chapters/${chapterId}`)}
    />
  );
}
