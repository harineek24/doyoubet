"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllTracks, deleteCustomTrack } from "@/lib/repo";
import type { Track } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

export default function CSJourneyPickerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Track | null>(null);
  const [deleteInput, setDeleteInput]   = useState("");

  useEffect(() => {
    if (user) setTracks(getAllTracks(user.id));
  }, [user]);

  function handleDeleteConfirm() {
    if (!user || !deleteTarget || deleteInput !== "delete") return;
    deleteCustomTrack(user.id, deleteTarget.id);
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

            {/* Delete button — only on ai-generated tracks */}
            {t.source === "ai-generated" && (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); setDeleteInput(""); }}
                style={{
                  position: "absolute", top: 10, right: 10,
                  background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.18)",
                  borderRadius: 8, padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center",
                  color: "rgba(220,38,38,0.55)",
                }}
                title="Delete subject"
              >
                <Trash2 size={13} />
              </button>
            )}
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
              This will permanently remove the subject and all its flashcards. Type <strong>delete</strong> to confirm.
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
    </main>
  );
}
