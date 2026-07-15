"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getBuiltinTrack } from "@/lib/store/tracks";
import { getTrack } from "@/lib/repo";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

const OPTIONS = [
  {
    key: "track",
    label: "Track",
    desc: "Your ego bank — deposit wins, mark milestones.",
    icon: "◈",
    active: true,
    color: "#f59e0b",
  },
  {
    key: "study",
    label: "Study",
    desc: "Deep-dive chapters, flashcards, and practice problems.",
    icon: "◎",
    active: true,
    color: "#f59e0b",
  },
  {
    key: "spin",
    label: "Spin the Wheel",
    desc: "Let chance pick your next challenge.",
    icon: "◉",
    active: true,
    color: "#fb923c",
  },
  {
    key: "build",
    label: "Build",
    desc: "Ship real projects. Coming soon.",
    icon: "◧",
    active: false,
    color: "#6b7280",
  },
  {
    key: "network",
    label: "Network",
    desc: "Connect with peers. Coming soon.",
    icon: "◫",
    active: false,
    color: "#6b7280",
  },
] as const;

function HubInner() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId") ?? "";

  const track = trackId
    ? (getBuiltinTrack(trackId) ?? (user ? getTrack(user.id, trackId) : undefined))
    : undefined;

  function choose(key: string) {
    switch (key) {
      case "track":  return router.push("/hub/track/egobank");
      case "study":  return router.push(trackId ? `/cs-journey/${trackId}` : "/cs-journey");
      case "spin":   return router.push("/dashboard/study");
      default: break;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e0a06", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(245,158,11,0.07) 0%, transparent 70%)" }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: "2.5rem", position: "relative" }}
      >
        {/* Universe label */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(245,158,11,0.4)", margin: "0 0 0.4rem" }}>
            your universe
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem, 4.5vw, 2.8rem)", fontWeight: 700, fontStyle: "italic", color: "rgba(254,249,231,0.92)", margin: 0, lineHeight: 1.1 }}>
            {track?.title ?? "Welcome"}
          </h1>
          {track?.tagline && (
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "rgba(245,158,11,0.45)", margin: "0.4rem 0 0" }}>
              {track.tagline}
            </p>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 52, height: 1.5, background: "linear-gradient(to right, transparent, rgba(245,158,11,0.5), transparent)", borderRadius: 2 }} />

        {/* Options grid */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {OPTIONS.map((opt, i) => (
            <motion.button
              key={opt.key}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => opt.active && choose(opt.key)}
              disabled={!opt.active}
              style={{
                width: "100%", textAlign: "left",
                display: "flex", alignItems: "center", gap: "1.25rem",
                padding: "1.1rem 1.4rem",
                background: opt.active ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${opt.active ? `${opt.color}30` : "rgba(255,255,255,0.06)"}`,
                borderRadius: 16,
                cursor: opt.active ? "pointer" : "default",
                opacity: opt.active ? 1 : 0.38,
                transition: "background 0.18s, border-color 0.18s",
              }}
              onMouseEnter={(e) => { if (opt.active) e.currentTarget.style.background = "rgba(245,158,11,0.10)"; }}
              onMouseLeave={(e) => { if (opt.active) e.currentTarget.style.background = "rgba(245,158,11,0.05)"; }}
            >
              <span style={{ fontSize: "1.5rem", color: opt.color, flexShrink: 0, width: 32, textAlign: "center" }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.05rem", color: opt.active ? "rgba(254,249,231,0.92)" : "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.2 }}>
                  {opt.label}
                </p>
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: opt.active ? "rgba(245,158,11,0.45)" : "rgba(255,255,255,0.2)", margin: "0.2rem 0 0" }}>
                  {opt.desc}
                </p>
              </div>
              {opt.active && <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: `${opt.color}60` }}>→</span>}
            </motion.button>
          ))}
        </div>

        {/* Back */}
        <button
          onClick={() => router.replace("/onboarding")}
          style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: "rgba(245,158,11,0.35)", background: "none", border: "none", cursor: "pointer", marginTop: "0.5rem" }}
        >
          ← change universe
        </button>
      </motion.div>
    </div>
  );
}

export default function HubPage() {
  return <Suspense><HubInner /></Suspense>;
}
