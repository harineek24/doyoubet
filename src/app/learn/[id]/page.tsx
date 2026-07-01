"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { Phase1Scene } from "@/lib/db/experiences";
import { FlashcardPlayer, FlashcardLoadingScreen, FlashcardErrorScreen } from "@/components/learn/FlashcardPlayer";

export default function LearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [scenes, setScenes] = useState<Phase1Scene[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteId, setNoteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/notes/${id}`);
      if (!res.ok) {
        setErrorMsg("Experience not found or access denied.");
        setLoading(false);
        return;
      }
      const { note, experience } = await res.json();
      if (!experience || experience.status !== "ready") {
        setErrorMsg("This experience is still being generated. Refresh in a moment.");
        setLoading(false);
        return;
      }
      setScenes(experience.phase1_script ?? []);
      setNoteTitle(note.title ?? "Your Notes");
      setNoteId(note.id);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <FlashcardLoadingScreen />;
  if (errorMsg) return <FlashcardErrorScreen message={errorMsg} onBack={() => router.push("/notes/new")} />;
  if (scenes.length === 0) return <FlashcardErrorScreen message="No scenes found for this experience." onBack={() => router.push("/notes/new")} />;

  return (
    <FlashcardPlayer
      scenes={scenes}
      title={noteTitle}
      onExploreFull={() => router.push(`/learn/${noteId}/deep`)}
    />
  );
}
