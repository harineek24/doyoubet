"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ExternalLink, GitBranch, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getTrack, getChapterFlashcards, saveChapterFlashcards } from "@/lib/repo";
import { pushFile, ensureRepo } from "@/lib/github";
import { getGithubConnection } from "@/lib/githubConnection";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Flashcard, TrackChapter } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

interface CFProblem {
  id: string; name: string; rating?: number;
  tags: string[]; url: string; solvedCount: number;
}

export default function ChapterStudyPage() {
  const { trackId, chapterId } = useParams<{ trackId: string; chapterId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  const track   = useMemo(() => (user ? getTrack(user.id, trackId) : undefined), [user, trackId]);
  const chapter = useMemo(() => track?.chapters.find((c) => c.id === chapterId), [track, chapterId]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (track && !chapter) router.replace(`/cs-journey/${trackId}`);
  }, [loading, user, track, chapter, router, trackId]);

  if (!track || !chapter) return null;

  return (
    <ChapterView
      chapter={chapter}
      trackId={trackId}
      chapterId={chapterId}
      chapterIndex={track.chapters.findIndex((c) => c.id === chapterId)}
      totalChapters={track.chapters.length}
      prevId={track.chapters[track.chapters.findIndex((c) => c.id === chapterId) - 1]?.id}
      nextId={track.chapters[track.chapters.findIndex((c) => c.id === chapterId) + 1]?.id}
    />
  );
}

function ChapterView({ chapter: ch, trackId, chapterId, chapterIndex, totalChapters, prevId, nextId }: {
  chapter: TrackChapter;
  trackId: string;
  chapterId: string;
  chapterIndex: number;
  totalChapters: number;
  prevId?: string;
  nextId?: string;
}) {
  const { user } = useAuth();
  const router   = useRouter();

  // Merge AI-generated flashcards with any user-saved overrides from localStorage
  const [cards, setCards] = useState<Flashcard[]>(() => {
    if (typeof window === "undefined") return ch.flashcards ?? [];
    const saved = getChapterFlashcards(trackId, chapterId);
    return saved.length > 0 ? saved : (ch.flashcards ?? []);
  });

  const [idx, setIdx]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab]     = useState<"cards" | "notes" | "practice">("cards");
  const [entering, setEntering] = useState(true);

  // Add card form
  const [addOpen, setAddOpen]       = useState(false);
  const [newQ, setNewQ]             = useState("");
  const [newA, setNewA]             = useState("");

  // Delete card confirmation
  const [deleteCard, setDeleteCard]   = useState<Flashcard | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  // Practice
  const [problems, setProblems]               = useState<CFProblem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [activeProblem, setActiveProblem]     = useState<CFProblem | null>(null);
  const [code, setCode]       = useState("# Write your solution here\n");
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [pushing, setPushing]     = useState(false);
  const [pushUrl, setPushUrl]     = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setEntering(false), 80); return () => clearTimeout(t); }, []);

  // Reset flip/idx when chapter changes
  useEffect(() => { setIdx(0); setFlipped(false); }, [ch.id]);

  useEffect(() => {
    if (tab !== "practice" || problems.length > 0 || loadingProblems) return;
    setLoadingProblems(true);
    fetch(`/api/practice/problems?tags=${ch.tags.join(",")}`)
      .then((r) => r.json())
      .then((d) => setProblems(d.problems ?? []))
      .catch(() => {})
      .finally(() => setLoadingProblems(false));
  }, [tab, ch.tags]);

  const card = cards[idx];
  function next() { setIdx((i) => Math.min(i + 1, cards.length - 1)); setFlipped(false); }
  function prev() { setIdx((i) => Math.max(i - 1, 0)); setFlipped(false); }

  function persistCards(updated: Flashcard[]) {
    setCards(updated);
    saveChapterFlashcards(trackId, chapterId, updated);
  }

  function addCard() {
    if (!newQ.trim() || !newA.trim()) return;
    const fresh: Flashcard = { id: Math.random().toString(36).slice(2, 10), question: newQ.trim(), answer: newA.trim() };
    persistCards([...cards, fresh]);
    setIdx(cards.length);
    setFlipped(false);
    setNewQ(""); setNewA(""); setAddOpen(false);
  }

  function confirmDeleteCard() {
    if (!deleteCard || deleteInput !== "delete") return;
    const updated = cards.filter((c) => c.id !== deleteCard.id);
    persistCards(updated);
    setIdx((i) => Math.min(i, Math.max(0, updated.length - 1)));
    setFlipped(false);
    setDeleteCard(null); setDeleteInput("");
  }

  async function runCode() {
    setRunning(true); setRunOutput(null);
    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python", code }),
      });
      const d = await res.json();
      setRunOutput(d.stdout || d.stderr || "No output.");
    } catch { setRunOutput("Run failed."); }
    finally { setRunning(false); }
  }

  async function pushToGithub() {
    if (!user) return;
    setPushing(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const conn = supabase ? await getGithubConnection(supabase, user.id) : null;
      if (!conn?.accessToken) { alert("Connect GitHub in Settings first."); return; }
      const repoFull = conn.repoFullName ?? await ensureRepo(conn.accessToken, "devquest-submissions");
      const notesContent = cards.map((c) => `## ${c.question}\n\n${c.answer}`).join("\n\n---\n\n");
      const problemNote  = activeProblem ? `\n\n## Practice Problem\n[${activeProblem.name}](${activeProblem.url})\n` : "";
      await pushFile(conn.accessToken, repoFull,
        `chapters/${trackId}/${ch.id}/notes.md`,
        `# ${ch.title}\n\n${notesContent}${problemNote}`,
        `Add notes: ${ch.title}`);
      if (activeProblem && code.trim()) {
        const { htmlUrl } = await pushFile(conn.accessToken, repoFull,
          `chapters/${trackId}/${ch.id}/${activeProblem.id}_solution.py`,
          code, `Add solution: ${activeProblem.name}`);
        setPushUrl(htmlUrl);
      }
    } catch (e) { alert((e as Error).message); }
    finally { setPushing(false); }
  }

  const TABS = [
    { key: "cards" as const,    label: `Flashcards (${cards.length})` },
    { key: "notes" as const,    label: "All Notes" },
    { key: "practice" as const, label: "Practice" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0e0a06", display: "flex", flexDirection: "column" }}>
      {/* Entrance veil — matches the door animation's warm gold white-out */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: entering ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.6, 1] }}
        style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 50%, #fffdf5 0%, #fef3c7 40%, #fde68a 75%, #f59e0b 100%)" }}
      />

      {/* Top bar */}
      <div style={{ flexShrink: 0, padding: "1rem 1.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(245,158,11,0.10)" }}>
        <button
          onClick={() => router.replace(`/cs-journey`)}
          style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: "rgba(245,158,11,0.5)", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
        >
          ← Back
        </button>

        <div style={{ textAlign: "center", flex: 1, padding: "0 1rem" }}>
          <p style={{ fontFamily: SERIF, fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: ch.accent, fontStyle: "italic", margin: 0 }}>
            {ch.num} · {ch.sub}
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1rem, 2.5vw, 1.4rem)", fontWeight: 700, color: "rgba(254,249,231,0.92)", margin: "0.1rem 0 0" }}>
            {ch.title}
          </h1>
        </div>

        {/* Prev / Next chapter */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {prevId && (
            <button onClick={() => router.replace(`/cs-journey/${trackId}/${prevId}`)}
              style={{ fontFamily: MONO, fontSize: "0.68rem", color: "rgba(245,158,11,0.45)", background: "none", border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
              ← Prev
            </button>
          )}
          {nextId && (
            <button onClick={() => router.replace(`/cs-journey/${trackId}/${nextId}`)}
              style={{ fontFamily: MONO, fontSize: "0.68rem", color: "rgba(245,158,11,0.45)", background: "none", border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", gap: 5, padding: "0.55rem 0 0" }}>
        {Array.from({ length: totalChapters }, (_, i) => (
          <div key={i} style={{ width: i === chapterIndex ? 18 : 6, height: 6, borderRadius: 3, background: i === chapterIndex ? ch.accent : "rgba(245,158,11,0.22)", transition: "all 0.3s ease" }} />
        ))}
      </div>

      {/* Tabs */}
      <div style={{ flexShrink: 0, display: "flex", borderBottom: "1px solid rgba(245,158,11,0.10)", padding: "0 1.75rem" }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            fontFamily: SERIF, fontStyle: "italic", fontSize: "0.82rem",
            padding: "0.6rem 1.1rem", background: "none", border: "none", cursor: "pointer",
            borderBottom: tab === key ? `2px solid ${ch.accent}` : "2px solid transparent",
            color: tab === key ? ch.accent : "rgba(245,158,11,0.3)",
            fontWeight: tab === key ? 700 : 400, marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem clamp(1rem, 8vw, 5rem)" }}>

        {/* ── Flashcards ── */}
        {tab === "cards" && (
          <div style={{ maxWidth: 580, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.4rem" }}>
            {cards.length === 0 ? (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.9rem", color: "rgba(245,158,11,0.3)", textAlign: "center", paddingTop: "3rem" }}>
                No flashcards yet — add your own below or regenerate this subject in the builder.
              </p>
            ) : (
              <>
                <div onClick={() => setFlipped((f) => !f)} style={{ width: "100%", minHeight: 220, perspective: 1000, cursor: "pointer" }}>
                  <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    style={{ position: "relative", width: "100%", minHeight: 220, transformStyle: "preserve-3d" }}
                  >
                    {/* Front */}
                    <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 18, background: `linear-gradient(145deg, ${ch.g1}, ${ch.g2})`, border: `1px solid ${ch.accent}33`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center", minHeight: 220 }}>
                      <p style={{ fontFamily: SERIF, fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: ch.accent, opacity: 0.7, margin: "0 0 1rem" }}>
                        {idx + 1} of {cards.length} · tap to reveal
                      </p>
                      <p style={{ fontFamily: SERIF, fontSize: "clamp(1.1rem, 2.5vw, 1.45rem)", fontWeight: 700, color: "#1c1008", lineHeight: 1.4, margin: 0 }}>
                        {card?.question}
                      </p>
                    </div>
                    {/* Back */}
                    <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 18, background: "#fffdf8", border: `1px solid ${ch.accent}55`, padding: "1.75rem 2rem", minHeight: 220, overflowY: "auto" }}>
                      <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "0.9rem", color: ch.accent, marginBottom: "0.55rem" }}>{card?.question}</p>
                      <p style={{ fontFamily: SERIF, fontSize: "0.95rem", color: "#3c2a1e", lineHeight: 1.7, margin: 0 }}>{card?.answer}</p>
                      {card?.code && (
                        <pre style={{ marginTop: "0.9rem", background: "#1c1008", color: "#fde68a", fontFamily: MONO, fontSize: "0.82rem", lineHeight: 1.6, padding: "0.75rem 1rem", borderRadius: 10, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                          {card.code}
                        </pre>
                      )}
                    </div>
                  </motion.div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                  <button onClick={prev} disabled={idx === 0} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.82rem", color: ch.accent, background: "none", border: `1px solid ${ch.accent}44`, borderRadius: 20, padding: "6px 18px", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}>← Prev</button>
                  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", color: "rgba(245,158,11,0.35)" }}>{idx + 1} / {cards.length}</span>
                  <button onClick={next} disabled={idx === cards.length - 1} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.82rem", color: ch.accent, background: "none", border: `1px solid ${ch.accent}44`, borderRadius: 20, padding: "6px 18px", cursor: idx === cards.length - 1 ? "default" : "pointer", opacity: idx === cards.length - 1 ? 0.3 : 1 }}>Next →</button>
                </div>

                {/* Delete current card */}
                <button
                  onClick={() => { setDeleteCard(card ?? null); setDeleteInput(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: SERIF, fontStyle: "italic", fontSize: "0.72rem", color: "rgba(220,38,38,0.45)", background: "none", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 20, padding: "4px 14px", cursor: "pointer" }}
                >
                  <Trash2 size={11} /> Delete this card
                </button>
              </>
            )}

            {/* Add card button */}
            <button
              onClick={() => { setAddOpen(true); setNewQ(""); setNewA(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "0.82rem", color: ch.accent, background: `${ch.accent}12`, border: `1px solid ${ch.accent}33`, borderRadius: 20, padding: "7px 20px", cursor: "pointer", marginTop: cards.length === 0 ? 0 : "0.4rem" }}
            >
              <Plus size={13} /> Add flashcard
            </button>
          </div>
        )}

        {/* ── Notes ── */}
        {tab === "notes" && (
          <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: SERIF, fontSize: "0.95rem", color: "rgba(254,249,231,0.82)", lineHeight: 1.8 }}>
            {cards.length === 0
              ? <p style={{ fontStyle: "italic", opacity: 0.35 }}>No notes yet.</p>
              : cards.map((c, i) => (
                  <div key={c.id} style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: i < cards.length - 1 ? "1px solid rgba(245,158,11,0.08)" : "none" }}>
                    {/* Section heading — the concept, not "what is X?" framing */}
                    <h3 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.05rem", color: "rgba(254,249,231,0.92)", margin: "0 0 0.5rem", lineHeight: 1.3 }}>
                      {c.question.replace(/^(What (is|are|does)|How (does|do|is)|Why (is|does)|Explain|Describe)\s+/i, "").replace(/\?$/, "")}
                    </h3>
                    <p style={{ margin: 0, color: "rgba(245,158,11,0.70)", lineHeight: 1.8, fontSize: "0.93rem" }}>{c.answer}</p>
                    {c.code && (
                      <pre style={{ marginTop: "0.75rem", background: "#1c1008", color: "#fde68a", fontFamily: MONO, fontSize: "0.82rem", lineHeight: 1.6, padding: "0.75rem 1rem", borderRadius: 10, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                        {c.code}
                      </pre>
                    )}
                  </div>
                ))
            }
          </div>
        )}

        {/* ── Practice ── */}
        {tab === "practice" && (
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {loadingProblems && <div style={{ display: "flex", justifyContent: "center", paddingTop: "2rem" }}><Loader2 className="h-5 w-5 animate-spin" style={{ color: ch.accent }} /></div>}

            {!loadingProblems && problems.length === 0 && (
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "rgba(245,158,11,0.35)" }}>
                No Codeforces problems found for: {ch.tags.join(", ")}.
              </p>
            )}

            {problems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.7rem", color: "rgba(245,158,11,0.4)", margin: 0 }}>
                  Codeforces · sorted by most solved · {ch.tags.join(", ")}
                </p>
                {problems.map((p) => (
                  <button key={p.id}
                    onClick={() => { setActiveProblem(p); setCode("# Write your solution here\n"); setRunOutput(null); setPushUrl(null); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: activeProblem?.id === p.id ? `${ch.g1}22` : "rgba(245,158,11,0.05)", border: `1px solid ${activeProblem?.id === p.id ? ch.accent : "rgba(245,158,11,0.15)"}`, cursor: "pointer", textAlign: "left" }}>
                    <div>
                      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "0.9rem", color: "rgba(254,249,231,0.88)" }}>{p.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: "rgba(245,158,11,0.4)", marginLeft: 10 }}>{p.rating} pts · {p.solvedCount.toLocaleString()} solved</span>
                    </div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: ch.accent, flexShrink: 0, marginLeft: 10 }}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </button>
                ))}
              </div>
            )}

            {activeProblem && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.82rem", color: ch.accent }}>{activeProblem.name}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={runCode} disabled={running} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: "0.75rem", color: "#0e0a06", background: ch.accent, border: "none", borderRadius: 8, padding: "6px 14px", cursor: running ? "default" : "pointer", opacity: running ? 0.6 : 1 }}>
                      {running ? <Loader2 className="h-3 w-3 animate-spin" /> : "▶"} Run
                    </button>
                    <button onClick={pushToGithub} disabled={pushing} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: "0.75rem", color: ch.accent, background: "none", border: `1px solid ${ch.accent}55`, borderRadius: 8, padding: "6px 14px", cursor: pushing ? "default" : "pointer", opacity: pushing ? 0.6 : 1 }}>
                      {pushing ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitBranch className="h-3 w-3" />} Push
                    </button>
                  </div>
                </div>
                <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={12} spellCheck={false} style={{ fontFamily: MONO, fontSize: "0.85rem", background: "#080504", color: "#fde68a", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(245,158,11,0.18)", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
                {runOutput !== null && (
                  <pre style={{ fontFamily: MONO, fontSize: "0.8rem", background: "#080504", color: "#86efac", padding: "10px 14px", borderRadius: 10, margin: 0, overflowX: "auto", maxHeight: 160, overflowY: "auto" }}>
                    {runOutput}
                  </pre>
                )}
                {pushUrl && (
                  <p style={{ fontFamily: SERIF, fontSize: "0.8rem", color: ch.accent, margin: 0 }}>
                    ✓ <a href={pushUrl} target="_blank" rel="noopener noreferrer" style={{ color: ch.accent }}>View on GitHub →</a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add flashcard modal ── */}
      {addOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,10,6,0.78)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.16 }}
            style={{ background: "#fffdf8", borderRadius: 20, padding: "2rem 2.2rem", maxWidth: 460, width: "92%", boxShadow: "0 24px 80px rgba(14,10,6,0.5)" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "1.2rem", fontWeight: 700, color: "#1c1008", margin: "0 0 1.2rem" }}>Add a flashcard</h2>
            <label style={{ fontFamily: SERIF, fontSize: "0.78rem", color: "#5c3d2e", display: "block", marginBottom: "0.3rem" }}>Question</label>
            <textarea
              autoFocus
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              rows={2}
              placeholder="e.g. What is memoization?"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: SERIF, fontSize: "0.92rem", padding: "0.55rem 0.85rem", borderRadius: 10, border: `1.5px solid ${ch.accent}44`, background: "rgba(245,158,11,0.04)", color: "#1c1008", outline: "none", resize: "vertical", marginBottom: "0.9rem" }}
            />
            <label style={{ fontFamily: SERIF, fontSize: "0.78rem", color: "#5c3d2e", display: "block", marginBottom: "0.3rem" }}>Answer</label>
            <textarea
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              rows={4}
              placeholder="Explain the concept clearly…"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: SERIF, fontSize: "0.92rem", padding: "0.55rem 0.85rem", borderRadius: 10, border: `1.5px solid ${ch.accent}44`, background: "rgba(245,158,11,0.04)", color: "#1c1008", outline: "none", resize: "vertical", marginBottom: "1.2rem" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setAddOpen(false)} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "#5c3d2e", background: "none", border: "1px solid rgba(92,61,30,0.2)", borderRadius: 50, padding: "8px 20px", cursor: "pointer" }}>Cancel</button>
              <button onClick={addCard} disabled={!newQ.trim() || !newA.trim()} style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "0.88rem", color: "#fffdf8", background: newQ.trim() && newA.trim() ? `linear-gradient(135deg, ${ch.accent}, #d97706)` : "rgba(245,158,11,0.25)", border: "none", borderRadius: 50, padding: "8px 22px", cursor: newQ.trim() && newA.trim() ? "pointer" : "default", transition: "background 0.15s" }}>Save card</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Delete flashcard confirmation modal ── */}
      {deleteCard && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,10,6,0.78)", backdropFilter: "blur(4px)" }}>
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.16 }}
            style={{ background: "#fffdf8", borderRadius: 20, padding: "2rem 2.2rem", maxWidth: 400, width: "92%", boxShadow: "0 24px 80px rgba(14,10,6,0.5)" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: "1.2rem", fontWeight: 700, color: "#1c1008", margin: "0 0 0.4rem" }}>Delete this card?</h2>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "#5c3d2e", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
              &ldquo;{deleteCard.question.slice(0, 80)}{deleteCard.question.length > 80 ? "…" : ""}&rdquo;
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.82rem", color: "#5c3d2e", lineHeight: 1.6, margin: "0 0 1rem" }}>
              Type <strong>delete</strong> to confirm.
            </p>
            <input
              autoFocus
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmDeleteCard(); if (e.key === "Escape") { setDeleteCard(null); setDeleteInput(""); } }}
              placeholder="delete"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: MONO, fontSize: "0.9rem", padding: "0.6rem 0.9rem", borderRadius: 10, border: "1.5px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.04)", color: "#1c1008", outline: "none", marginBottom: "1.1rem" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setDeleteCard(null); setDeleteInput(""); }} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.88rem", color: "#5c3d2e", background: "none", border: "1px solid rgba(92,61,30,0.2)", borderRadius: 50, padding: "8px 20px", cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmDeleteCard} disabled={deleteInput !== "delete"} style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: "0.88rem", color: "#fffdf8", background: deleteInput === "delete" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "rgba(220,38,38,0.25)", border: "none", borderRadius: 50, padding: "8px 20px", cursor: deleteInput === "delete" ? "pointer" : "default", transition: "background 0.15s" }}>Delete</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
