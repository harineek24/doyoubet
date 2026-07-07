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

          {/* ── Expanded roadmap — wardrobe/dark view ── */}
          <div
            ref={expandedRef}
            style={{
              position: "absolute", inset: 0,
              opacity: 0,
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(160deg, #0a0805 0%, #0e0c08 50%, #0c0a06 100%)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              flexShrink: 0,
              padding: "clamp(1.6rem, 3.5vh, 2.8rem) clamp(2rem, 6vw, 5rem) clamp(1rem, 2vh, 1.6rem)",
              borderBottom: "1px solid rgba(245,158,11,0.10)",
            }}>
              <div style={{
                fontFamily: SERIF, fontSize: "0.68rem",
                letterSpacing: "0.28em", textTransform: "uppercase",
                color: "rgba(245,158,11,0.50)", fontStyle: "italic",
                marginBottom: "0.55rem",
              }}>
                Your learning path
              </div>
              <div style={{
                fontFamily: SERIF, fontSize: "clamp(1.8rem, 4vw, 3.4rem)",
                fontWeight: 700, fontStyle: "italic",
                color: "rgba(254,249,231,0.94)", lineHeight: 1.06,
                letterSpacing: "-0.025em",
              }}>
                Your Python Roadmap
              </div>
              <div style={{
                marginTop: "0.75rem", width: 52, height: 2, borderRadius: 2,
                background: "linear-gradient(to right, #f59e0b, rgba(245,158,11,0.15))",
              }} />
            </div>

            {/* Stacked wardrobe shelves */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {JOURNEY.map((ch, i) => (
                <div
                  key={ch.id}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                    padding: "0 clamp(2rem, 5vw, 4.5rem)",
                    gap: "clamp(1rem, 2.2vw, 2.2rem)",
                    background: i % 2 === 0
                      ? "rgba(255,255,255,0.016)"
                      : "transparent",
                    borderBottom: i < JOURNEY.length - 1
                      ? "1px solid rgba(255,255,255,0.042)"
                      : "none",
                    /* depth: bottom shadow makes each shelf look stacked on the one below */
                    boxShadow: "inset 0 -5px 14px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.05)",
                    overflow: "hidden",
                  }}
                >
                  {/* Left colour tab — like the fabric label peeking out of folded clothes */}
                  <div style={{
                    position: "absolute",
                    left: 0, top: 0, bottom: 0,
                    width: 4,
                    background: `linear-gradient(to bottom, ${ch.g2}cc, ${ch.g3})`,
                  }} />

                  {/* Chapter number */}
                  <div style={{
                    fontFamily: MONO, fontSize: "clamp(0.6rem, 0.9vw, 0.72rem)",
                    letterSpacing: "0.22em", color: "rgba(245,158,11,0.42)",
                    flexShrink: 0, minWidth: 28,
                  }}>
                    {ch.num}
                  </div>

                  {/* Glowing pip */}
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: ch.g3,
                    boxShadow: `0 0 9px ${ch.g3}90`,
                  }} />

                  {/* Title + subtitle */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: SERIF, fontWeight: 700, fontStyle: "italic",
                      fontSize: "clamp(0.95rem, 1.9vw, 1.42rem)",
                      color: "rgba(254,249,231,0.92)",
                      letterSpacing: "-0.01em", lineHeight: 1.15,
                    }}>
                      {ch.title}
                    </div>
                    <div style={{
                      fontFamily: SERIF, fontStyle: "italic",
                      fontSize: "clamp(0.62rem, 0.85vw, 0.74rem)",
                      color: "rgba(255,255,255,0.22)",
                      marginTop: 2, lineHeight: 1.2,
                    }}>
                      {ch.sub}
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{
                    display: "flex", gap: 5, flexShrink: 0,
                    flexWrap: "wrap", justifyContent: "flex-end",
                  }}>
                    {ch.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{
                        fontFamily: MONO,
                        fontSize: "clamp(0.45rem, 0.72vw, 0.56rem)",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: ch.g3,
                        border: `1px solid ${ch.g3}48`,
                        background: `${ch.g3}16`,
                        borderRadius: 20, padding: "2px 8px",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div style={{
              flexShrink: 0,
              padding: "clamp(0.8rem, 1.6vh, 1.3rem) clamp(2rem, 6vw, 5rem)",
              borderTop: "1px solid rgba(245,158,11,0.09)",
              background: "rgba(0,0,0,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}>
              <p style={{
                fontFamily: SERIF, fontSize: "0.82rem",
                fontStyle: "italic", color: "rgba(245,158,11,0.42)",
                margin: 0, lineHeight: 1.5,
              }}>
                {JOURNEY.length} parts · Beginner to Advanced · Self-paced
              </p>
              <button
                onClick={() => ctaReady && router.push("/dashboard/study")}
                style={{
                  fontFamily: SERIF,
                  fontSize: "clamp(0.85rem, 1.2vw, 1rem)",
                  fontStyle: "italic", fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "#fffdf8",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  padding: "clamp(10px,1.4vh,14px) clamp(26px,3vw,42px)",
                  borderRadius: 50,
                  cursor: ctaReady ? "pointer" : "default",
                  boxShadow: "0 6px 24px rgba(245,158,11,0.42), 0 2px 8px rgba(245,158,11,0.25)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  opacity: ctaReady ? 1 : 0.7,
                }}
                onMouseEnter={e => {
                  if (!ctaReady) return;
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px) scale(1.02)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 10px 32px rgba(245,158,11,0.52), 0 4px 12px rgba(245,158,11,0.30)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(245,158,11,0.42), 0 2px 8px rgba(245,158,11,0.25)";
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
