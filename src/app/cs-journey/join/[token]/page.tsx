"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { saveCustomTrack, saveChapterFlashcards } from "@/lib/repo";
import { buildTrack } from "@/lib/store/tracks";
import type { TrackChapter } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

interface SharedTrack { title: string; tagline: string; chapters: TrackChapter[]; ownerId: string; }

export default function JoinTrackPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [shared, setShared]   = useState<SharedTrack | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [added, setAdded]     = useState(false);

  useEffect(() => {
    fetch(`/api/tracks/join/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setShared(d); })
      .catch(() => setError("Failed to load shared track."))
      .finally(() => setFetching(false));
  }, [token]);

  function addToLibrary() {
    if (!user || !shared) return;
    const trackId = `shared-${token.slice(0, 8)}`;
    const track = buildTrack(trackId, shared.title, shared.tagline, shared.chapters, user.id, "ai-generated", null);
    saveCustomTrack(user.id, track);
    // Persist flashcards per chapter so the study page finds them immediately
    for (const ch of shared.chapters) {
      if (ch.flashcards?.length) {
        saveChapterFlashcards(trackId, ch.id, ch.flashcards);
      }
    }
    setAdded(true);
    setTimeout(() => router.push("/cs-journey"), 1200);
  }

  if (loading || fetching) {
    return (
      <div style={{ minHeight: "100vh", background: "#0e0a06", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: SERIF, fontStyle: "italic", color: "rgba(245,158,11,0.45)", fontSize: "1rem" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#0e0a06", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <p style={{ fontFamily: SERIF, fontStyle: "italic", color: "rgba(220,38,38,0.7)", fontSize: "1rem" }}>{error}</p>
        <button onClick={() => router.push("/cs-journey")} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "rgba(245,158,11,0.6)", background: "none", border: "none", cursor: "pointer" }}>← Back to subjects</button>
      </div>
    );
  }

  if (!shared) return null;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 90% 70% at 50% 0%, #fef3c7 0%, #fdf8f0 55%)", padding: "clamp(2.5rem, 8vw, 5rem) clamp(1.5rem, 6vw, 5rem)" }}>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ maxWidth: 560, margin: "0 auto" }}>
        <p style={{ fontFamily: SERIF, fontSize: "0.72rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(146,64,14,0.55)", fontStyle: "italic", margin: 0 }}>
          You&rsquo;ve been invited to
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 700, color: "#1c1008", margin: "0.35rem 0 0.3rem", letterSpacing: "-0.02em" }}>
          {shared.title}
        </h1>
        {shared.tagline && (
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.95rem", color: "#5c3d2e", margin: "0 0 1.8rem", lineHeight: 1.6 }}>{shared.tagline}</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "2rem" }}>
          {shared.chapters.map((ch, i) => (
            <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.75rem 1rem", background: "#fffdf8", borderRadius: 12, border: `1px solid ${ch.accent}22`, boxShadow: "0 4px 14px rgba(120,70,20,0.06)" }}>
              <span style={{ fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.18em", color: "rgba(146,64,14,0.4)", flexShrink: 0 }}>{ch.num}</span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ch.g3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "0.95rem", color: "#1c1008", margin: 0, lineHeight: 1.2 }}>{ch.title}</p>
                {ch.sub && <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.75rem", color: "#5c3d2e", margin: "2px 0 0", opacity: 0.7 }}>{ch.sub}</p>}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {ch.tags.slice(0, 2).map((t) => (
                  <span key={t} style={{ fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.08em", textTransform: "uppercase", color: ch.g3, border: `1px solid ${ch.g3}44`, background: `${ch.g3}14`, borderRadius: 20, padding: "2px 7px" }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!user ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "#5c3d2e", marginBottom: "0.8rem" }}>Sign in to add this subject to your library.</p>
            <button
              onClick={() => router.push(`/login?join=${token}`)}
              style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "0.95rem", color: "#fffdf8", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 50, padding: "12px 32px", cursor: "pointer", boxShadow: "0 6px 20px rgba(245,158,11,0.35)" }}
            >
              Sign in to continue
            </button>
          </div>
        ) : added ? (
          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1rem", color: "#92400e", textAlign: "center" }}>✓ Added! Redirecting…</p>
        ) : (
          <button onClick={addToLibrary} style={{ width: "100%", fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "1rem", color: "#fffdf8", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 50, padding: "14px 32px", cursor: "pointer", boxShadow: "0 6px 20px rgba(245,158,11,0.35)" }}>
            Add &ldquo;{shared.title}&rdquo; to my library →
          </button>
        )}
      </motion.div>
    </div>
  );
}
