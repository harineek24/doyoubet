"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getAllTracks, getPreferences, savePreferences, getTenants } from "@/lib/repo";
import type { Track } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

function OnboardingInner() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [loading, user, router]);

  const tracks: Track[] = useMemo(() => (user ? getAllTracks(user.id) : []), [user]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tracks.filter((t) =>
      t.title.toLowerCase().includes(q) || t.tagline?.toLowerCase().includes(q)
    );
  }, [query, tracks]);

  function pick(t: Track) {
    if (!user) return;
    // Save minimal prefs so /dashboard/study still works for the wheel
    if (!getPreferences(user.id)) {
      savePreferences({ userId: user.id, domain: "cs_sde", subject: "computer_science", learningStyle: "structured", activeTenantId: null, updatedAt: new Date().toISOString() });
      getTenants(user.id);
    }
    router.replace(`/cs-intro?trackId=${t.id}`);
  }

  function createUniverse() {
    if (!user) return;
    if (!getPreferences(user.id)) {
      savePreferences({ userId: user.id, domain: "cs_sde", subject: "computer_science", learningStyle: "structured", activeTenantId: null, updatedAt: new Date().toISOString() });
      getTenants(user.id);
    }
    router.replace("/cs-journey/new");
  }

  if (!user) return null;

  const showDropdown = focused && query.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 100% 80% at 50% 0%, #fef3c7 0%, #fdf8f0 60%, #f5e6d0 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 540, display: "flex", flexDirection: "column", alignItems: "center", gap: "2.5rem" }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: MONO, fontSize: "0.68rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(146,64,14,0.5)", margin: "0 0 0.5rem" }}>
            betonyou
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, fontStyle: "italic", color: "#1c1008", margin: 0, lineHeight: 1.1 }}>
            What do you want to learn?
          </h1>
        </div>

        {/* Search */}
        <div style={{ width: "100%", position: "relative" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="e.g. Python, Data Structures, AI…"
            style={{
              width: "100%", boxSizing: "border-box",
              fontFamily: SERIF, fontStyle: "italic", fontSize: "1.1rem",
              padding: "1rem 1.4rem",
              borderRadius: 16,
              border: "2px solid rgba(245,158,11,0.35)",
              background: "rgba(255,253,248,0.9)",
              color: "#1c1008",
              outline: "none",
              boxShadow: focused ? "0 0 0 3px rgba(245,158,11,0.18), 0 8px 32px rgba(120,70,20,0.10)" : "0 4px 20px rgba(120,70,20,0.08)",
              transition: "box-shadow 0.2s, border-color 0.2s",
              borderColor: focused ? "rgba(245,158,11,0.6)" : "rgba(245,158,11,0.35)",
            }}
          />

          {/* Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 50,
                  background: "#fffdf8",
                  borderRadius: 14,
                  border: "1.5px solid rgba(245,158,11,0.25)",
                  boxShadow: "0 12px 40px rgba(120,70,20,0.14)",
                  overflow: "hidden",
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {matches.length === 0 ? (
                  <div style={{ padding: "1rem 1.2rem", fontFamily: SERIF, fontStyle: "italic", fontSize: "0.9rem", color: "rgba(92,61,30,0.5)" }}>
                    No match — try "create new universe" below
                  </div>
                ) : (
                  matches.map((t) => (
                    <button
                      key={t.id}
                      onMouseDown={() => pick(t)}
                      style={{
                        width: "100%", textAlign: "left",
                        padding: "0.85rem 1.2rem",
                        background: "none", border: "none",
                        borderBottom: "1px solid rgba(245,158,11,0.10)",
                        cursor: "pointer",
                        display: "flex", flexDirection: "column", gap: 2,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {t.source === "ai-generated" && (
                          <span style={{ fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#f59e0b", background: "rgba(245,158,11,0.12)", borderRadius: 20, padding: "1px 7px" }}>yours</span>
                        )}
                        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1rem", color: "#1c1008" }}>{t.title}</span>
                      </div>
                      {t.tagline && (
                        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: "rgba(92,61,30,0.55)" }}>{t.tagline}</span>
                      )}
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", width: "100%" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(245,158,11,0.2)" }} />
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: "rgba(146,64,14,0.4)" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(245,158,11,0.2)" }} />
        </div>

        {/* Create new universe */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={createUniverse}
          style={{
            fontFamily: SERIF, fontStyle: "italic", fontWeight: 700,
            fontSize: "1rem", color: "#92400e",
            background: "rgba(245,158,11,0.10)",
            border: "1.5px solid rgba(245,158,11,0.35)",
            borderRadius: 50, padding: "12px 32px",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(245,158,11,0.15)",
            transition: "background 0.2s",
          }}
        >
          + Create new universe
        </motion.button>
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  return <Suspense><OnboardingInner /></Suspense>;
}
