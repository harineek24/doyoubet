"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import Lenis from "lenis";
import { Loader2, ExternalLink, GitBranch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTrack, getChapterFlashcards, saveChapterFlashcards } from "@/lib/repo";
import { bodyToCards } from "@/lib/store/flashcards";
import { pushFile, ensureRepo } from "@/lib/github";
import { getGithubConnection } from "@/lib/githubConnection";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Flashcard, TrackChapter } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

const CARD_W    = 300;
const CARD_H    = 190;
const BR_START  = 20;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function TrackRoadmapPage() {
  const { trackId } = useParams<{ trackId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const track = useMemo(() => (user ? getTrack(user.id, trackId) : undefined), [user, trackId]);
  const chapters = track?.chapters ?? [];

  const [readingChapter, setReadingChapter] = useState<TrackChapter | null>(null);

  const spacerRef   = useRef<HTMLDivElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const labelRef    = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const glowRef     = useRef<HTMLDivElement>(null);
  const lenisRef    = useRef<Lenis | null>(null);
  const rafRef      = useRef<number>(0);

  const [ctaReady, setCtaReady] = useState(false);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!track) router.replace("/cs-journey");
  }, [loading, user, track, router]);

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
      const rawProg  = maxScroll > 0 ? clamp(scrollY / (maxScroll * 0.78), 0, 1) : 0;
      const progress = easeInOutCubic(rawProg);

      const vw = window.innerWidth;
      const vh = window.innerHeight;

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

      const shadowOpacity = 1 - progress;
      card.style.boxShadow = progress < 0.98
        ? `0 32px 100px rgba(245,158,11,${shadowOpacity * 0.40}), 0 4px 24px rgba(245,158,11,${shadowOpacity * 0.22})`
        : "none";

      if (labelRef.current) {
        const labelOpacity = clamp(1 - rawProg * 4.5, 0, 1);
        labelRef.current.style.opacity = String(labelOpacity);
      }

      if (expandedRef.current) {
        const ep = clamp((progress - 0.45) / 0.55, 0, 1);
        expandedRef.current.style.opacity      = String(ep);
        expandedRef.current.style.transform    = `translateY(${lerp(18, 0, ep)}px)`;
        expandedRef.current.style.pointerEvents = ep > 0.95 ? "all" : "none";
      }

      if (glowRef.current) {
        glowRef.current.style.opacity = String(1 - progress);
      }

      if (!ctaSet && progress >= 0.99) {
        ctaSet = true;
        setCtaReady(true);
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); lenis.destroy(); };
  }, []);

  if (!track) return null;

  return (
    <>
      <div ref={spacerRef} style={{ height: "420vh", pointerEvents: "none" }} aria-hidden />

      <div style={{ position: "fixed", inset: 0, background: "#0e0a06", overflow: "hidden" }}>
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

        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: entering ? 1 : 0 }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.6, 1] }}
          style={{
            position: "absolute", inset: 0, zIndex: 300, pointerEvents: "none",
            background: "radial-gradient(ellipse at 50% 50%, #fffdf5 0%, #fef3c7 40%, #fde68a 75%, #f59e0b 100%)",
          }}
        />

        <div
          ref={cardRef}
          style={{
            position: "absolute",
            overflow: "hidden",
            opacity: 0,
            background: "linear-gradient(145deg, #fffdf5 0%, #fef9e7 30%, #fef3c7 60%, #fde68a 85%, #f59e0b 100%)",
            willChange: "width, height, left, top, border-radius",
          }}
        >
          <div
            ref={labelRef}
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 10, pointerEvents: "none",
            }}
          >
            <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(146,64,14,0.25)" }} />
                ))}
              </div>
              <div style={{ width: 40, height: 1, background: "rgba(245,158,11,0.3)" }} />
            </div>

            <div style={{ fontFamily: SERIF, fontSize: "1.55rem", fontWeight: 700, fontStyle: "italic", letterSpacing: "0.12em", color: "#92400e", textShadow: "0 1px 6px rgba(245,158,11,0.25)" }}>
              ROADMAP
            </div>

            <div style={{ width: 48, height: 1.5, background: "linear-gradient(to right, transparent, #f59e0b, transparent)" }} />

            <div style={{ fontFamily: SERIF, fontSize: "0.65rem", fontStyle: "italic", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(146,64,14,0.55)", animation: "scrollPulse 2s ease-in-out infinite" }}>
              scroll to open
            </div>

            <style>{`
              @keyframes scrollPulse {
                0%,100%{opacity:0.55}
                50%{opacity:0.9}
              }
            `}</style>
          </div>

          <div
            ref={expandedRef}
            style={{
              position: "absolute", inset: 0,
              opacity: 0, pointerEvents: "none",
              display: "flex", flexDirection: "column",
              background: "linear-gradient(160deg, #0a0805 0%, #0e0c08 50%, #0c0a06 100%)",
              overflow: "hidden",
            }}
          >
            <div style={{
              flexShrink: 0,
              padding: "clamp(1.6rem, 3.5vh, 2.8rem) clamp(2rem, 6vw, 5rem) clamp(1rem, 2vh, 1.6rem)",
              borderBottom: "1px solid rgba(245,158,11,0.10)",
            }}>
              <div style={{ fontFamily: SERIF, fontSize: "0.68rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(245,158,11,0.50)", fontStyle: "italic", marginBottom: "0.55rem" }}>
                Your learning path
              </div>
              <div style={{ fontFamily: SERIF, fontSize: "clamp(1.8rem, 4vw, 3.4rem)", fontWeight: 700, fontStyle: "italic", color: "rgba(254,249,231,0.94)", lineHeight: 1.06, letterSpacing: "-0.025em" }}>
                Your {track.title} Roadmap
              </div>
              <div style={{ marginTop: "0.75rem", width: 52, height: 2, borderRadius: 2, background: "linear-gradient(to right, #f59e0b, rgba(245,158,11,0.15))" }} />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
              {chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => setReadingChapter(ch)}
                  style={{
                    flex: 1, minHeight: 64,
                    display: "flex", alignItems: "center",
                    position: "relative", textAlign: "left",
                    padding: "0 clamp(2rem, 5vw, 4.5rem)",
                    gap: "clamp(1rem, 2.2vw, 2.2rem)",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.016)" : "transparent",
                    border: "none",
                    borderBottom: i < chapters.length - 1 ? "1px solid rgba(255,255,255,0.042)" : "none",
                    boxShadow: "inset 0 -5px 14px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.05)",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(to bottom, ${ch.g2}cc, ${ch.g3})` }} />

                  <div style={{ fontFamily: MONO, fontSize: "clamp(0.6rem, 0.9vw, 0.72rem)", letterSpacing: "0.22em", color: "rgba(245,158,11,0.42)", flexShrink: 0, minWidth: 28 }}>
                    {ch.num}
                  </div>

                  <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: ch.g3, boxShadow: `0 0 9px ${ch.g3}90` }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SERIF, fontWeight: 700, fontStyle: "italic", fontSize: "clamp(0.95rem, 1.9vw, 1.42rem)", color: "rgba(254,249,231,0.92)", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                      {ch.title}
                    </div>
                    <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(0.62rem, 0.85vw, 0.74rem)", color: "rgba(255,255,255,0.22)", marginTop: 2, lineHeight: 1.2 }}>
                      {ch.sub}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 5, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {ch.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{
                        fontFamily: MONO, fontSize: "clamp(0.45rem, 0.72vw, 0.56rem)",
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: ch.g3, border: `1px solid ${ch.g3}48`, background: `${ch.g3}16`,
                        borderRadius: 20, padding: "2px 8px",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <div style={{
              flexShrink: 0,
              padding: "clamp(0.8rem, 1.6vh, 1.3rem) clamp(2rem, 6vw, 5rem)",
              borderTop: "1px solid rgba(245,158,11,0.09)",
              background: "rgba(0,0,0,0.22)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: "1rem",
            }}>
              <p style={{ fontFamily: SERIF, fontSize: "0.82rem", fontStyle: "italic", color: "rgba(245,158,11,0.42)", margin: 0, lineHeight: 1.5 }}>
                {chapters.length} parts · Click any row to read it · Self-paced
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

      <AnimatePresence>
        {readingChapter && (
          <FlashcardViewer key={readingChapter.id} chapter={readingChapter} trackId={trackId} rawNotes={track.rawNotes ?? undefined} onClose={() => setReadingChapter(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

interface CFProblem { id: string; name: string; rating?: number; tags: string[]; url: string; solvedCount: number; }

function FlashcardViewer({ chapter: ch, trackId, rawNotes, onClose }: {
  chapter: TrackChapter;
  trackId: string;
  rawNotes?: string;
  onClose: () => void;
}) {
  const { user } = useAuth();

  // ── Flashcards (lazy-loaded) ───────────────────────────────────────────────
  const [cards, setCards]             = useState<Flashcard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [idx, setIdx]                 = useState(0);
  const [flipped, setFlipped]         = useState(false);

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"cards" | "notes" | "practice">("cards");

  // ── Practice ───────────────────────────────────────────────────────────────
  const [problems, setProblems]           = useState<CFProblem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [activeProblem, setActiveProblem] = useState<CFProblem | null>(null);
  const [code, setCode]                   = useState("# Write your solution here\n");
  const [running, setRunning]             = useState(false);
  const [runOutput, setRunOutput]         = useState<string | null>(null);
  const [pushing, setPushing]             = useState(false);
  const [pushUrl, setPushUrl]             = useState<string | null>(null);

  // ── Load flashcards ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingCards(true);

    // 1. Check localStorage cache first
    const cached = getChapterFlashcards(trackId, ch.id);
    if (cached.length > 0) {
      setCards(cached);
      setLoadingCards(false);
      return;
    }

    // 2. Check if chapter already has flashcards embedded (older AI-generated tracks)
    const embedded = ch.flashcards && ch.flashcards.length > 0
      ? ch.flashcards
      : ch.body ? bodyToCards(ch.title, ch.sub, ch.body) : [];
    if (embedded.length > 0) {
      setCards(embedded);
      saveChapterFlashcards(trackId, ch.id, embedded);
      setLoadingCards(false);
      return;
    }

    // 3. Generate via Groq
    fetch("/api/tracks/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: ch.title, sub: ch.sub, desc: ch.desc, tags: ch.tags, notes: rawNotes }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.flashcards?.length) {
          setCards(d.flashcards);
          saveChapterFlashcards(trackId, ch.id, d.flashcards);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, [user, trackId, ch.id]);

  // ── Load Codeforces problems when Practice tab opens ──────────────────────
  useEffect(() => {
    if (tab !== "practice" || problems.length > 0 || loadingProblems) return;
    setLoadingProblems(true);
    fetch(`/api/practice/problems?tags=${ch.tags.join(",")}`)
      .then((r) => r.json())
      .then((d) => setProblems(d.problems ?? []))
      .catch(() => {})
      .finally(() => setLoadingProblems(false));
  }, [tab]);

  const card = cards[idx];
  function next() { setIdx((i) => Math.min(i + 1, cards.length - 1)); setFlipped(false); }
  function prev() { setIdx((i) => Math.max(i - 1, 0)); setFlipped(false); }

  async function runCode() {
    setRunning(true);
    setRunOutput(null);
    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python", code }),
      });
      const d = await res.json();
      setRunOutput(d.stdout || d.stderr || "No output.");
    } catch {
      setRunOutput("Run failed.");
    } finally {
      setRunning(false);
    }
  }

  async function pushToGithub() {
    if (!user) return;
    setPushing(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const conn = supabase ? await getGithubConnection(supabase, user.id) : null;
      if (!conn?.accessToken) { alert("Connect GitHub in Settings first."); return; }

      const repoName = "devquest-submissions";
      const repoFull = conn.repoFullName ?? await ensureRepo(conn.accessToken, repoName);

      const notesContent = cards.map((c) => `## ${c.question}\n\n${c.answer}`).join("\n\n---\n\n");
      const problemNote = activeProblem ? `\n\n## Practice Problem\n[${activeProblem.name}](${activeProblem.url})\n` : "";

      await pushFile(conn.accessToken, repoFull, `chapters/${trackId}/${ch.id}/notes.md`,
        `# ${ch.title}\n\n${notesContent}${problemNote}`,
        `Add notes: ${ch.title}`);

      if (activeProblem && code.trim()) {
        const { htmlUrl } = await pushFile(conn.accessToken, repoFull,
          `chapters/${trackId}/${ch.id}/${activeProblem.id}_solution.py`,
          code, `Add solution: ${activeProblem.name}`);
        setPushUrl(htmlUrl);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPushing(false);
    }
  }

  const TABS = [
    { key: "cards",    label: loadingCards ? "Loading…" : `Flashcards (${cards.length})` },
    { key: "notes",    label: "All Notes" },
    { key: "practice", label: "Practice" },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(10,8,5,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(740px, 100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", borderRadius: 20, background: "#fffdf8", border: `1px solid ${ch.accent}33`, overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ padding: "1.2rem 1.6rem 0", flexShrink: 0 }}>
          <p style={{ fontFamily: SERIF, fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: ch.accent, fontStyle: "italic", margin: 0 }}>
            {ch.num} · {ch.sub}
          </p>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.35rem", fontWeight: 700, color: "#1c1008", margin: "0.2rem 0 0.8rem" }}>
            {ch.title}
          </h2>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(146,64,14,0.15)" }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key as typeof tab)} style={{
                fontFamily: SERIF, fontStyle: "italic", fontSize: "0.8rem", padding: "0.4rem 1rem",
                background: "none", border: "none", cursor: "pointer", marginBottom: -1,
                borderBottom: tab === key ? `2px solid ${ch.accent}` : "2px solid transparent",
                color: tab === key ? ch.accent : "rgba(92,61,46,0.45)",
                fontWeight: tab === key ? 700 : 400,
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.6rem 1.4rem" }}>

          {/* ── Flashcards ── */}
          {tab === "cards" && (
            loadingCards
              ? <div style={{ display: "flex", justifyContent: "center", paddingTop: "2rem" }}><Loader2 className="h-5 w-5 animate-spin" style={{ color: ch.accent }} /></div>
              : card
                ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.1rem" }}>
                    <div onClick={() => setFlipped((f) => !f)} style={{ width: "100%", minHeight: 180, perspective: 900, cursor: "pointer" }}>
                      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45, ease: "easeInOut" }} style={{ position: "relative", width: "100%", minHeight: 180, transformStyle: "preserve-3d" }}>
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 14, background: `linear-gradient(145deg, ${ch.g1}, ${ch.g2})`, border: `1px solid ${ch.accent}33`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.4rem 2rem", textAlign: "center", minHeight: 180 }}>
                          <p style={{ fontFamily: SERIF, fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: ch.accent, opacity: 0.7, margin: "0 0 0.8rem" }}>
                            {idx + 1} of {cards.length} · tap to reveal
                          </p>
                          <p style={{ fontFamily: SERIF, fontSize: "clamp(1rem,2.2vw,1.25rem)", fontWeight: 700, color: "#1c1008", lineHeight: 1.4, margin: 0 }}>
                            {card.question}
                          </p>
                        </div>
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 14, background: "#fffdf8", border: `1px solid ${ch.accent}55`, padding: "1.4rem 2rem", minHeight: 180, overflowY: "auto" }}>
                          <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "0.88rem", color: ch.accent, marginBottom: "0.45rem" }}>{card.question}</p>
                          <p style={{ fontFamily: SERIF, fontSize: "0.9rem", color: "#3c2a1e", lineHeight: 1.65, margin: 0 }}>{card.answer}</p>
                        </div>
                      </motion.div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <button onClick={prev} disabled={idx === 0} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.8rem", color: ch.accent, background: "none", border: `1px solid ${ch.accent}44`, borderRadius: 20, padding: "5px 14px", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}>← Prev</button>
                      <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.75rem", color: "rgba(92,61,46,0.5)" }}>{idx + 1} / {cards.length}</span>
                      <button onClick={next} disabled={idx === cards.length - 1} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.8rem", color: ch.accent, background: "none", border: `1px solid ${ch.accent}44`, borderRadius: 20, padding: "5px 14px", cursor: idx === cards.length - 1 ? "default" : "pointer", opacity: idx === cards.length - 1 ? 0.3 : 1 }}>Next →</button>
                    </div>
                  </div>
                : <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "rgba(92,61,46,0.45)", textAlign: "center", paddingTop: "2rem" }}>No flashcards yet.</p>
          )}

          {/* ── All Notes ── */}
          {tab === "notes" && (
            <div style={{ fontFamily: SERIF, fontSize: "0.9rem", color: "#3c2a1e", lineHeight: 1.75 }}>
              {cards.length === 0 && <p style={{ fontStyle: "italic", opacity: 0.45 }}>Notes appear here once flashcards are loaded.</p>}
              {cards.map((c, i) => (
                <div key={c.id} style={{ marginBottom: "1.4rem", paddingBottom: "1.4rem", borderBottom: i < cards.length - 1 ? "1px solid rgba(146,64,14,0.1)" : "none" }}>
                  <p style={{ fontWeight: 700, color: "#1c1008", margin: "0 0 0.35rem", fontSize: "0.93rem" }}>{c.question}</p>
                  <p style={{ margin: 0 }}>{c.answer}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Practice ── */}
          {tab === "practice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Problem list */}
              {loadingProblems && <div style={{ display: "flex", justifyContent: "center" }}><Loader2 className="h-5 w-5 animate-spin" style={{ color: ch.accent }} /></div>}
              {!loadingProblems && problems.length === 0 && (
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "rgba(92,61,46,0.45)" }}>
                  No Codeforces problems found for these tags ({ch.tags.join(", ")}).
                </p>
              )}
              {problems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.72rem", color: "rgba(92,61,46,0.5)", margin: 0 }}>
                    Codeforces problems · tags: {ch.tags.join(", ")} · click to load in IDE
                  </p>
                  {problems.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setActiveProblem(p); setCode("# Write your solution here\n"); setRunOutput(null); setPushUrl(null); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: 10,
                        background: activeProblem?.id === p.id ? `${ch.g1}` : "rgba(245,158,11,0.05)",
                        border: `1px solid ${activeProblem?.id === p.id ? ch.accent : "rgba(245,158,11,0.2)"}`,
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div>
                        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "0.88rem", color: "#1c1008" }}>{p.name}</span>
                        <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "rgba(92,61,46,0.5)", marginLeft: 8 }}>{p.rating} pts · {p.solvedCount.toLocaleString()} solved</span>
                      </div>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: ch.accent, flexShrink: 0, marginLeft: 8 }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </button>
                  ))}
                </div>
              )}

              {/* IDE */}
              {activeProblem && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: ch.accent }}>
                      {activeProblem.name}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={runCode} disabled={running} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: "0.75rem", color: "#fffdf8", background: ch.accent, border: "none", borderRadius: 8, padding: "5px 12px", cursor: running ? "default" : "pointer", opacity: running ? 0.6 : 1 }}>
                        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : "▶"} Run
                      </button>
                      <button onClick={pushToGithub} disabled={pushing} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: "0.75rem", color: ch.accent, background: "none", border: `1px solid ${ch.accent}55`, borderRadius: 8, padding: "5px 12px", cursor: pushing ? "default" : "pointer", opacity: pushing ? 0.6 : 1 }}>
                        {pushing ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitBranch className="h-3 w-3" />} Push
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    rows={10}
                    spellCheck={false}
                    style={{ fontFamily: MONO, fontSize: "0.82rem", background: "#0e0a06", color: "#fde68a", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", resize: "vertical", outline: "none", lineHeight: 1.6 }}
                  />
                  {runOutput !== null && (
                    <pre style={{ fontFamily: MONO, fontSize: "0.78rem", background: "#0e0a06", color: "#86efac", padding: "8px 12px", borderRadius: 8, margin: 0, overflowX: "auto", maxHeight: 120, overflowY: "auto" }}>
                      {runOutput}
                    </pre>
                  )}
                  {pushUrl && (
                    <p style={{ fontFamily: SERIF, fontSize: "0.78rem", color: ch.accent, margin: 0 }}>
                      ✓ Pushed! <a href={pushUrl} target="_blank" rel="noopener noreferrer" style={{ color: ch.accent }}>View on GitHub →</a>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: "0.65rem 1.6rem", borderTop: "1px solid rgba(146,64,14,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.7rem", color: "rgba(92,61,46,0.38)" }}>
            {cards.length} flashcard{cards.length !== 1 ? "s" : ""} · {ch.tags.join(", ")}
          </span>
          <button onClick={onClose} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: ch.accent, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            ← Back to roadmap
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
