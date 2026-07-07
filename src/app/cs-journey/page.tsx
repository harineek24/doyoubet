"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllTracks } from "@/lib/repo";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';

export default function CSJourneyPickerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const tracks = useMemo(() => (user ? getAllTracks(user.id) : []), [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [loading, user, router]);

  if (!user) return null;

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
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.03 }}
            onClick={() => router.push(`/cs-journey/${t.id}`)}
            style={{
              textAlign: "left",
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
                <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: t.accentColor, opacity: 0.7 }}>
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
            <p style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(92,61,30,0.45)", marginTop: "0.9rem" }}>
              {t.chapters.length} chapters
            </p>
          </motion.button>
        ))}
      </div>
    </main>
  );
}
