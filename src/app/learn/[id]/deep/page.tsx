"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { Phase2Section } from "@/lib/db/experiences";
import { DeepReader, DeepReaderLoadingScreen, DeepReaderErrorScreen, type DeepSection } from "@/components/learn/DeepReader";

export default function DeepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sections, setSections] = useState<DeepSection[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/notes/${id}`);
      if (!res.ok) { setErrorMsg("Experience not found."); setLoading(false); return; }
      const { note, experience } = await res.json();
      if (!experience || experience.status !== "ready") {
        setErrorMsg("Experience not ready yet."); setLoading(false); return;
      }
      const raw: Phase2Section[] = experience.phase2_sections ?? [];
      setSections(raw.map((s) => ({ display_mode: s.display_mode, pull_quote: s.pull_quote, content: s.content })));
      setNoteTitle(note.title ?? "Your Notes");
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <DeepReaderLoadingScreen />;
  if (errorMsg) return <DeepReaderErrorScreen message={errorMsg} />;

  return <DeepReader sections={sections} title={noteTitle} onBack={() => router.push(`/learn/${id}`)} />;
}
