"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { buildTrack } from "@/lib/store/tracks";
import { saveCustomTrack } from "@/lib/repo";
import type { Flashcard, TrackChapter } from "@/types/schema";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO  = "var(--font-geist-mono, 'Courier New', monospace)";

// ── Toolbar button ────────────────────────────────────────────────────────────
function TBtn({ label, title, action, value }: { label: string; title: string; action: string; value?: string }) {
  function exec() {
    document.execCommand(action, false, value);
  }
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); exec(); }}
      title={title}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "3px 8px", borderRadius: 5,
        fontFamily: MONO, fontSize: 12, fontWeight: 600,
        color: "rgba(92,61,46,0.7)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.10)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 16, background: "rgba(146,64,14,0.2)", margin: "0 3px", flexShrink: 0 }} />;
}

// ── Editable chapter card ─────────────────────────────────────────────────────
function ChapterCard({ chapter, index, onUpdate, onDelete, onAddCard, onDeleteCard }: {
  chapter: TrackChapter;
  index: number;
  onUpdate: (patch: Partial<TrackChapter>) => void;
  onDelete: () => void;
  onAddCard: () => void;
  onDeleteCard: (id: string) => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const cards = chapter.flashcards ?? [];

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${chapter.accent}33`, background: "#fffdf8", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
        background: `linear-gradient(135deg, ${chapter.g1}88, ${chapter.g2}55)`,
      }}>
        <button onClick={() => setOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: chapter.accent, flexShrink: 0 }}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", color: chapter.accent, opacity: 0.7, flexShrink: 0 }}>
          {chapter.num}
        </span>
        <input
          value={chapter.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: SERIF, fontWeight: 700, fontSize: "0.95rem", color: "#1c1008" }}
        />
        <button onClick={onDelete} title="Delete chapter" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(185,28,28,0.55)", flexShrink: 0 }}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div style={{ padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {cards.map((card) => (
            <div key={card.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(245,158,11,0.05)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <input
                  value={card.question}
                  onChange={(e) => onUpdate({ flashcards: cards.map((c) => c.id === card.id ? { ...c, question: e.target.value } : c) })}
                  placeholder="Question"
                  style={{ background: "none", border: "none", borderBottom: "1px solid rgba(146,64,14,0.18)", outline: "none", fontFamily: SERIF, fontWeight: 600, fontSize: "0.82rem", color: "#1c1008", paddingBottom: 3, width: "100%" }}
                />
                <textarea
                  value={card.answer}
                  onChange={(e) => onUpdate({ flashcards: cards.map((c) => c.id === card.id ? { ...c, answer: e.target.value } : c) })}
                  placeholder="Answer"
                  rows={2}
                  style={{ background: "none", border: "none", outline: "none", fontFamily: SERIF, fontSize: "0.8rem", color: "#5c3d2e", resize: "vertical", lineHeight: 1.5, width: "100%" }}
                />
              </div>
              <button onClick={() => onDeleteCard(card.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(185,28,28,0.4)", flexShrink: 0, paddingTop: 2 }}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button onClick={onAddCard} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "rgba(146,64,14,0.55)", fontFamily: SERIF, fontStyle: "italic", fontSize: "0.78rem", padding: 0 }}>
            <Plus className="h-3.5 w-3.5" /> Add flashcard
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewSubjectPage() {
  const { user } = useAuth();
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle]           = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [trackId, setTrackId]       = useState<string | null>(null);
  const [chapters, setChapters]     = useState<TrackChapter[] | null>(null);
  const [leftPct, setLeftPct]       = useState(50);
  const dragging = useRef(false);

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

  async function handleGenerate() {
    const notes = editorRef.current?.innerText?.trim() ?? "";
    if (!title.trim() || !notes || generating) return;
    setGenerating(true);
    setError(null);
    setChapters(null);
    try {
      const res = await fetch("/api/tracks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setTrackId(data.trackId);
      setChapters(data.chapters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function updateChapter(i: number, patch: Partial<TrackChapter>) {
    setChapters((prev) => prev ? prev.map((c, j) => j === i ? { ...c, ...patch } : c) : prev);
  }

  function deleteChapter(i: number) {
    setChapters((prev) => prev ? prev.filter((_, j) => j !== i) : prev);
  }

  function addFlashcard(chIdx: number) {
    const card: Flashcard = { id: Math.random().toString(36).slice(2), question: "", answer: "" };
    setChapters((prev) => prev ? prev.map((c, j) => j === chIdx ? { ...c, flashcards: [...(c.flashcards ?? []), card] } : c) : prev);
  }

  function deleteFlashcard(chIdx: number, cardId: string) {
    setChapters((prev) => prev ? prev.map((c, j) => j === chIdx ? { ...c, flashcards: (c.flashcards ?? []).filter((f) => f.id !== cardId) } : c) : prev);
  }

  function handleSave() {
    if (!user || !trackId || !chapters) return;
    const notes = editorRef.current?.innerText?.trim() ?? "";
    const newTrack = buildTrack(trackId, title, notes.slice(0, 140), chapters, user.id, "ai-generated", notes);
    saveCustomTrack(user.id, newTrack);
    router.push(`/cs-journey/${trackId}`);
  }

  if (!user) return null;

  return (
    <main style={{
      height: "100vh", overflow: "hidden",
      background: "radial-gradient(ellipse 90% 70% at 50% 0%, #fef3c7 0%, #fdf8f0 55%)",
      display: "flex", flexDirection: "column",
      padding: "1.25rem clamp(1rem, 3vw, 2rem) 1rem",
      gap: "1rem",
    }}>
      <style>{`
        [contenteditable]:empty:before{content:attr(data-placeholder);color:rgba(92,61,46,0.35);pointer-events:none;font-style:italic}
        [contenteditable] h1{font-size:1.55rem;font-weight:700;margin:.75rem 0 .35rem;color:#1c1008}
        [contenteditable] h2{font-size:1.2rem;font-weight:700;margin:.65rem 0 .3rem;color:#1c1008}
        [contenteditable] ul,[contenteditable] ol{padding-left:1.4em;margin:.35rem 0}
        [contenteditable] li{margin-bottom:.2rem}
        [contenteditable] hr{border:none;border-top:1px solid rgba(245,158,11,0.3);margin:.9rem 0}
        [contenteditable] strong{font-weight:700}
        [contenteditable] em{font-style:italic}
      `}</style>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <a href="/cs-journey" style={{ fontFamily: SERIF, fontSize: "0.75rem", fontStyle: "italic", color: "rgba(146,64,14,0.55)", textDecoration: "none", flexShrink: 0 }}>
          ← All subjects
        </a>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
        <button
          onClick={handleGenerate}
          disabled={generating || !title.trim()}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            fontFamily: SERIF, fontSize: "0.88rem", fontStyle: "italic", fontWeight: 700,
            color: "#fffdf8",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            border: "none", borderRadius: 50, padding: "10px 22px",
            cursor: !title.trim() || generating ? "default" : "pointer",
            opacity: !title.trim() ? 0.5 : 1,
            boxShadow: "0 5px 18px rgba(245,158,11,0.35)",
            flexShrink: 0,
          }}
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: SERIF, fontSize: "0.8rem", color: "#b91c1c", fontStyle: "italic", margin: 0, flexShrink: 0 }}>
          {error}
        </p>
      )}

      {/* Split pane */}
      <div ref={containerRef} style={{ flex: 1, display: "flex", gap: 0, minHeight: 0, userSelect: dragging.current ? "none" : "auto" }}>

        {/* Left — rich text editor */}
        <div style={{ width: `${leftPct}%`, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2,
            padding: "5px 10px",
            background: "#fffdf8",
            border: "1px solid rgba(245,158,11,0.28)",
            borderBottom: "none",
            borderRadius: "12px 12px 0 0",
          }}>
            <TBtn label="B" title="Bold" action="bold" />
            <TBtn label="I" title="Italic" action="italic" />
            <TBtn label="U" title="Underline" action="underline" />
            <Divider />
            <TBtn label="H1" title="Heading 1" action="formatBlock" value="h1" />
            <TBtn label="H2" title="Heading 2" action="formatBlock" value="h2" />
            <Divider />
            <TBtn label="• List" title="Bullet list" action="insertUnorderedList" />
            <TBtn label="1. List" title="Numbered list" action="insertOrderedList" />
            <Divider />
            <TBtn label="—" title="Divider line" action="insertHorizontalRule" />
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="What do you want this subject to cover? Dump your notes here — topics, order, examples, anything. The AI will structure it into chapters and flashcards."
            style={{
              flex: 1,
              padding: "1.1rem 1.4rem",
              background: "#fffdf8",
              border: "1px solid rgba(245,158,11,0.28)",
              borderRadius: "0 0 12px 12px",
              outline: "none",
              fontFamily: SERIF, fontSize: "0.95rem",
              color: "#1c1008", lineHeight: 1.8,
              overflowY: "auto",
            }}
          />
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

        {/* Right — generated preview */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "5px 14px",
            background: "#fffdf8",
            border: "1px solid rgba(245,158,11,0.28)",
            borderBottom: "none", borderRadius: "12px 12px 0 0",
          }}>
            <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.75rem", color: "rgba(146,64,14,0.55)" }}>
              {chapters ? `${chapters.length} chapters — edit before saving` : "Structured preview"}
            </span>
            {chapters && (
              <button
                onClick={handleSave}
                style={{
                  fontFamily: SERIF, fontSize: "0.8rem", fontStyle: "italic", fontWeight: 700,
                  color: "#fffdf8",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none", borderRadius: 50, padding: "6px 16px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(245,158,11,0.35)",
                }}
              >
                Save subject →
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
                  Write your notes on the left then hit Generate.
                </p>
              </div>
            )}
            {generating && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#92400e" }} />
              </div>
            )}
            {chapters?.map((ch, i) => (
              <ChapterCard
                key={ch.id}
                chapter={ch}
                index={i}
                onUpdate={(patch) => updateChapter(i, patch)}
                onDelete={() => deleteChapter(i)}
                onAddCard={() => addFlashcard(i)}
                onDeleteCard={(cardId) => deleteFlashcard(i, cardId)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
