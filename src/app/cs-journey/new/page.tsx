"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { buildTrack } from "@/lib/store/tracks";
import { saveCustomTrack } from "@/lib/repo";
import type { TrackChapter } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

// ── Chapter preview card ──────────────────────────────────────────────────────
function ChapterCard({ chapter, onDelete }: {
  chapter: TrackChapter;
  onDelete: () => void;
}) {
  const cardCount = chapter.flashcards?.length ?? 0;
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${chapter.accent}33`, background: "#fffdf8", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", background: `linear-gradient(135deg, ${chapter.g1}88, ${chapter.g2}55)` }}>
        <span style={{ fontFamily: MONO, fontSize: "0.63rem", letterSpacing: "0.14em", color: chapter.accent, opacity: 0.7, flexShrink: 0 }}>
          {chapter.num}
        </span>
        <span style={{ flex: 1, fontFamily: SERIF, fontWeight: 700, fontSize: "0.92rem", color: "#1c1008" }}>
          {chapter.title}
        </span>
        {cardCount > 0 && (
          <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: chapter.accent, opacity: 0.7, flexShrink: 0 }}>
            {cardCount} cards
          </span>
        )}
        <button onClick={onDelete} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(185,28,28,0.5)", flexShrink: 0 }}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div style={{ padding: "7px 13px 10px" }}>
        <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.82rem", color: "#5c3d2e", margin: 0, lineHeight: 1.5 }}>
          {chapter.sub}
        </p>
      </div>
    </div>
  );
}

// ── Question chip ─────────────────────────────────────────────────────────────
function QuestionChip({ question, index, onDelete, onEdit }: {
  question: string;
  index: number;
  onDelete: () => void;
  onEdit: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(question);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (val.trim()) onEdit(val.trim());
    else setVal(question);
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "8px 10px",
      background: "rgba(245,158,11,0.06)",
      border: "1px solid rgba(245,158,11,0.22)",
      borderRadius: 10,
    }}>
      <span style={{ fontFamily: MONO, fontSize: "0.6rem", color: "rgba(146,64,14,0.5)", paddingTop: 3, flexShrink: 0 }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      {editing ? (
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setVal(question); } }}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontFamily: SERIF, fontSize: "0.88rem", color: "#1c1008", lineHeight: 1.5,
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ flex: 1, fontFamily: SERIF, fontSize: "0.88rem", color: "#1c1008", lineHeight: 1.5, cursor: "text" }}
        >
          {question}
        </span>
      )}
      <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(185,28,28,0.4)", flexShrink: 0, paddingTop: 2 }}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewSubjectPage() {
  const { user }  = useAuth();
  const router    = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle]             = useState("");
  const [questions, setQuestions]     = useState<string[]>([]);
  const [newQ, setNewQ]               = useState("");
  const [suggesting, setSuggesting]   = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [generateProgress, setGenerateProgress] = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [trackId, setTrackId]         = useState<string | null>(null);
  const [chapters, setChapters]       = useState<TrackChapter[] | null>(null);
  const [saving, setSaving]           = useState(false);
  const [leftPct, setLeftPct]         = useState(50);
  const dragging = useRef(false);

  // ── Draggable divider ───────────────────────────────────────────────────────
  const onDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(75, Math.max(25, pct)));
    }
    function onUp() { dragging.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Stage 1: suggest questions ──────────────────────────────────────────────
  async function handleSuggest() {
    if (!title.trim() || suggesting) return;
    setSuggesting(true);
    setError(null);
    setChapters(null);
    setTrackId(null);
    try {
      const res  = await fetch("/api/tracks/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not suggest questions.");
      setQuestions(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not suggest questions.");
    } finally {
      setSuggesting(false);
    }
  }

  // ── Stage 2: generate chapters + cards ─────────────────────────────────────
  async function handleGenerate() {
    if (!title.trim() || questions.length === 0 || generating) return;
    setGenerating(true);
    setError(null);
    setChapters(null);
    setGenerateProgress("Generating chapters and cards…");
    try {
      const res  = await fetch("/api/tracks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setTrackId(data.trackId);
      setChapters(data.chapters);
      if (data.errors?.length) setError(`Some questions failed: ${data.errors.join("; ")}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
      setGenerateProgress("");
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user || !trackId || !chapters || saving) return;
    setSaving(true);
    const track = buildTrack(trackId, title, questions[0] ?? title, chapters, user.id, "ai-generated", null);
    saveCustomTrack(user.id, track);
    router.push(`/cs-intro?trackId=${trackId}`);
  }

  function deleteQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, j) => j !== i));
  }

  function editQuestion(i: number, val: string) {
    setQuestions((prev) => prev.map((q, j) => (j === i ? val : q)));
  }

  function addQuestion() {
    const q = newQ.trim();
    if (!q) return;
    setQuestions((prev) => [...prev, q]);
    setNewQ("");
  }

  function deleteChapter(i: number) {
    setChapters((prev) => prev ? prev.filter((_, j) => j !== i) : prev);
  }

  if (!user) return null;

  const hasQuestions = questions.length > 0;
  const canGenerate  = hasQuestions && !generating;
  const canSuggest   = !!title.trim() && !suggesting;

  return (
    <main style={{
      height: "100vh", overflow: "hidden",
      background: "radial-gradient(ellipse 90% 70% at 50% 0%, #fef3c7 0%, #fdf8f0 55%)",
      display: "flex", flexDirection: "column",
      padding: "1.25rem clamp(1rem, 3vw, 2rem) 1rem",
      gap: "1rem",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <a href="/cs-journey" style={{ fontFamily: SERIF, fontSize: "0.75rem", fontStyle: "italic", color: "rgba(146,64,14,0.55)", textDecoration: "none", flexShrink: 0 }}>
          ← All subjects
        </a>
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setQuestions([]); setChapters(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSuggest(); }}
          placeholder="Subject title…"
          style={{
            flex: 1, minWidth: 160,
            background: "none", border: "none",
            borderBottom: "1.5px solid rgba(245,158,11,0.45)",
            outline: "none", fontFamily: SERIF, fontWeight: 700,
            fontSize: "clamp(1.1rem, 2.5vw, 1.45rem)", color: "#1c1008",
            paddingBottom: 3,
          }}
        />
        {/* Stage 1 button — suggest questions */}
        {!hasQuestions && (
          <button
            onClick={handleSuggest}
            disabled={!canSuggest}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              fontFamily: SERIF, fontSize: "0.88rem", fontStyle: "italic", fontWeight: 700,
              color: "#fffdf8",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none", borderRadius: 50, padding: "10px 22px",
              cursor: !canSuggest ? "default" : "pointer",
              opacity: !canSuggest ? 0.5 : 1,
              boxShadow: "0 5px 18px rgba(245,158,11,0.35)",
              flexShrink: 0,
            }}
          >
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {suggesting ? "Suggesting…" : "Suggest Questions"}
          </button>
        )}
        {/* Stage 2 button — generate chapters + cards */}
        {hasQuestions && (
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              fontFamily: SERIF, fontSize: "0.88rem", fontStyle: "italic", fontWeight: 700,
              color: "#fffdf8",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none", borderRadius: 50, padding: "10px 22px",
              cursor: !canGenerate ? "default" : "pointer",
              opacity: !canGenerate ? 0.5 : 1,
              boxShadow: "0 5px 18px rgba(245,158,11,0.35)",
              flexShrink: 0,
            }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating…" : "Generate"}
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: SERIF, fontSize: "0.8rem", color: "#b91c1c", fontStyle: "italic", margin: 0, flexShrink: 0 }}>
          {error}
        </p>
      )}

      {/* Split pane */}
      <div ref={containerRef} style={{ flex: 1, display: "flex", gap: 0, minHeight: 0, userSelect: dragging.current ? "none" : "auto" }}>

        {/* Left — question list */}
        <div style={{ width: `${leftPct}%`, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{
            padding: "5px 14px",
            background: "#fffdf8",
            border: "1px solid rgba(245,158,11,0.28)",
            borderBottom: "none",
            borderRadius: "12px 12px 0 0",
          }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.75rem", color: "rgba(146,64,14,0.55)" }}>
              {hasQuestions ? `${questions.length} questions — edit or remove before generating` : "Questions to explore"}
            </span>
          </div>
          <div style={{
            flex: 1,
            padding: "0.9rem",
            background: "#fffdf8",
            border: "1px solid rgba(245,158,11,0.28)",
            borderRadius: "0 0 12px 12px",
            overflowY: "auto",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            {!hasQuestions && !suggesting && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "rgba(146,64,14,0.4)", textAlign: "center", maxWidth: 240 }}>
                  Enter a subject title and hit Suggest Questions — or type your own below.
                </p>
              </div>
            )}
            {suggesting && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#92400e" }} />
              </div>
            )}
            {questions.map((q, i) => (
              <QuestionChip
                key={i}
                question={q}
                index={i}
                onDelete={() => deleteQuestion(i)}
                onEdit={(val) => editQuestion(i, val)}
              />
            ))}

            {/* Add custom question */}
            {(hasQuestions || !suggesting) && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 10px",
                border: "1px dashed rgba(245,158,11,0.3)",
                borderRadius: 10, marginTop: 4,
              }}>
                <input
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addQuestion(); }}
                  placeholder="Add your own question…"
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem",
                    color: "#1c1008",
                  }}
                />
                <button
                  onClick={addQuestion}
                  disabled={!newQ.trim()}
                  style={{ background: "none", border: "none", cursor: newQ.trim() ? "pointer" : "default", color: "rgba(146,64,14,0.5)", opacity: newQ.trim() ? 1 : 0.3 }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={onDividerDown}
          style={{
            width: 8, flexShrink: 0, cursor: "col-resize",
            background: "rgba(245,158,11,0.18)",
            margin: "0 3px", borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.48)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.18)")}
        />

        {/* Right — generated chapter preview */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "5px 14px",
            background: "#fffdf8",
            border: "1px solid rgba(245,158,11,0.28)",
            borderBottom: "none", borderRadius: "12px 12px 0 0",
          }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.75rem", color: "rgba(146,64,14,0.55)" }}>
              {chapters ? `${chapters.length} chapters — ${chapters.reduce((n, c) => n + (c.flashcards?.length ?? 0), 0)} cards total` : generateProgress || "Generated preview"}
            </span>
            {chapters && (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontFamily: SERIF, fontSize: "0.8rem", fontStyle: "italic", fontWeight: 700,
                  color: "#fffdf8",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none", borderRadius: 50, padding: "6px 16px",
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  boxShadow: "0 4px 12px rgba(245,158,11,0.35)",
                }}
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                {saving ? "Saving…" : "Save subject →"}
              </button>
            )}
          </div>

          <div style={{
            flex: 1,
            border: "1px solid rgba(245,158,11,0.28)",
            borderRadius: "0 0 12px 12px",
            background: "#fffdf8",
            overflowY: "auto",
            padding: "0.9rem",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {!chapters && !generating && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.85rem", color: "rgba(146,64,14,0.4)", textAlign: "center", maxWidth: 240 }}>
                  {hasQuestions ? "Hit Generate to create chapters and cards." : "Suggest questions on the left to get started."}
                </p>
              </div>
            )}
            {generating && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#92400e" }} />
                <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.8rem", color: "rgba(146,64,14,0.5)", margin: 0 }}>
                  Generating {questions.length} chapters with 6 cards each…
                </p>
              </div>
            )}
            {chapters?.map((ch, i) => (
              <ChapterCard
                key={ch.id}
                chapter={ch}
                onDelete={() => deleteChapter(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
