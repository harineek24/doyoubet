"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ChapterPhase2Section } from "@/lib/db/chapters";

const C = {
  bg: "#080d18",
  surface: "#0e1525",
  border: "rgba(255,255,255,0.08)",
  amber: "#f59e0b",
  text: "#e2e8f8",
  textMuted: "#6b7fa8",
  textDim: "#2d3f60",
};

function renderContent(content: string) {
  return content.split(/\n\n+/).filter(Boolean).map((para, i) => (
    <p key={i} style={{ margin: "0 0 1.1rem", whiteSpace: "pre-wrap" }}>
      {para}
    </p>
  ));
}

export function CompareView({
  sections,
  title,
  onBack,
}: {
  sections: ChapterPhase2Section[];
  title: string;
  onBack: () => void;
}) {
  const [splitPct, setSplitPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.min(80, Math.max(20, pct)));
  }, []);

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [onPointerMove, stopDragging]);

  function startDragging() {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <div style={{ height: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "var(--font-geist-sans, system-ui, sans-serif)" }}>
      <div
        style={{
          flexShrink: 0,
          padding: "1rem clamp(1.5rem,5vw,4rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `0.5px solid ${C.border}`,
          background: "rgba(8,13,24,0.9)",
          backdropFilter: "blur(16px)",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}
        >
          ← Back to flashcards
        </button>
        <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>{title} — Compare</span>
        <span style={{ fontSize: 12, color: C.textDim }}>drag divider to resize</span>
      </div>

      <div ref={containerRef} style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Original — left pane */}
        <div
          style={{
            width: `${splitPct}%`,
            overflowY: "auto",
            padding: "clamp(2rem,4vw,3.5rem)",
            borderRight: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
            Your notes
          </div>
          {sections.map((s, i) => (
            <div key={i} style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: i < sections.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "0.95rem", color: C.text, lineHeight: 1.85 }}>
                {s.display_mode === "code" ? (
                  <pre style={{ margin: 0, fontFamily: "var(--font-geist-mono, monospace)", fontSize: 13, whiteSpace: "pre-wrap", color: "#67e8f9" }}>
                    {s.original_content.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "")}
                  </pre>
                ) : (
                  renderContent(s.original_content)
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Draggable divider */}
        <div
          onPointerDown={startDragging}
          style={{
            width: 6,
            marginLeft: -3,
            marginRight: -3,
            cursor: "col-resize",
            position: "relative",
            zIndex: 10,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 2, height: "100%", background: C.border }} />
          <div
            style={{
              position: "absolute",
              width: 4,
              height: 44,
              borderRadius: 4,
              background: C.amber,
              opacity: 0.5,
            }}
          />
        </div>

        {/* Enhanced — right pane */}
        <div
          style={{
            width: `${100 - splitPct}%`,
            overflowY: "auto",
            padding: "clamp(2rem,4vw,3.5rem)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
            Enhanced
          </div>
          {sections.map((s, i) => (
            <div key={i} style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: i < sections.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: "0.95rem", color: C.text, lineHeight: 1.85 }}>
                {s.display_mode === "code" ? (
                  <pre style={{ margin: 0, fontFamily: "var(--font-geist-mono, monospace)", fontSize: 13, whiteSpace: "pre-wrap", color: "#67e8f9" }}>
                    {s.enhanced_content.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "")}
                  </pre>
                ) : (
                  renderContent(s.enhanced_content)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
