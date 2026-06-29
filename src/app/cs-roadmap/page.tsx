"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Lenis from "lenis";
import { JOURNEY } from "@/components/cs-journey/journeyData";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

const CARD_W         = 300;
const CARD_H         = 190;
const BR_START       = 20;

const EXPANSION_VH   = 420;
const PER_CHAPTER_VH = 85;
const SLOT_H         = 250;
const CONNECTOR_H    = 130;
// After all 14 chapters, scroll another CONDENSED_VH to reveal the overview
const CONDENSED_VH   = 55;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function RoadmapPage() {
  const spacerRef         = useRef<HTMLDivElement>(null);
  const cardRef           = useRef<HTMLDivElement>(null);
  const labelRef          = useRef<HTMLDivElement>(null);
  const expandedRef       = useRef<HTMLDivElement>(null);
  const glowRef           = useRef<HTMLDivElement>(null);
  const timelineTrackRef  = useRef<HTMLDivElement>(null);
  const chapterRefs       = useRef<(HTMLDivElement | null)[]>([]);
  const connectorRefs     = useRef<(SVGPathElement | null)[]>([]);
  const footerRef         = useRef<HTMLDivElement>(null);
  // Condensed overview
  const condensedRef      = useRef<HTMLDivElement>(null);
  const condensedRowRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const lenisRef          = useRef<Lenis | null>(null);
  const rafRef            = useRef<number>(0);

  const [ctaReady, setCtaReady] = useState(false);
  const [entering, setEntering] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 60);
    return () => clearTimeout(t);
  }, []);

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

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const lenis = new Lenis({ lerp: 0.055, smoothWheel: true });
    lenisRef.current = lenis;

    let ctaSet = false;

    function frame(time: number) {
      lenis.raf(time);

      const scrollY = lenis.scroll;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // ── Card expansion ──────────────────────────────────────────────────────
      const expansionZone = (EXPANSION_VH / 100 * vh - vh) * 0.78;
      const rawProg  = clamp(scrollY / expansionZone, 0, 1);
      const progress = easeInOutCubic(rawProg);

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

      const shadowAlpha = 1 - progress;
      card.style.boxShadow = progress < 0.98
        ? `0 32px 100px rgba(245,158,11,${shadowAlpha * 0.40}), 0 4px 24px rgba(245,158,11,${shadowAlpha * 0.22})`
        : "none";

      if (labelRef.current) {
        labelRef.current.style.opacity = String(clamp(1 - rawProg * 4.5, 0, 1));
      }

      if (expandedRef.current) {
        const ep = clamp((progress - 0.45) / 0.55, 0, 1);
        expandedRef.current.style.opacity       = String(ep);
        expandedRef.current.style.transform     = `translateY(${lerp(18, 0, ep)}px)`;
        expandedRef.current.style.pointerEvents = ep > 0.95 ? "all" : "none";
      }

      if (glowRef.current) {
        glowRef.current.style.opacity = String(1 - progress);
      }

      // ── Sequential timeline ──────────────────────────────────────────────────
      const chapterPx        = PER_CHAPTER_VH / 100 * vh;
      const timelineScrolled = Math.max(0, scrollY - expansionZone);
      const timelineProgress = clamp(timelineScrolled / chapterPx, 0, JOURNEY.length);

      // ── Condensed overview: triggers after chapter 14 is complete ────────────
      const timelineFullPx   = JOURNEY.length * chapterPx;
      const postScrolled     = Math.max(0, timelineScrolled - timelineFullPx);
      const condensedVhPx    = CONDENSED_VH / 100 * vh;
      const condensedProg    = clamp(postScrolled / condensedVhPx, 0, 1);

      // Fade the sequential elements out as condensed comes in
      const seqOpacity = clamp(1 - condensedProg * 1.6, 0, 1);

      if (timelineTrackRef.current) {
        const trackY = vh * 0.48 - timelineProgress * SLOT_H;
        timelineTrackRef.current.style.transform = `translateX(-50%) translateY(${trackY}px)`;
        timelineTrackRef.current.style.opacity   = String(seqOpacity);
      }

      if (footerRef.current) {
        const footerT = clamp((timelineProgress - (JOURNEY.length - 0.3)) / 0.3, 0, 1) * seqOpacity;
        footerRef.current.style.opacity       = String(footerT);
        footerRef.current.style.pointerEvents = footerT > 0.85 ? "all" : "none";
      }

      // Per-chapter timeline animations (only while sequential is visible)
      for (let i = 0; i < JOURNEY.length; i++) {
        const isLeft = i % 2 === 0;
        const localT = clamp(timelineProgress - i, 0, 1);

        const fadeT  = clamp(localT / 0.3, 0, 1);
        const blockY = lerp(14, 0, fadeT);
        const blockX = lerp(isLeft ? -18 : 18, 0, fadeT);
        let   opacity = fadeT;

        if (timelineProgress > i + 1.3) {
          const dimT = clamp((timelineProgress - i - 1.3) / 0.5, 0, 1);
          opacity = lerp(1, 0.28, dimT);
        }

        const blockEl = chapterRefs.current[i];
        if (blockEl) {
          blockEl.style.opacity   = String(opacity);
          blockEl.style.transform = `translateY(${blockY}px) translateX(${blockX}px)`;
        }

        const connEl = connectorRefs.current[i];
        if (connEl) {
          const connDraw = clamp((localT - 0.3) / 0.58, 0, 1);
          connEl.style.strokeDashoffset = String(1 - connDraw);
        }
      }

      // ── Condensed overview animations ──────────────────────────────────────
      if (condensedRef.current) {
        // Background/container fades in fast (0→0.4 of condensedProg)
        condensedRef.current.style.opacity       = String(clamp(condensedProg / 0.4, 0, 1));
        condensedRef.current.style.pointerEvents = condensedProg > 0.08 ? "all" : "none";
      }

      // Stagger each chapter row into view
      for (let i = 0; i < JOURNEY.length; i++) {
        const rowEl = condensedRowRefs.current[i];
        if (rowEl) {
          // Rows begin appearing at condensedProg 0.3, staggered by 0.04 per row
          const rowT = clamp((condensedProg - 0.3 - i * 0.04) / 0.16, 0, 1);
          rowEl.style.opacity   = String(rowT);
          rowEl.style.transform = `translateY(${lerp(10, 0, rowT)}px)`;
        }
      }

      if (!ctaSet && timelineProgress >= JOURNEY.length - 0.1) {
        ctaSet = true;
        setCtaReady(true);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); lenis.destroy(); };
  }, []);

  // Spacer: expansion + 14 chapters + condensed transition + rest buffer
  const totalSpacerH = `calc(${EXPANSION_VH}vh + ${JOURNEY.length * PER_CHAPTER_VH + CONDENSED_VH + 60}vh)`;

  return (
    <>
      <div ref={spacerRef} style={{ height: totalSpacerH, pointerEvents: "none" }} aria-hidden />

      <div style={{ position: "fixed", inset: 0, background: "#0e0a06", overflow: "hidden" }}>

        <div ref={glowRef} style={{
          position: "absolute", left: "50%", top: "50%",
          width: "60vw", height: "55vh",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse at center, rgba(245,158,11,0.14) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: entering ? 1 : 0 }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.6, 1] }}
          style={{
            position: "absolute", inset: 0, zIndex: 300, pointerEvents: "none",
            background: "radial-gradient(ellipse at 50% 50%, #fffdf5 0%, #fef3c7 40%, #fde68a 75%, #f59e0b 100%)",
          }}
        />

        {/* ── Expanding card ── */}
        <div
          ref={cardRef}
          style={{
            position: "absolute", overflow: "hidden", opacity: 0,
            background: "linear-gradient(145deg, #fffdf5 0%, #fef9e7 30%, #fef3c7 60%, #fde68a 85%, #f59e0b 100%)",
            willChange: "width, height, left, top, border-radius",
          }}
        >
          {/* Small-card label */}
          <div ref={labelRef} style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 10, pointerEvents: "none",
          }}>
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
            <div style={{
              fontFamily: SERIF, fontSize: "1.55rem", fontWeight: 700,
              fontStyle: "italic", letterSpacing: "0.12em",
              color: "#92400e", textShadow: "0 1px 6px rgba(245,158,11,0.25)",
            }}>ROADMAP</div>
            <div style={{ width: 48, height: 1.5, background: "linear-gradient(to right, transparent, #f59e0b, transparent)" }} />
            <div style={{
              fontFamily: SERIF, fontSize: "0.65rem", fontStyle: "italic",
              letterSpacing: "0.2em", textTransform: "uppercase" as const,
              color: "rgba(146,64,14,0.55)", animation: "scrollPulse 2s ease-in-out infinite",
            }}>scroll to open</div>
            <style>{`@keyframes scrollPulse { 0%,100%{opacity:0.55} 50%{opacity:0.9} }`}</style>
          </div>

          {/* ── Expanded view (contains both sequential timeline and condensed overview) ── */}
          <div ref={expandedRef} style={{
            position: "absolute", inset: 0,
            opacity: 0, pointerEvents: "none",
            background: "linear-gradient(155deg, #fffdf5 0%, #fef9e7 35%, #fef3c7 65%, #fde68a 100%)",
            overflow: "hidden",
          }}>

            {/* Sticky header — stays visible throughout sequential phase */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
              padding: "clamp(1.5rem,3vh,2.5rem) clamp(2rem,6vw,5rem) 1.6rem",
              background: "linear-gradient(to bottom, rgba(255,253,245,0.98) 60%, transparent)",
              pointerEvents: "none",
            }}>
              <div style={{
                fontFamily: SERIF, fontSize: "0.72rem", letterSpacing: "0.25em",
                textTransform: "uppercase" as const, color: "rgba(146,64,14,0.60)",
                fontStyle: "italic", marginBottom: "0.45rem",
              }}>Your learning path</div>
              <div style={{
                fontFamily: SERIF, fontSize: "clamp(1.7rem,3.5vw,3rem)",
                fontWeight: 700, fontStyle: "italic", color: "#1c1008",
                lineHeight: 1.08, letterSpacing: "-0.025em",
              }}>Your CS Roadmap</div>
              <div style={{
                marginTop: "0.65rem", width: 48, height: 2, borderRadius: 2,
                background: "linear-gradient(to right, #f59e0b, #fbbf24)",
              }} />
            </div>

            {/* Sequential timeline track */}
            <div
              ref={timelineTrackRef}
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translateX(-50%) translateY(48vh)",
                width: "min(820px, 88vw)",
                willChange: "transform, opacity",
                contain: "layout",
              }}
            >
              {JOURNEY.map((ch, i) => {
                const isLeft = i % 2 === 0;
                const curvePath = isLeft
                  ? "M 24 0 C 24 42, 76 58, 76 100"
                  : "M 76 0 C 76 42, 24 58, 24 100";

                return (
                  <div key={ch.id} style={{
                    display: "flex", flexDirection: "column",
                    alignItems: isLeft ? "flex-start" : "flex-end",
                    width: "100%",
                  }}>
                    <div
                      ref={(el: HTMLDivElement | null) => { chapterRefs.current[i] = el; }}
                      style={{
                        opacity: 0,
                        transform: `translateY(14px) translateX(${isLeft ? -18 : 18}px)`,
                        width: "47%",
                        padding: "13px 20px 15px",
                        background: "rgba(255,253,248,0.84)",
                        border: `1px solid ${ch.accent}22`,
                        borderLeft: isLeft ? `3px solid ${ch.accent}60` : `1px solid ${ch.accent}22`,
                        borderRight: isLeft ? `1px solid ${ch.accent}22` : `3px solid ${ch.accent}60`,
                        borderRadius: 12,
                        backdropFilter: "blur(8px)",
                        willChange: "opacity, transform",
                      }}
                    >
                      <div style={{
                        fontFamily: MONO, fontSize: "0.60rem",
                        letterSpacing: "0.22em", textTransform: "uppercase" as const,
                        color: ch.accent, opacity: 0.65, marginBottom: 5,
                      }}>Chapter {ch.num}</div>
                      <div style={{
                        fontFamily: SERIF, fontSize: "clamp(0.95rem,1.8vw,1.22rem)",
                        fontWeight: 700, fontStyle: "italic",
                        color: "#1c1008", lineHeight: 1.22,
                        letterSpacing: "-0.01em", marginBottom: 4,
                      }}>{ch.title}</div>
                      <div style={{
                        fontFamily: SERIF, fontSize: "0.74rem",
                        fontStyle: "italic", color: "rgba(146,64,14,0.55)",
                        lineHeight: 1.35, marginBottom: 8,
                      }}>{ch.sub}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                        {ch.tags.slice(0, 2).map(tag => (
                          <span key={tag} style={{
                            fontFamily: MONO, fontSize: "0.54rem",
                            letterSpacing: "0.07em", textTransform: "uppercase" as const,
                            color: ch.accent, border: `1px solid ${ch.accent}38`,
                            background: `${ch.accent}0c`, borderRadius: 20, padding: "2px 8px",
                          }}>{tag}</span>
                        ))}
                      </div>
                    </div>

                    {i < JOURNEY.length - 1 && (
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        width="100%"
                        height={CONNECTOR_H}
                        fill="none"
                        style={{ display: "block", overflow: "visible" }}
                      >
                        <path
                          ref={(el: SVGPathElement | null) => { connectorRefs.current[i] = el; }}
                          d={curvePath}
                          stroke="rgba(245,158,11,0.78)"
                          strokeWidth="0.6"
                          strokeLinecap="round"
                          pathLength={1}
                          style={{ strokeDasharray: "1", strokeDashoffset: "1" }}
                        />
                        <circle cx={isLeft ? 76 : 24} cy={100} r={1.2} fill="rgba(245,158,11,0.55)" />
                      </svg>
                    )}
                  </div>
                );
              })}

              {/* Timeline footer */}
              <div ref={footerRef} style={{
                opacity: 0, pointerEvents: "none",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: "1.2rem",
                paddingTop: "1rem", paddingBottom: "6rem",
                textAlign: "center" as const,
              }}>
                <div style={{
                  width: 48, height: 1.5, borderRadius: 2,
                  background: "linear-gradient(to right, transparent, #f59e0b, transparent)",
                }} />
                <p style={{
                  fontFamily: SERIF, fontSize: "0.88rem",
                  fontStyle: "italic", color: "rgba(146,64,14,0.65)",
                  margin: 0, lineHeight: 1.6,
                }}>7 parts · Beginner to Advanced · Self-paced</p>
                <button
                  onClick={() => ctaReady && router.push("/dashboard/study")}
                  style={{
                    fontFamily: SERIF, fontSize: "clamp(0.85rem,1.2vw,1rem)",
                    fontStyle: "italic", fontWeight: 700, letterSpacing: "0.04em",
                    color: "#fffdf8",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: "none",
                    padding: "clamp(11px,1.5vh,16px) clamp(28px,3vw,44px)",
                    borderRadius: 50, cursor: ctaReady ? "pointer" : "default",
                    boxShadow: "0 6px 24px rgba(245,158,11,0.42), 0 2px 8px rgba(245,158,11,0.25)",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                    opacity: ctaReady ? 1 : 0.7,
                  }}
                  onMouseEnter={e => {
                    if (!ctaReady) return;
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.transform = "translateY(-2px) scale(1.02)";
                    b.style.boxShadow = "0 10px 32px rgba(245,158,11,0.52), 0 4px 12px rgba(245,158,11,0.30)";
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.transform = "";
                    b.style.boxShadow = "0 6px 24px rgba(245,158,11,0.42), 0 2px 8px rgba(245,158,11,0.25)";
                  }}
                >Begin Learning →</button>
              </div>
            </div>

            {/* ── Condensed overview — dark overlay, slides in after chapter 14 ── */}
            <div
              ref={condensedRef}
              style={{
                position: "absolute", inset: 0, zIndex: 20,
                opacity: 0, pointerEvents: "none",
                display: "flex", flexDirection: "column",
                padding: "clamp(2rem,4vh,3.5rem) clamp(2.5rem,6vw,5rem) clamp(1.5rem,3vh,2.5rem)",
                background: "#0e0a06",
                overflow: "hidden",
              }}
            >
              {/* Condensed header */}
              <div style={{ flexShrink: 0, marginBottom: "clamp(1rem,2.5vh,1.8rem)" }}>
                <div style={{
                  fontFamily: SERIF, fontSize: "0.70rem", letterSpacing: "0.28em",
                  textTransform: "uppercase" as const,
                  color: "rgba(245,158,11,0.55)", fontStyle: "italic", marginBottom: "0.5rem",
                }}>The complete picture</div>
                <div style={{
                  fontFamily: SERIF, fontSize: "clamp(1.6rem,3vw,2.4rem)",
                  fontWeight: 700, fontStyle: "italic",
                  color: "rgba(254,249,231,0.95)", lineHeight: 1.1, letterSpacing: "-0.02em",
                }}>All {JOURNEY.length} Parts</div>
                <div style={{
                  marginTop: "0.55rem", width: 40, height: 1.5,
                  background: "linear-gradient(to right, #f59e0b, rgba(245,158,11,0.15))",
                }} />
              </div>

              {/* 2-column chapter grid */}
              <div style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.32rem 2.5rem",
                alignContent: "center",
              }}>
                {JOURNEY.map((ch, i) => (
                  <div
                    key={ch.id}
                    ref={(el: HTMLDivElement | null) => { condensedRowRefs.current[i] = el; }}
                    style={{
                      opacity: 0,
                      transform: "translateY(10px)",
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "7px 12px 7px 10px",
                      background: "rgba(255,255,255,0.03)",
                      borderLeft: `3px solid ${ch.g3}`,
                      borderRadius: "0 8px 8px 0",
                      cursor: "pointer",
                      transition: "background 0.18s ease",
                      willChange: "opacity, transform",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.07)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
                    }}
                  >
                    {/* Chapter number */}
                    <div style={{
                      fontFamily: MONO, fontSize: "0.56rem", letterSpacing: "0.15em",
                      color: "rgba(245,158,11,0.65)", flexShrink: 0, minWidth: 24,
                    }}>{ch.num}</div>

                    {/* Color pip */}
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                      background: ch.g3, opacity: 0.8,
                    }} />

                    {/* Title */}
                    <div style={{
                      fontFamily: SERIF, fontSize: "clamp(0.78rem,1.25vw,0.92rem)",
                      fontWeight: 700, fontStyle: "italic",
                      color: "rgba(254,249,231,0.9)", lineHeight: 1.2,
                      flex: 1, minWidth: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{ch.title}</div>

                    {/* First tag */}
                    <span style={{
                      fontFamily: MONO, fontSize: "0.50rem", letterSpacing: "0.06em",
                      textTransform: "uppercase" as const,
                      color: ch.g3, opacity: 0.6, flexShrink: 0,
                    }}>{ch.tags[0]}</span>
                  </div>
                ))}
              </div>

              {/* Condensed footer */}
              <div style={{
                flexShrink: 0, marginTop: "clamp(1rem,2.2vh,1.8rem)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap" as const, gap: "0.8rem",
              }}>
                <p style={{
                  fontFamily: SERIF, fontSize: "0.82rem", fontStyle: "italic",
                  color: "rgba(245,158,11,0.45)", margin: 0, lineHeight: 1.5,
                }}>7 parts · Beginner to Advanced · Self-paced</p>
                <button
                  onClick={() => router.push("/dashboard/study")}
                  style={{
                    fontFamily: SERIF, fontSize: "clamp(0.85rem,1.2vw,1rem)",
                    fontStyle: "italic", fontWeight: 700, letterSpacing: "0.04em",
                    color: "#fffdf8",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: "none",
                    padding: "clamp(10px,1.4vh,14px) clamp(24px,2.8vw,40px)",
                    borderRadius: 50, cursor: "pointer",
                    boxShadow: "0 6px 24px rgba(245,158,11,0.42), 0 2px 8px rgba(245,158,11,0.25)",
                    transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  }}
                  onMouseEnter={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.transform = "translateY(-2px) scale(1.02)";
                    b.style.boxShadow = "0 10px 32px rgba(245,158,11,0.52), 0 4px 12px rgba(245,158,11,0.30)";
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.transform = "";
                    b.style.boxShadow = "0 6px 24px rgba(245,158,11,0.42), 0 2px 8px rgba(245,158,11,0.25)";
                  }}
                >Begin Learning →</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
