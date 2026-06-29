"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Lenis from "lenis";
import { JOURNEY } from "@/components/cs-journey/journeyData";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

// Card start dimensions
const CARD_W    = 300;
const CARD_H    = 190;
const BR_START  = 20;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function RoadmapPage() {
  const spacerRef   = useRef<HTMLDivElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const labelRef    = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const glowRef     = useRef<HTMLDivElement>(null);
  const lenisRef    = useRef<Lenis | null>(null);
  const rafRef      = useRef<number>(0);

  const [ctaReady,  setCtaReady]  = useState(false);
  // Warm entrance veil — matches the door animation's gold white-out so there's no cut
  const [entering,  setEntering]  = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Let the page paint once with the veil fully opaque, then start fading it out
    const t = setTimeout(() => setEntering(false), 60);
    return () => clearTimeout(t);
  }, []);

  // Set initial card position before first paint so there's no flicker
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || typeof window === "undefined") return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    card.style.width        = `${CARD_W}px`;
    card.style.height       = `${CARD_H}px`;
    card.style.left         = `${(vw - CARD_W) / 2}px`;
    card.style.top          = `${(vh - CARD_H) / 2}px`;
    card.style.borderRadius = `${BR_START}px`;
    card.style.opacity      = "1";
  }, []);

  // ── Scroll-linked animation loop ──────────────────────────────────────────
  useEffect(() => {
    const spacer = spacerRef.current;
    const card   = cardRef.current;
    if (!spacer || !card) return;

    const lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
    lenisRef.current = lenis;

    let ctaSet = false;

    function frame(time: number) {
      lenis.raf(time);

      const scrollY   = lenis.scroll;
      const maxScroll = spacer!.offsetHeight - window.innerHeight;

      // Progress 0→1 completes at 80% of scroll, so user rests on full-screen roadmap
      const rawProg  = maxScroll > 0 ? clamp(scrollY / (maxScroll * 0.78), 0, 1) : 0;
      const progress = easeInOutCubic(rawProg);

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // ── Card geometry ──
      const w  = lerp(CARD_W, vw, progress);
      const h  = lerp(CARD_H, vh, progress);
      const x  = lerp((vw - CARD_W) / 2, 0, progress);
      const y  = lerp((vh - CARD_H) / 2, 0, progress);
      const br = lerp(BR_START, 0, progress);

      if (!card) return;
      card.style.width        = `${w}px`;
      card.style.height       = `${h}px`;
      card.style.left         = `${x}px`;
      card.style.top          = `${y}px`;
      card.style.borderRadius = `${br}px`;

      // Card shadow fades as it expands (full-screen has no shadow)
      const shadowOpacity = 1 - progress;
      card.style.boxShadow = progress < 0.98
        ? `0 32px 100px rgba(245,158,11,${shadowOpacity * 0.40}), 0 4px 24px rgba(245,158,11,${shadowOpacity * 0.22})`
        : "none";

      // ── Small-card label fades out early ──
      if (labelRef.current) {
        const labelOpacity = clamp(1 - rawProg * 4.5, 0, 1);
        labelRef.current.style.opacity = String(labelOpacity);
      }

      // ── Expanded content fades in after halfway ──
      if (expandedRef.current) {
        const ep = clamp((progress - 0.45) / 0.55, 0, 1);
        expandedRef.current.style.opacity      = String(ep);
        expandedRef.current.style.transform    = `translateY(${lerp(18, 0, ep)}px)`;
        expandedRef.current.style.pointerEvents = ep > 0.95 ? "all" : "none";
      }

      // ── Ambient glow shrinks as card expands (glow becomes the card) ──
      if (glowRef.current) {
        glowRef.current.style.opacity = String(1 - progress);
      }

      // ── Unlock CTA once fully expanded (single React state flip) ──
      if (!ctaSet && progress >= 0.99) {
        ctaSet = true;
        setCtaReady(true);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); lenis.destroy(); };
  }, []);

  return (
    <>
      {/* ── Scroll spacer — this is what makes the page scrollable ── */}
      <div
        ref={spacerRef}
        style={{ height: "420vh", pointerEvents: "none" }}
        aria-hidden
      />

      {/* ── Fixed scene — stays in place while page scrolls ── */}
      <div
        style={{
          position: "fixed", inset: 0,
          background: "#0e0a06",
          overflow: "hidden",
        }}
      >
        {/* Subtle ambient glow behind the card — fades as card expands */}
        <div
          ref={glowRef}
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: "60vw", height: "55vh",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(ellipse at center, rgba(245,158,11,0.14) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Warm entrance veil — same gold as the door animation's white-out.
            Starts opaque so page switch is invisible; fades to reveal the dark room. */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: entering ? 1 : 0 }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.6, 1] }}
          style={{
            position: "absolute", inset: 0, zIndex: 300, pointerEvents: "none",
            background: "radial-gradient(ellipse at 50% 50%, #fffdf5 0%, #fef3c7 40%, #fde68a 75%, #f59e0b 100%)",
          }}
        />

        {/* ── The expanding card ── */}
        <div
          ref={cardRef}
          style={{
            position: "absolute",
            overflow: "hidden",
            opacity: 0, // shown by useLayoutEffect immediately
            background: "linear-gradient(145deg, #fffdf5 0%, #fef9e7 30%, #fef3c7 60%, #fde68a 85%, #f59e0b 100%)",
            willChange: "width, height, left, top, border-radius",
          }}
        >
          {/* ── Small card label (visible only when card is compact) ── */}
          <div
            ref={labelRef}
            style={{
              position: "absolute", inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              pointerEvents: "none",
            }}
          >
            {/* Window frame lines — top */}
            <div style={{
              position: "absolute", top: 14, left: 14, right: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(146,64,14,0.25)" }} />
                ))}
              </div>
              <div style={{ width: 40, height: 1, background: "rgba(245,158,11,0.3)" }} />
            </div>

            <div
              style={{
                fontFamily: SERIF,
                fontSize: "1.55rem",
                fontWeight: 700,
                fontStyle: "italic",
                letterSpacing: "0.12em",
                color: "#92400e",
                textShadow: "0 1px 6px rgba(245,158,11,0.25)",
              }}
            >
              ROADMAP
            </div>

            <div style={{
              width: 48, height: 1.5,
              background: "linear-gradient(to right, transparent, #f59e0b, transparent)",
            }} />

            <div
              style={{
                fontFamily: SERIF,
                fontSize: "0.65rem",
                fontStyle: "italic",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(146,64,14,0.55)",
                animation: "scrollPulse 2s ease-in-out infinite",
              }}
            >
              scroll to open
            </div>

            <style>{`
              @keyframes scrollPulse {
                0%,100%{opacity:0.55}
                50%{opacity:0.9}
              }
            `}</style>
          </div>

          {/* ── Expanded roadmap (fades in as card fills screen) ── */}
          <div
            ref={expandedRef}
            style={{
              position: "absolute", inset: 0,
              opacity: 0,
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              padding: "clamp(2.5rem, 5vw, 4.5rem) clamp(2rem, 6vw, 5rem)",
              background: "linear-gradient(155deg, #fffdf5 0%, #fef9e7 35%, #fef3c7 65%, #fde68a 100%)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: "clamp(1.5rem, 3vh, 2.5rem)" }}>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: "0.72rem",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "rgba(146,64,14,0.60)",
                  fontStyle: "italic",
                  marginBottom: "0.6rem",
                }}
              >
                Your learning path
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: "clamp(2rem, 4.5vw, 4rem)",
                  fontWeight: 700,
                  fontStyle: "italic",
                  color: "#1c1008",
                  lineHeight: 1.08,
                  letterSpacing: "-0.025em",
                }}
              >
                Your CS Roadmap
              </div>
              <div style={{
                marginTop: "0.9rem",
                width: 60, height: 2.5,
                borderRadius: 2,
                background: "linear-gradient(to right, #f59e0b, #fbbf24)",
              }} />
            </div>

            {/* Chapter grid */}
            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(clamp(160px, 18vw, 220px), 1fr))",
                gap: "clamp(0.55rem, 1vw, 0.9rem)",
                alignContent: "start",
                overflow: "hidden",
              }}
            >
              {JOURNEY.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    background: "rgba(255,253,248,0.85)",
                    border: `1px solid ${ch.accent}28`,
                    borderRadius: 12,
                    padding: "clamp(9px,1.2vh,14px) clamp(11px,1.4vw,16px)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {/* Gradient dot */}
                  <div
                    style={{
                      marginTop: 3,
                      width: 10, height: 10,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: `linear-gradient(135deg, ${ch.g2}, ${ch.g3})`,
                      boxShadow: `0 0 7px ${ch.g3}88`,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: "0.62rem",
                        letterSpacing: "0.1em",
                        color: ch.accent,
                        opacity: 0.72,
                        marginBottom: 3,
                      }}
                    >
                      {ch.num}
                    </div>
                    <div
                      style={{
                        fontFamily: SERIF,
                        fontSize: "clamp(0.78rem, 1.1vw, 0.9rem)",
                        fontWeight: 700,
                        color: "#1c1008",
                        lineHeight: 1.25,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ch.title}
                    </div>
                    {/* Tags (first two only) */}
                    <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      {ch.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          style={{
                            fontFamily: MONO,
                            fontSize: "0.56rem",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: ch.accent,
                            border: `1px solid ${ch.accent}44`,
                            background: `${ch.accent}10`,
                            borderRadius: 10,
                            padding: "2px 7px",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div
              style={{
                marginTop: "clamp(1.2rem, 2.5vh, 2rem)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <p
                style={{
                  fontFamily: SERIF,
                  fontSize: "0.85rem",
                  fontStyle: "italic",
                  color: "rgba(146,64,14,0.65)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                14 chapters · Beginner to Advanced · Self-paced
              </p>
              <button
                onClick={() => ctaReady && router.push("/dashboard/study")}
                style={{
                  fontFamily: SERIF,
                  fontSize: "clamp(0.85rem, 1.2vw, 1rem)",
                  fontStyle: "italic",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "#fffdf8",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  padding: "clamp(11px,1.5vh,16px) clamp(28px,3vw,44px)",
                  borderRadius: 50,
                  cursor: ctaReady ? "pointer" : "default",
                  boxShadow: "0 6px 24px rgba(245,158,11,0.42), 0 2px 8px rgba(245,158,11,0.25)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  opacity: ctaReady ? 1 : 0.7,
                }}
                onMouseEnter={e => {
                  if (!ctaReady) return;
                  (e.currentTarget as HTMLButtonElement).style.transform    = "translateY(-2px) scale(1.02)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow    = "0 10px 32px rgba(245,158,11,0.52), 0 4px 12px rgba(245,158,11,0.30)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform    = "";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow    = "0 6px 24px rgba(245,158,11,0.42), 0 2px 8px rgba(245,158,11,0.25)";
                }}
              >
                Begin Learning →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
