"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { buildTrack } from "@/lib/store/tracks";
import { saveCustomTrack } from "@/lib/repo";
import type { TrackChapter } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';

export default function NewSubjectPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<TrackChapter[] | null>(null);

  async function handleGenerate() {
    if (!title.trim() || !notes.trim() || generating) return;
    setGenerating(true);
    setError(null);
    setChapters(null);
    try {
      const res = await fetch("/api/tracks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setTrackId(data.trackId);
      setChapters(data.chapters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    if (!user || !trackId || !chapters) return;
    const newTrack = buildTrack(
      trackId,
      title,
      notes.slice(0, 140),
      chapters,
      user.id,
      "ai-generated",
      notes
    );
    saveCustomTrack(user.id, newTrack);
    router.push(`/cs-journey/${trackId}`);
  }

  if (!user) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 90% 70% at 50% 0%, #fef3c7 0%, #fdf8f0 55%)",
        padding: "clamp(2rem, 5vw, 3.5rem)",
      }}
    >
      <a
        href="/cs-journey"
        style={{ fontFamily: SERIF, fontSize: "0.78rem", fontStyle: "italic", color: "rgba(146,64,14,0.6)", textDecoration: "none" }}
      >
        ← All subjects
      </a>

      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 700, color: "#1c1008", margin: "0.6rem 0 1.75rem", letterSpacing: "-0.02em" }}>
        Build your own subject
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "2rem" }}>
        {/* Left — notepad */}
        <div>
          <label style={{ display: "block", fontFamily: SERIF, fontSize: "0.78rem", fontStyle: "italic", color: "rgba(146,64,14,0.7)", marginBottom: 6 }}>
            Subject title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Compilers from Scratch"
            style={{
              width: "100%", borderRadius: 10, border: "1px solid rgba(146,64,14,0.18)",
              background: "#fffdf8", padding: "10px 14px", fontFamily: SERIF, fontSize: "0.95rem",
              color: "#1c1008", marginBottom: "1.1rem", outline: "none",
            }}
          />

          <label style={{ display: "block", fontFamily: SERIF, fontSize: "0.78rem", fontStyle: "italic", color: "rgba(146,64,14,0.7)", marginBottom: 6 }}>
            What do you want this subject to cover?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dump your notes here — topics, order, anything you want covered. The messier the better, the AI will structure it."
            rows={16}
            style={{
              width: "100%", borderRadius: 10, border: "1px solid rgba(146,64,14,0.18)",
              background: "#fffdf8", padding: "12px 14px", fontFamily: SERIF, fontSize: "0.9rem",
              color: "#1c1008", resize: "vertical", outline: "none", lineHeight: 1.6,
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={generating || !title.trim() || !notes.trim()}
            style={{
              marginTop: "1rem",
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: SERIF, fontSize: "0.85rem", fontStyle: "italic", fontWeight: 700,
              color: "#fffdf8",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none", borderRadius: 50, padding: "11px 24px",
              cursor: generating ? "default" : "pointer",
              opacity: !title.trim() || !notes.trim() ? 0.5 : 1,
              boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
            }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Structuring…" : "Generate"}
          </button>

          {error && (
            <p style={{ marginTop: "0.75rem", fontFamily: SERIF, fontSize: "0.8rem", color: "#b91c1c", fontStyle: "italic" }}>
              {error}
            </p>
          )}
        </div>

        {/* Right — AI-structured preview */}
        <div>
          <p style={{ fontFamily: SERIF, fontSize: "0.78rem", fontStyle: "italic", color: "rgba(146,64,14,0.7)", marginBottom: 10 }}>
            {chapters ? `${chapters.length} chapters structured` : "Structured preview appears here"}
          </p>

          {!chapters && !generating && (
            <div style={{ borderRadius: 14, border: "1px dashed rgba(146,64,14,0.25)", padding: "2.5rem 1.5rem", textAlign: "center" }}>
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "rgba(146,64,14,0.4)" }}>
                Write your notes and hit Generate.
              </p>
            </div>
          )}

          {generating && (
            <div style={{ borderRadius: 14, border: "1px dashed rgba(146,64,14,0.25)", padding: "2.5rem 1.5rem", textAlign: "center" }}>
              <Loader2 className="mx-auto h-5 w-5 animate-spin" style={{ color: "#92400e" }} />
            </div>
          )}

          {chapters && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "70vh", overflowY: "auto" }}>
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    borderRadius: 12, padding: "12px 16px",
                    background: "#fffdf8", border: `1px solid ${ch.accent}33`,
                  }}
                >
                  <p style={{ fontFamily: SERIF, fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: ch.accent, fontStyle: "italic", margin: 0 }}>
                    {ch.num} · {ch.sub}
                  </p>
                  <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1rem", color: "#1c1008", margin: "0.2rem 0 0.3rem" }}>
                    {ch.title}
                  </p>
                  <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.8rem", color: "#5c3d2e", margin: 0, lineHeight: 1.5 }}>
                    {ch.desc}
                  </p>
                </div>
              ))}

              <button
                onClick={handleSave}
                style={{
                  marginTop: 6,
                  fontFamily: SERIF, fontSize: "0.85rem", fontStyle: "italic", fontWeight: 700,
                  color: "#fffdf8",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none", borderRadius: 50, padding: "11px 24px",
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
                }}
              >
                Save subject →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
