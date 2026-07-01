"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Lenis from "lenis";
import { useAuth } from "@/contexts/AuthContext";
import { getTrack } from "@/lib/repo";
import { JOURNEY } from "@/components/cs-journey/journeyData";
import SideTimeline from "@/components/cs-journey/SideTimeline";
import React, { forwardRef } from "react";
import type { TrackChapter } from "@/types/schema";

// ── Constants ────────────────────────────────────────────────────────────────
const VH    = 220;
const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function mapRange(v: number, a: number, b: number, c: number, d: number) {
  return c + (d - c) * clamp((v - a) / (b - a), 0, 1);
}
function easeOut3(t: number) { return 1 - Math.pow(1 - t, 3); }

// ── Card transform ───────────────────────────────────────────────────────────
function cardCSS(offset: number): React.CSSProperties {
  const abs = Math.abs(offset);
  if (abs > 1.35) return { display: "none" };

  const x       = offset * 65;
  const rotateY = -offset * 14;
  const rotateZ = offset * 2.5;
  const scale   = 1 - abs * 0.09;
  const y       = abs * 10;
  const opacity = abs > 0.9 ? 1 - mapRange(abs, 0.9, 1.35, 0, 1) : 1;
  const shadow  = abs < 0.25
    ? "0 32px 80px rgba(120,70,20,0.22), 0 4px 16px rgba(120,70,20,0.10)"
    : "0 12px 40px rgba(120,70,20,0.10)";

  return {
    transform:     `translateX(${x}vw) translateY(${y}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
    opacity,
    boxShadow:     shadow,
    zIndex:        Math.round(10 - abs * 10),
    pointerEvents: abs < 0.1 ? "auto" : "none",
    cursor:        abs < 0.1 ? "pointer" : "default",
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TrackJourneyPage() {
  const { trackId } = useParams<{ trackId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const track = useMemo(() => (user ? getTrack(user.id, trackId) : undefined), [user, trackId]);
  const chapters = track?.chapters ?? [];
  const total = chapters.length;

  const spacerRef = useRef<HTMLDivElement>(null);
  const cardRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const bgRef     = useRef<HTMLDivElement>(null);
  const lenisRef  = useRef<Lenis | null>(null);
  const rafRef    = useRef<number>(0);

  const [activeId,    setActiveId]    = useState(0);
  const [bgGrad,      setBgGrad]      = useState("radial-gradient(ellipse 80% 60% at 50% 40%, #fde68a 0%, #fdf8f0 65%)");
  const [doorChapter, setDoorChapter] = useState<TrackChapter | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!track) router.replace("/cs-journey");
  }, [loading, user, track, router]);

  // ── Pause / resume Lenis while door animates ─────────────────────────────
  useEffect(() => {
    if (!lenisRef.current) return;
    if (doorChapter) {
      lenisRef.current.stop();
    } else {
      lenisRef.current.start();
    }
  }, [doorChapter]);

  // ── Jump to chapter ───────────────────────────────────────────────────────
  const jumpTo = useCallback((id: number) => {
    const spacer = spacerRef.current;
    if (!spacer || !lenisRef.current) return;
    const maxScroll    = spacer.offsetHeight - window.innerHeight;
    const targetScroll = (id / total) * maxScroll;
    lenisRef.current.scrollTo(targetScroll, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  }, [total]);

  // ── Handle card click ─────────────────────────────────────────────────────
  const handleCardClick = useCallback((ch: TrackChapter) => {
    setDoorChapter(ch);
  }, []);

  // ── RAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const spacer = spacerRef.current;
    if (!spacer || total === 0) return;

    const lenis = new Lenis({ lerp: 0.055, smoothWheel: true });
    lenisRef.current = lenis;

    let lastActiveId = -1;

    function frame(time: number) {
      lenis.raf(time);

      const scrollY   = lenis.scroll;
      const maxScroll = spacer!.offsetHeight - window.innerHeight;
      const rawProg   = maxScroll > 0 ? clamp((scrollY / maxScroll) * total, 0, total) : 0;

      const chId       = Math.min(total - 1, Math.floor(rawProg));
      const chProgress = rawProg - chId;

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const offset = i - rawProg;
        const style  = cardCSS(offset);
        Object.assign(el.style, {
          transform:     style.transform  ?? "",
          opacity:       String(style.opacity ?? 1),
          boxShadow:     style.boxShadow  ?? "",
          zIndex:        String(style.zIndex ?? 0),
          display:       style.display    ?? "block",
          pointerEvents: style.pointerEvents ?? "none",
          cursor:        style.cursor     ?? "default",
        });
      });

      if (bgRef.current && chapters.length > 0) {
        const ch   = chapters[chId];
        const next = chapters[Math.min(total - 1, chId + 1)];
        const t    = easeOut3(chProgress);
        bgRef.current.style.background =
          `radial-gradient(ellipse 90% 65% at 50% 35%, ${t > 0.5 ? next.g1 : ch.g1} 0%, #fdf8f0 70%)`;
      }

      if (chId !== lastActiveId) {
        lastActiveId = chId;
        setActiveId(chId);
        if (chapters[chId]) {
          setBgGrad(`radial-gradient(ellipse 90% 65% at 50% 35%, ${chapters[chId].g1} 0%, #fdf8f0 70%)`);
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); lenis.destroy(); };
  }, [total, chapters]);

  if (!track) return null;

  return (
    <>
      {/* Warm ambient background */}
      <div
        ref={bgRef}
        style={{
          position: "fixed", inset: 0, zIndex: 0,
          background: bgGrad,
          transition: "background 1s ease",
        }}
      />
      {/* Texture grain */}
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

      {/* Back to subjects */}
      <a
        href="/cs-journey"
        style={{
          position: "fixed", top: "1.25rem", left: "1.5rem", zIndex: 60,
          fontFamily: SERIF, fontSize: "0.75rem", fontStyle: "italic",
          letterSpacing: "0.1em", color: "rgba(146,64,14,0.6)",
          textDecoration: "none",
        }}
      >
        ← All subjects
      </a>

      {/* Title */}
      <div
        style={{
          position: "fixed", top: "1.25rem", left: "50%", transform: "translateX(-50%)",
          zIndex: 60, fontFamily: SERIF, fontSize: "0.78rem", fontStyle: "italic",
          letterSpacing: "0.14em", color: "rgba(146,64,14,0.55)", textTransform: "uppercase",
          pointerEvents: "none",
        }}
      >
        {track.title}
      </div>

      {/* Scroll spacer */}
      <div ref={spacerRef} style={{ height: `${total * VH}vh`, pointerEvents: "none" }} aria-hidden />

      {/* Side timeline */}
      <SideTimeline chapters={chapters} activeId={activeId} onJump={jumpTo} />

      {/* Card stage */}
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
        {chapters.map((ch, i) => (
          <ChapterCard
            key={ch.id}
            chapter={ch}
            total={total}
            art={track.id === "python-fundamentals-dsa" ? JOURNEY[i]?.art : null}
            ref={(el) => { cardRefs.current[i] = el; }}
            onCardClick={() => handleCardClick(ch)}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <ScrollHint />

      {/* Wardrobe door animation */}
      {doorChapter && (
        <DoorAnimation
          chapter={doorChapter}
          onDone={() => router.replace(`/cs-journey/${trackId}/roadmap`)}
        />
      )}
    </>
  );
}

// ── Wardrobe door animation ───────────────────────────────────────────────────
function DoorAnimation({ chapter: ch, onDone }: { chapter: TrackChapter; onDone: () => void }) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 750);
    const t2 = setTimeout(() => setPhase(2), 2550);
    const t3 = setTimeout(() => setPhase(3), 3600);
    const t4 = setTimeout(onDone, 4400);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  const open     = phase >= 1;
  const sucking  = phase >= 2;
  const whiteout = phase >= 3;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "all",
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: sucking ? 0 : 0.58 }}
        transition={{ duration: sucking ? 1 : 0.4 }}
        style={{ position: "absolute", inset: 0, background: "#1a0d05" }}
      />

      <motion.div
        initial={{ width: 440, height: 560, borderRadius: 20, scale: 0.92 }}
        animate={{
          width:        sucking ? "100vw"  : open ? "58vw"  : "50vw",
          height:       sucking ? "100vh"  : open ? "82vh"  : "72vh",
          borderRadius: sucking ? 0        : open ? 6       : 18,
          scale:        1,
        }}
        transition={{ duration: sucking ? 1.1 : 0.68, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: "relative",
          perspective: 1300,
          perspectiveOrigin: "50% 50%",
          overflow: "hidden",
          boxShadow: "0 64px 180px rgba(80,35,5,0.60), 0 10px 40px rgba(80,35,5,0.38)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: open ? 1 : 0,
            scale:   sucking ? 1.38 : 1,
          }}
          transition={{ opacity: { duration: 0.7 }, scale: { duration: 0.9, ease: [0.4, 0, 0.2, 1] } }}
          style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse 80% 80% at 50% 50%, #fffdf0 0%, ${ch.g1} 28%, ${ch.g2} 58%, ${ch.g3} 92%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{
                opacity: open ? 0.20 : 0,
                scaleY:  sucking ? 3 : 1,
              }}
              transition={{ duration: 0.9, delay: open ? 0.05 + i * 0.025 : 0 }}
              style={{
                position: "absolute",
                left: "50%", top: "50%",
                width: 1.5, height: "58%",
                background: "linear-gradient(to bottom, rgba(255,255,255,0.92), transparent)",
                transformOrigin: "50% 0%",
                transform: `translateX(-50%) rotate(${i * 18}deg)`,
              }}
            />
          ))}

          {[70, 130, 200].map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: open ? [0, 0.35, 0] : 0,
                scale:   sucking ? 2.2 : 1,
              }}
              transition={{
                opacity: { duration: 2.8, delay: open ? 0.3 + i * 0.28 : 0, repeat: Infinity },
                scale:   { duration: 1,   delay: sucking ? 0 : 0 },
              }}
              style={{
                position: "absolute",
                left: "50%", top: "50%",
                width: r * 2, height: r * 2,
                borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.55)",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            />
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: open ? (sucking ? 0.96 : 0.42) : 0 }}
            transition={{ duration: 1.0, delay: open && !sucking ? 0.55 : 0 }}
            style={{
              position: "relative",
              zIndex: 4,
              width: 130, height: 84,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 6,
              background: "linear-gradient(145deg, #fffef8 0%, #fffdf0 50%, #fef9e7 100%)",
              borderRadius: 7,
              border: "2px solid rgba(255,255,255,0.85)",
              boxShadow: [
                "0 0 0 1px rgba(245,158,11,0.25)",
                "0 0 28px rgba(255,252,230,0.90)",
                "0 0 70px rgba(245,158,11,0.35)",
                "inset 0 0 18px rgba(255,255,255,0.55)",
              ].join(", "),
            }}
          >
            <div style={{
              position: "absolute", left: "50%", top: 0, bottom: 0,
              width: 1.5,
              background: "rgba(245,158,11,0.25)",
              transform: "translateX(-50%)",
            }} />
            <div style={{
              position: "absolute", top: "50%", left: 0, right: 0,
              height: 1.5,
              background: "rgba(245,158,11,0.25)",
              transform: "translateY(-50%)",
            }} />
            <div style={{
              fontFamily: SERIF,
              fontSize: "0.80rem",
              fontWeight: 700,
              fontStyle: "italic",
              letterSpacing: "0.14em",
              color: "#92400e",
              textShadow: "0 1px 6px rgba(255,255,255,0.9)",
              position: "relative", zIndex: 1,
            }}>
              ROADMAP
            </div>
            <div style={{
              position: "relative", zIndex: 1,
              width: 30, height: 1,
              background: "linear-gradient(to right, transparent, rgba(245,158,11,0.75), transparent)",
            }} />
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ rotateY: open ? -130 : 0 }}
          transition={{ duration: 1.85, ease: [0.35, 0, 0.12, 1] }}
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: "50%",
            background: `linear-gradient(155deg, ${ch.g1} 0%, ${ch.g2} 55%, ${ch.g3} 100%)`,
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            zIndex: 2,
          }}
        >
          <div style={{ position: "absolute", inset: 11, border: "1px solid rgba(255,255,255,0.42)", borderRadius: 5 }} />
          <div style={{ position: "absolute", left: 17, right: 17, top: 17, bottom: "51%", border: "1px solid rgba(255,255,255,0.24)", borderRadius: 4 }} />
          <div style={{ position: "absolute", left: 17, right: 17, top: "53%", bottom: 17, border: "1px solid rgba(255,255,255,0.24)", borderRadius: 4 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(255,255,255,0.14), transparent 55%)" }} />
          <div style={{
            position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
            width: 17, height: 17, borderRadius: "50%",
            background: "radial-gradient(circle at 33% 33%, #fef3c7, #d97706)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.30), 0 0 14px rgba(245,158,11,0.55), inset 0 1px 2px rgba(255,255,255,0.5)",
          }} />
        </motion.div>

        <motion.div
          animate={{ rotateY: open ? 130 : 0 }}
          transition={{ duration: 1.85, ease: [0.35, 0, 0.12, 1] }}
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: "50%",
            background: `linear-gradient(205deg, ${ch.g2} 0%, ${ch.g3} 55%, ${ch.g1} 100%)`,
            transformOrigin: "right center",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            zIndex: 2,
          }}
        >
          <div style={{ position: "absolute", inset: 11, border: "1px solid rgba(255,255,255,0.42)", borderRadius: 5 }} />
          <div style={{ position: "absolute", left: 17, right: 17, top: 17, bottom: "51%", border: "1px solid rgba(255,255,255,0.24)", borderRadius: 4 }} />
          <div style={{ position: "absolute", left: 17, right: 17, top: "53%", bottom: 17, border: "1px solid rgba(255,255,255,0.24)", borderRadius: 4 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to left, rgba(255,255,255,0.12), transparent 55%)" }} />
          <div style={{
            position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
            width: 17, height: 17, borderRadius: "50%",
            background: "radial-gradient(circle at 33% 33%, #fef3c7, #d97706)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.30), 0 0 14px rgba(245,158,11,0.55), inset 0 1px 2px rgba(255,255,255,0.5)",
          }} />
        </motion.div>

        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0,
          width: 2, transform: "translateX(-50%)",
          background: "rgba(245,158,11,0.50)",
          zIndex: 3, pointerEvents: "none",
        }} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: whiteout ? 1 : 0 }}
        transition={{ duration: 0.85 }}
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at 50% 50%, #fffdf5 0%, #fef3c7 45%, #fde68a 80%, #f59e0b 100%)",
        }}
      />
    </div>
  );
}

// ── Generic art fallback (for tracks without hand-drawn illustrations) ───────
function GenericArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 400 260" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={200} cy={130} r={40 + i * 38} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.2} />
      ))}
      <circle cx={200} cy={130} r={18} fill="rgba(255,255,255,0.85)" />
      <circle cx={200} cy={130} r={18} fill="none" stroke={accent} strokeWidth={2} />
    </svg>
  );
}

// ── Chapter card ─────────────────────────────────────────────────────────────
const ChapterCard = forwardRef<
  HTMLDivElement,
  { chapter: TrackChapter; total: number; art: React.ReactNode; onCardClick: () => void }
>(function ChapterCard({ chapter: ch, total, art, onCardClick }, ref) {
  return (
    <div
      ref={ref}
      onClick={onCardClick}
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
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          height: "54%",
          background: `linear-gradient(145deg, ${ch.g1} 0%, ${ch.g2} 45%, ${ch.g3} 100%)`,
          overflow: "hidden",
        }}
      >
        {art ?? <GenericArt accent={ch.accent} />}

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
          {ch.num} / {String(total).padStart(2, "0")}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 56, right: 18,
            fontFamily: SERIF,
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.82)",
            background: "rgba(0,0,0,0.22)",
            padding: "4px 12px",
            borderRadius: 12,
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.18)",
            pointerEvents: "none",
          }}
        >
          click to enter
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: 48,
            background: "linear-gradient(to bottom, transparent, #fffdf8)",
          }}
        />
      </div>

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
});

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
