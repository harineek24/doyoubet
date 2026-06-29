"use client";

import { useEffect, useRef, useCallback } from "react";
import Lenis from "lenis";
import { JOURNEY } from "@/components/cs-journey/journeyData";
import SideTimeline from "@/components/cs-journey/SideTimeline";
import { useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const VH   = 220;           // vh of scroll space per chapter
const TOTAL = JOURNEY.length;
const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function mapRange(v: number, a: number, b: number, c: number, d: number) {
  return c + (d - c) * clamp((v - a) / (b - a), 0, 1);
}
function easeOut3(t: number) { return 1 - Math.pow(1 - t, 3); }

// ── Card transform ───────────────────────────────────────────────────────────
// offset: 0 = centred, +1 = one chapter to the right, -1 = behind
function cardCSS(offset: number): React.CSSProperties {
  const abs = Math.abs(offset);
  if (abs > 1.35) return { display: "none" };

  const x        = offset * 65;          // vw — amount to push left/right
  const rotateY  = -offset * 14;         // 3D page-flip
  const rotateZ  = offset * 2.5;         // slight tilt, like a falling leaf
  const scale    = 1 - abs * 0.09;
  const y        = abs * 10;             // cards drop slightly when off-centre
  const opacity  = abs > 0.9 ? 1 - mapRange(abs, 0.9, 1.35, 0, 1) : 1;
  const shadow   = abs < 0.25
    ? "0 32px 80px rgba(120,70,20,0.22), 0 4px 16px rgba(120,70,20,0.10)"
    : "0 12px 40px rgba(120,70,20,0.10)";

  return {
    transform: `translateX(${x}vw) translateY(${y}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
    opacity,
    boxShadow: shadow,
    zIndex: Math.round(10 - abs * 10),
    pointerEvents: abs < 0.1 ? "auto" : "none",
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CSJourneyPage() {
  const spacerRef   = useRef<HTMLDivElement>(null);
  const cardRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const bgRef       = useRef<HTMLDivElement>(null);
  const lenisRef    = useRef<Lenis | null>(null);
  const rafRef      = useRef<number>(0);
  const progressRef = useRef(0);          // smooth Lenis progress (0 → TOTAL)
  const [activeId, setActiveId]   = useState(0);
  const [bgGrad,   setBgGrad]     = useState(`radial-gradient(ellipse 80% 60% at 50% 40%, ${JOURNEY[0].g1} 0%, #fdf8f0 65%)`);

  // ── Jump to chapter (from sidebar) ────────────────────────────────────────
  const jumpTo = useCallback((id: number) => {
    const spacer = spacerRef.current;
    if (!spacer || !lenisRef.current) return;
    const maxScroll = spacer.offsetHeight - window.innerHeight;
    const targetScroll = (id / TOTAL) * maxScroll;
    lenisRef.current.scrollTo(targetScroll, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  }, []);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const spacer = spacerRef.current;
    if (!spacer) return;

    const lenis = new Lenis({ lerp: 0.055, smoothWheel: true });
    lenisRef.current = lenis;

    let lastActiveId = -1;

    function frame(time: number) {
      lenis.raf(time);

      const scrollY    = lenis.scroll;
      const maxScroll  = spacer!.offsetHeight - window.innerHeight;
      const rawProg    = maxScroll > 0 ? clamp((scrollY / maxScroll) * TOTAL, 0, TOTAL) : 0;
      progressRef.current = rawProg;

      const chId       = Math.min(TOTAL - 1, Math.floor(rawProg));
      const chProgress = rawProg - chId; // 0..1 within chapter

      // Update card transforms
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const offset = i - rawProg;
        const style  = cardCSS(offset);
        Object.assign(el.style, {
          transform: style.transform ?? "",
          opacity:   String(style.opacity ?? 1),
          boxShadow: style.boxShadow ?? "",
          zIndex:    String(style.zIndex ?? 0),
          display:   style.display ?? "block",
          pointerEvents: style.pointerEvents ?? "none",
        });
      });

      // Update ambient background gradient
      if (bgRef.current) {
        const ch   = JOURNEY[chId];
        const next = JOURNEY[Math.min(TOTAL - 1, chId + 1)];
        const t    = easeOut3(chProgress);
        // Interpolate between current and next chapter's primary gradient colour
        bgRef.current.style.background =
          `radial-gradient(ellipse 90% 65% at 50% 35%, ${t > 0.5 ? next.g1 : ch.g1} 0%, #fdf8f0 70%)`;
      }

      // Update React state (throttled to chapter changes only)
      if (chId !== lastActiveId) {
        lastActiveId = chId;
        setActiveId(chId);
        setBgGrad(`radial-gradient(ellipse 90% 65% at 50% 35%, ${JOURNEY[chId].g1} 0%, #fdf8f0 70%)`);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); lenis.destroy(); };
  }, []);

  return (
    <>
      {/* ── Warm ambient background ── */}
      <div
        ref={bgRef}
        style={{
          position: "fixed", inset: 0, zIndex: 0,
          background: bgGrad,
          transition: "background 1s ease",
        }}
      />
      {/* Subtle texture grain */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "160px",
          opacity: 0.6,
          mixBlendMode: "multiply",
        }}
      />

      {/* ── Scroll spacer ── */}
      <div ref={spacerRef} style={{ height: `${TOTAL * VH}vh`, pointerEvents: "none" }} aria-hidden />

      {/* ── Side timeline ── */}
      <SideTimeline activeId={activeId} onJump={jumpTo} />

      {/* ── Card stage — perspective container ── */}
      <div
        style={{
          position: "fixed",
          top: 0, bottom: 0,
          left: 200, right: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: "1400px",
          perspectiveOrigin: "50% 50%",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {JOURNEY.map((ch, i) => (
          <ChapterCard
            key={ch.id}
            chapter={ch}
            ref={(el) => { cardRefs.current[i] = el; }}
          />
        ))}
      </div>

      {/* ── Scroll hint (fades on first scroll) ── */}
      <ScrollHint />
    </>
  );
}

// ── Chapter card ─────────────────────────────────────────────────────────────
import React, { forwardRef } from "react";
import type { JourneyChapter } from "@/components/cs-journey/journeyData";

const ChapterCard = forwardRef<HTMLDivElement, { chapter: JourneyChapter }>(
  function ChapterCard({ chapter: ch }, ref) {
    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          width:  "min(440px, 82%)",
          height: "min(560px, 82vh)",
          borderRadius: 20,
          overflow: "hidden",
          background: "#fffdf8",
          border: "1px solid rgba(245,158,11,0.18)",
          willChange: "transform, opacity",
          transformOrigin: "center bottom",
          cursor: "default",
          userSelect: "none",
        }}
      >
        {/* ── Visual section (top 54%) ── */}
        <div
          style={{
            position: "relative",
            height: "54%",
            background: `linear-gradient(145deg, ${ch.g1} 0%, ${ch.g2} 45%, ${ch.g3} 100%)`,
            overflow: "hidden",
          }}
        >
          {/* SVG art overlay */}
          {ch.art}

          {/* Chapter number badge */}
          <div
            style={{
              position: "absolute",
              top: 16, left: 18,
              fontFamily: SERIF,
              fontSize: "0.9rem",
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.95)",
              fontStyle: "italic",
              fontWeight: 700,
              background: "rgba(0,0,0,0.30)",
              padding: "5px 14px",
              borderRadius: 20,
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            {ch.num} / 14
          </div>

          {/* Soft bottom fade into text area */}
          <div
            style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              height: 48,
              background: "linear-gradient(to bottom, transparent, #fffdf8)",
            }}
          />
        </div>

        {/* ── Text section (bottom 46%) ── */}
        <div
          style={{
            height: "46%",
            padding: "18px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "#fffdf8",
          }}
        >
          {/* Subtitle */}
          <span
            style={{
              fontFamily: SERIF,
              fontSize: "0.78rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: ch.accent,
              fontStyle: "italic",
              opacity: 0.9,
            }}
          >
            {ch.sub}
          </span>

          {/* Title */}
          <div
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(1.35rem, 2.8vw, 1.85rem)",
              fontWeight: 700,
              color: "#1c1008",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            {ch.title}
          </div>

          {/* Description */}
          <p
            style={{
              fontFamily: SERIF,
              fontSize: "0.85rem",
              color: "#5c3d2e",
              lineHeight: 1.55,
              margin: 0,
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontStyle: "italic",
            }}
          >
            {ch.desc}
          </p>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ch.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.08em",
                  color: ch.accent,
                  border: `1px solid ${ch.accent}66`,
                  background: `${ch.accent}12`,
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontFamily: "var(--font-geist-mono, 'Courier New', monospace)",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

// ── Scroll hint ───────────────────────────────────────────────────────────────
function ScrollHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = () => setVisible(false);
    window.addEventListener("scroll", hide, { once: true, passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2.5rem",
        left: "calc(200px + (100vw - 200px) / 2)",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        pointerEvents: "none",
        animation: "scrollHintFloat 2.8s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes scrollHintFloat {
          0%,100%{opacity:.75;transform:translateX(-50%) translateY(0)}
          50%{opacity:1;transform:translateX(-50%) translateY(7px)}
        }
      `}</style>
      <div
        style={{
          width: 1.5, height: 40,
          background: "linear-gradient(to bottom, #f59e0b, rgba(245,158,11,0))",
        }}
      />
      <span
        style={{
          fontFamily: SERIF,
          fontSize: "0.82rem",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          fontStyle: "italic",
          color: "#92400e",
          fontWeight: 600,
        }}
      >
        scroll
      </span>
    </div>
  );
}
