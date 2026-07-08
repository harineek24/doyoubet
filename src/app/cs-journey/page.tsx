"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Copy, Link2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllTracks, deleteCustomTrack, hideBuiltinTrack, getChapterFlashcards } from "@/lib/repo";
import type { Track } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

export default function CSJourneyPickerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);
  const [deleteInput, setDeleteInput]   = useState("");

  // Share modal
  const [shareTarget, setShareTarget]   = useState<Track | null>(null);
  const [shareUrl, setShareUrl]         = useState<string | null>(null);
  const [shareEmail, setShareEmail]     = useState("");
  const [sharing, setSharing]           = useState(false);
  const [copied, setCopied]             = useState(false);
  const [shareError, setShareError]     = useState<string | null>(null);

  useEffect(() => {
    if (user) setTracks(getAllTracks(user.id));
  }, [user]);

  async function openShare(t: Track) {
    setShareTarget(t); setShareUrl(null); setShareEmail(""); setCopied(false); setShareError(null);
    setSharing(true);
    try {
      // Hydrate flashcards from localStorage cache (needed for builtin tracks where
      // flashcards live in the cache, not embedded in ch.flashcards)
      const chapters = t.chapters.map((ch) => {
        const cached = getChapterFlashcards(t.id, ch.id);
        const flashcards = (ch.flashcards?.length ? ch.flashcards : cached);
        return { ...ch, flashcards: flashcards.length ? flashcards : undefined };
      });
      const res = await fetch("/api/tracks/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: t.id, title: t.title, tagline: t.tagline, chapters }),
      });
      const d = await res.json();
      if (d.shareUrl) setShareUrl(d.shareUrl);
      else setShareError(d.error ?? `Server error ${res.status}`);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "Network error");
    }
    setSharing(false);
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openGmail() {
    if (!shareUrl) return;
    const subject = encodeURIComponent(`Join my DevQuest subject: ${shareTarget?.title}`);
    const body = encodeURIComponent(`Hey! I'm inviting you to study "${shareTarget?.title}" with me on DevQuest.\n\nClick the link below to add it to your library:\n\n${shareUrl}\n\nSee you there!`);
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(shareEmail)}&su=${subject}&body=${body}`, "_blank");
  }

  function handleDeleteConfirm() {
    if (!user || !deleteTarget || deleteInput !== "delete") return;
    if (deleteTarget.source === "builtin") {
      hideBuiltinTrack(user.id, deleteTarget.id);
    } else {
      deleteCustomTrack(user.id, deleteTarget.id);
    }
    setTracks(getAllTracks(user.id));
    setDeleteTarget(null);
    setDeleteInput("");
  }

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [loading, user, router]);

  if (!user) return null;

  const canDelete = deleteInput === "delete";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 90% 70% at 50% 0%, #fef3c7 0%, #fdf8f0 55%)",
        padding: "clamp(2rem, 6vw, 4.5rem) clamp(1.5rem, 6vw, 5rem)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: SERIF, fontSize: "0.75rem", letterSpacing: "0.26em", textTransform: "uppercase", color: "rgba(146,64,14,0.55)", fontStyle: "italic", margin: 0 }}>
            Your CS journey
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 700, color: "#1c1008", margin: "0.35rem 0 0", letterSpacing: "-0.02em" }}>
            Choose a subject
          </h1>
        </div>

        <button
          onClick={() => router.push("/cs-journey/new")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: SERIF, fontSize: "0.85rem", fontStyle: "italic", fontWeight: 700,
            color: "#fffdf8",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            border: "none", borderRadius: 50,
            padding: "11px 22px",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
          }}
        >
          <Plus className="h-4 w-4" />
          Add your own subject
        </button>
      </div>

      <div
        style={{
          marginTop: "2.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {tracks.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.03 }}
            style={{ position: "relative" }}
          >
            <button
              onClick={() => router.push(`/cs-journey/${t.id}`)}
              style={{
                width: "100%", textAlign: "left",
                borderRadius: 18,
                padding: "1.4rem 1.5rem",
                background: "#fffdf8",
                border: `1px solid ${t.accentColor}33`,
                cursor: "pointer",
                boxShadow: "0 10px 32px rgba(120,70,20,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: t.accentColor, boxShadow: `0 0 10px ${t.accentColor}90` }} />
                {t.source === "ai-generated" && (
                  <span style={{ fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: t.accentColor, opacity: 0.7 }}>
                    your own
                  </span>
                )}
              </div>
              <h2 style={{ fontFamily: SERIF, fontSize: "1.25rem", fontWeight: 700, color: "#1c1008", margin: "0.6rem 0 0.3rem", lineHeight: 1.2 }}>
                {t.title}
              </h2>
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "#5c3d2e", lineHeight: 1.5, margin: 0 }}>
                {t.tagline}
              </p>
              <p style={{ fontFamily: MONO, fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(92,61,30,0.45)", marginTop: "0.9rem" }}>
                {t.chapters.length} chapters
              </p>
            </button>

            {/* Action buttons — share + delete on all tracks */}
            <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 5 }}>
              <button
                onClick={(e) => { e.stopPropagation(); openShare(t); }}
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 8, padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", color: "rgba(146,64,14,0.6)" }}
                title="Share subject"
              >
                <Link2 size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); setDeleteInput(""); }}
                style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 8, padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", color: "rgba(220,38,38,0.55)" }}
                title="Remove subject"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,10,6,0.72)", backdropFilter: "blur(4px)" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            style={{ background: "#fffdf8", borderRadius: 20, padding: "2rem 2.2rem", maxWidth: 400, width: "90%", boxShadow: "0 24px 80px rgba(14,10,6,0.45)" }}
          >
            <h2 style={{ fontFamily: SERIF, fontSize: "1.25rem", fontWeight: 700, color: "#1c1008", margin: "0 0 0.4rem" }}>
              Delete &ldquo;{deleteTarget.title}&rdquo;?
            </h2>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "#5c3d2e", lineHeight: 1.6, margin: "0 0 1.2rem" }}>
              {deleteTarget?.source === "builtin"
                ? <>This will hide the subject from your list. Type <strong>delete</strong> to confirm.</>
                : <>This will permanently remove the subject and all its flashcards. Type <strong>delete</strong> to confirm.</>}
            </p>
            <input
              autoFocus
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleDeleteConfirm(); if (e.key === "Escape") { setDeleteTarget(null); setDeleteInput(""); } }}
              placeholder="delete"
              style={{
                width: "100%", boxSizing: "border-box",
                fontFamily: MONO, fontSize: "0.9rem",
                padding: "0.6rem 0.9rem", borderRadius: 10,
                border: "1.5px solid rgba(220,38,38,0.3)",
                background: "rgba(220,38,38,0.04)", color: "#1c1008",
                outline: "none", marginBottom: "1.1rem",
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteInput(""); }}
                style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "#5c3d2e", background: "none", border: "1px solid rgba(92,61,30,0.2)", borderRadius: 50, padding: "8px 20px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!canDelete}
                style={{
                  fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "0.88rem",
                  color: "#fffdf8", background: canDelete ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "rgba(220,38,38,0.25)",
                  border: "none", borderRadius: 50, padding: "8px 20px",
                  cursor: canDelete ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Share modal */}
      {shareTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,10,6,0.72)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }}
            style={{ background: "#fffdf8", borderRadius: 20, padding: "2rem 2.2rem", maxWidth: 440, width: "92%", boxShadow: "0 24px 80px rgba(14,10,6,0.45)" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "1.2rem", fontWeight: 700, color: "#1c1008", margin: "0 0 0.3rem" }}>
              Share &ldquo;{shareTarget.title}&rdquo;
            </h2>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.82rem", color: "#5c3d2e", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
              Anyone with the link can add this subject to their own library.
            </p>

            {sharing ? (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "rgba(245,158,11,0.6)", marginBottom: "1rem" }}>Generating link…</p>
            ) : shareUrl ? (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: "1.2rem", alignItems: "center" }}>
                  <input readOnly value={shareUrl} style={{ flex: 1, fontFamily: MONO, fontSize: "0.72rem", padding: "0.5rem 0.8rem", borderRadius: 10, border: "1.5px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.04)", color: "#1c1008", outline: "none" }} />
                  <button onClick={copyLink} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: copied ? "#16a34a" : "#92400e", background: copied ? "rgba(22,163,74,0.08)" : "rgba(245,158,11,0.1)", border: `1px solid ${copied ? "rgba(22,163,74,0.25)" : "rgba(245,158,11,0.25)"}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                    <Copy size={12} /> {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                <label style={{ fontFamily: SERIF, fontSize: "0.76rem", color: "#5c3d2e", display: "block", marginBottom: "0.3rem" }}>Send via Gmail (optional)</label>
                <div style={{ display: "flex", gap: 8, marginBottom: "1.3rem" }}>
                  <input value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} type="email" placeholder="friend@gmail.com" style={{ flex: 1, fontFamily: SERIF, fontSize: "0.88rem", padding: "0.5rem 0.8rem", borderRadius: 10, border: "1.5px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.04)", color: "#1c1008", outline: "none" }} />
                  <button onClick={openGmail} disabled={!shareEmail.trim()} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "0.82rem", color: "#fffdf8", background: shareEmail.trim() ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(245,158,11,0.25)", border: "none", borderRadius: 10, padding: "6px 14px", cursor: shareEmail.trim() ? "pointer" : "default", whiteSpace: "nowrap" }}>
                    Open Gmail
                  </button>
                </div>
              </>
            ) : shareError ? (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "rgba(220,38,38,0.65)", marginBottom: "1rem", lineHeight: 1.5 }}>
                Error: {shareError}
              </p>
            ) : null}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShareTarget(null)} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "#5c3d2e", background: "none", border: "1px solid rgba(92,61,30,0.2)", borderRadius: 50, padding: "8px 20px", cursor: "pointer" }}>Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
