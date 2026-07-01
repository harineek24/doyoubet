"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import type { Phase1Scene } from "@/lib/db/experiences";

const P = {
  bg: "#080d18",
  surface: "#0e1525",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  amberBorder: "rgba(245,158,11,0.28)",
  text: "#e2e8f8",
  textMuted: "#6b7fa8",
  textDim: "#2d3f60",
  green: "#22c55e",
  indigo: "#6366f1",
  indigoDim: "rgba(99,102,241,0.15)",
};

const SCENE_ACCENT: Record<Phase1Scene["type"], string> = {
  hook:    "#f59e0b",
  concept: "#6366f1",
  analogy: "#22c55e",
  reveal:  "#06b6d4",
  callout: "#f43f5e",
  recap:   "#a855f7",
};

const SCENE_LABEL: Record<Phase1Scene["type"], string> = {
  hook:    "Opening",
  concept: "Concept",
  analogy: "Analogy",
  reveal:  "Example",
  callout: "Key Insight",
  recap:   "Recap",
};

function SceneView({ scene, visible }: { scene: Phase1Scene; visible: boolean }) {
  const accent = SCENE_ACCENT[scene.type];

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: scene.type === "callout" ? "center" : "flex-start",
    padding: "clamp(2.5rem,7vw,6rem) clamp(2rem,6vw,5rem)",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0px) scale(1)" : "translateY(18px) scale(0.985)",
    transition: "opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)",
    pointerEvents: visible ? "auto" : "none",
  };

  return (
    <div style={baseStyle}>
      {/* Scene type pill */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: `${accent}18`,
          border: `0.5px solid ${accent}44`,
          borderRadius: 20,
          padding: "4px 12px",
          marginBottom: "clamp(1.2rem,3vh,2.2rem)",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 8px ${accent}`,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: accent,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {SCENE_LABEL[scene.type]}
        </span>
      </div>

      {/* Headline */}
      <h1
        style={{
          fontSize: "clamp(1.6rem,4.5vw,3.2rem)",
          fontWeight: 600,
          color: P.text,
          lineHeight: 1.18,
          letterSpacing: "-0.02em",
          marginBottom: scene.body || scene.code ? "clamp(1rem,2.5vh,1.75rem)" : 0,
          maxWidth: scene.type === "callout" ? "600px" : "none",
          textAlign: scene.type === "callout" ? "center" : "left",
        }}
      >
        {scene.headline}
      </h1>

      {/* Body */}
      {scene.body && (
        <p
          style={{
            fontSize: "clamp(1rem,1.8vw,1.2rem)",
            color: "rgba(226,232,248,0.72)",
            lineHeight: 1.75,
            maxWidth: "62ch",
            marginBottom: scene.code ? "clamp(1rem,2.5vh,1.75rem)" : 0,
          }}
        >
          {scene.body}
        </p>
      )}

      {/* Code block */}
      {scene.code && (
        <div
          style={{
            background: "rgba(6,182,212,0.06)",
            border: "0.5px solid rgba(6,182,212,0.2)",
            borderRadius: 10,
            padding: "16px 20px",
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: "clamp(12px,1.4vw,14px)",
              color: "#67e8f9",
              lineHeight: 1.65,
              whiteSpace: "pre",
            }}
          >
            {scene.code}
          </pre>
        </div>
      )}

      {/* Accent line under callout */}
      {scene.type === "callout" && (
        <div
          style={{
            marginTop: "clamp(1rem,3vh,2rem)",
            height: 2,
            width: 60,
            background: accent,
            borderRadius: 2,
          }}
        />
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
    >
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ animation: "spin 1.2s linear infinite" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="18" cy="18" r="15" stroke={P.amber} strokeWidth="2" strokeOpacity="0.2" />
        <path d="M18 3 A15 15 0 0 1 33 18" stroke={P.amber} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: 14, color: P.textMuted }}>Loading your experience…</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
        padding: "2rem",
      }}
    >
      <p style={{ fontSize: 15, color: "#fca5a5", textAlign: "center" }}>{message}</p>
      <button
        onClick={() => router.push("/notes/new")}
        style={{
          background: P.amberDim,
          border: `0.5px solid ${P.amberBorder}`,
          borderRadius: 8,
          padding: "10px 22px",
          color: P.amber,
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Write new notes
      </button>
    </div>
  );
}

export default function LearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [scenes, setScenes] = useState<Phase1Scene[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteId, setNoteId] = useState("");
  const [current, setCurrent] = useState(0);
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

  const goNext = useCallback(() => setCurrent((c) => Math.min(c + 1, scenes.length - 1)), [scenes.length]);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  if (loading) return <LoadingScreen />;
  if (errorMsg) return <ErrorScreen message={errorMsg} />;
  if (scenes.length === 0) return <ErrorScreen message="No scenes found for this experience." />;

  const isLast = current === scenes.length - 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.bg,
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
        userSelect: "none",
      }}
      onClick={goNext}
    >
      {/* Subtle background glow keyed to scene type */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${SCENE_ACCENT[scenes[current].type]}08 0%, transparent 70%)`,
          transition: "background 0.8s ease",
          pointerEvents: "none",
        }}
      />

      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "1.25rem clamp(1.5rem,5vw,3.5rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: 13, color: P.textMuted, fontWeight: 500 }}>
          {noteTitle || "Your Notes"}
        </span>
        <span
          style={{
            fontSize: 12,
            color: P.textDim,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {current + 1} / {scenes.length}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(255,255,255,0.05)",
          zIndex: 11,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((current + 1) / scenes.length) * 100}%`,
            background: SCENE_ACCENT[scenes[current].type],
            transition: "width 0.4s cubic-bezier(0.16,1,0.3,1), background 0.5s",
          }}
        />
      </div>

      {/* Scenes */}
      <div style={{ position: "absolute", inset: 0 }}>
        {scenes.map((scene, i) => (
          <SceneView key={i} scene={scene} visible={i === current} />
        ))}
      </div>

      {/* Bottom nav */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "1.5rem clamp(1.5rem,5vw,3.5rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dot navigation */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {scenes.map((scene, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                borderRadius: 3,
                border: "none",
                background:
                  i === current
                    ? SCENE_ACCENT[scene.type]
                    : i < current
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(255,255,255,0.1)",
                cursor: "pointer",
                padding: 0,
                transition: "width 0.3s, background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {current > 0 && (
            <button
              onClick={goPrev}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "8px 16px",
                color: P.textMuted,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Prev
            </button>
          )}
          {isLast ? (
            <button
              onClick={() => router.push(`/learn/${noteId}/deep`)}
              style={{
                background: `linear-gradient(135deg, ${P.amber}, #fbbf24)`,
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
                color: "#0e0700",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Explore full notes →
            </button>
          ) : (
            <button
              onClick={goNext}
              style={{
                background: P.indigoDim,
                border: `0.5px solid rgba(99,102,241,0.3)`,
                borderRadius: 8,
                padding: "8px 20px",
                color: "#a5b4fc",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Click hint — fades after first interaction */}
      {current === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "4.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 12,
            color: P.textDim,
            pointerEvents: "none",
            animation: "fadeout 3.5s 2s forwards",
          }}
        >
          <style>{`@keyframes fadeout { to { opacity: 0; } }`}</style>
          Click anywhere or use arrow keys to advance
        </div>
      )}
    </div>
  );
}
