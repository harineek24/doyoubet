"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ── palette ─────────────────────────────────────────────────────────────── */
const C = {
  outer:        "#0d1117",          // github dark — familiar, not pitch black
  titleBar:     "#161b22",
  titleBorder:  "rgba(255,255,255,0.09)",
  toolbar:      "#1c2333",
  toolbarBorder:"rgba(255,255,255,0.08)",
  editor:       "#0d1117",          // same as outer so window feels seamless
  editorBorder: "rgba(99,130,255,0.12)",
  statusBar:    "#161b22",
  amber:        "#f59e0b",
  amberDim:     "rgba(245,158,11,0.12)",
  amberBorder:  "rgba(245,158,11,0.30)",
  text:         "#f0f6ff",          // near-white — crisp on dark bg
  textMuted:    "#8b949e",          // github's secondary text
  textDim:      "#3d4f6e",
  green:        "#3fb950",
  greenDim:     "rgba(63,185,80,0.12)",
  indigo:       "#818cf8",
  red:          "#FF5F57",
  yellow:       "#FEBC2E",
  trafficGreen: "#28C840",
};

/* ── types ───────────────────────────────────────────────────────────────── */
type ImageEntry = { id: string; dataUrl: string; name: string };
type Step = "idle" | "processing" | "done" | "error";

const STEPS = [
  "Extracting key concepts from your notes…",
  "Curating your learning path…",
  "Writing your cinematic experience…",
  "Classifying sections for full notes view…",
  "Saving to your library…",
];

/* ── toolbar button ──────────────────────────────────────────────────────── */
function TBtn({
  label, title, onClick, divider = false, active = false,
}: {
  label: string; title: string; onClick: () => void; divider?: boolean; active?: boolean;
}) {
  return (
    <>
      {divider && (
        <div style={{ width: 1, height: 16, background: C.toolbarBorder, margin: "0 4px", flexShrink: 0 }} />
      )}
      <button
        title={title}
        onClick={onClick}
        style={{
          background: active ? C.amberDim : "none",
          border: "none",
          borderRadius: 5,
          padding: "3px 7px",
          color: active ? C.amber : "#8b949e",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-geist-mono, monospace)",
          minWidth: 26,
          transition: "background 0.12s, color 0.12s",
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLButtonElement).style.color = C.text;
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.color = C.textMuted;
          }
        }}
      >
        {label}
      </button>
    </>
  );
}

/* ── main ────────────────────────────────────────────────────────────────── */
export default function NewNotePage() {
  const router = useRouter();
  const [title, setTitle]     = useState("");
  const [body, setBody]       = useState("");
  const [images, setImages]   = useState<ImageEntry[]>([]);
  const [step, setStep]       = useState<Step>("idle");
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError]     = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const taRef   = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* auto-resize textarea */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [body]);

  /* ── image helpers ─────────────────────────────────────────────────────── */
  function addImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const id  = crypto.randomUUID();
      const entry: ImageEntry = { id, dataUrl: reader.result as string, name: file.name };
      setImages(prev => [...prev, entry]);
      insertAtCursor(`\n![${file.name}](image:${id})\n`);
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const img = items.find(i => i.type.startsWith("image/"));
    if (!img) return;
    e.preventDefault();
    addImageFile(img.getAsFile()!);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    files.forEach(addImageFile);
  }

  /* ── cursor insertion ──────────────────────────────────────────────────── */
  const insertAtCursor = useCallback((syntax: string, wrapLen = 0) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = body.slice(start, end);

    let inserted: string;
    let cursor: number;

    if (wrapLen > 0 && sel) {
      inserted = body.slice(0, start) + syntax + sel + syntax + body.slice(end);
      cursor   = end + syntax.length * 2;
    } else if (wrapLen > 0) {
      const placeholder = syntax.trim().replace(/\*/g, "text").replace(/`/g, "code");
      inserted = body.slice(0, start) + syntax + placeholder + syntax + body.slice(end);
      cursor   = start + syntax.length + placeholder.length;
    } else {
      inserted = body.slice(0, start) + syntax + sel + body.slice(end);
      cursor   = start + syntax.length + sel.length;
    }

    setBody(inserted);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  }, [body]);

  /* ── toolbar actions ───────────────────────────────────────────────────── */
  const wrap  = (s: string) => insertAtCursor(s, s.length);
  const prepend = (prefix: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    const inserted  = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    setBody(inserted);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  /* ── submit ────────────────────────────────────────────────────────────── */
  async function handleSubmit() {
    if (!body.trim() || step !== "idle") return;
    setStep("processing");
    setError("");
    setStepIdx(0);
    timerRef.current = setInterval(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1)), 5500);

    try {
      const res = await fetch("/api/notes/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          raw_text: body.trim(),
          images: images.map(({ id, dataUrl, name }) => ({ id, url: dataUrl, caption: name })),
        }),
      });
      clearInterval(timerRef.current!);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); setStep("error"); return; }
      setStep("done");
      setTimeout(() => router.push(`/learn/${data.note_id}`), 700);
    } catch {
      clearInterval(timerRef.current!);
      setError("Network error — check your connection.");
      setStep("error");
    }
  }

  /* ── stats ─────────────────────────────────────────────────────────────── */
  const words  = body.trim() ? body.trim().split(/\s+/).length : 0;
  const tokens = Math.ceil(body.length / 3.5);
  const canSubmit = body.trim().length > 20 && step === "idle";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.outer,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "clamp(1.5rem,5vh,3.5rem) clamp(1rem,3vw,2rem)",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* macOS window */}
      <div
        style={{
          width: "100%",
          maxWidth: 860,
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${C.titleBorder}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.4)",
          background: C.editor,
        }}
      >
        {/* ── title bar ─────────────────────────────────────────────────── */}
        <div
          style={{
            background: C.titleBar,
            borderBottom: `1px solid ${C.titleBorder}`,
            padding: "11px 16px",
            display: "flex",
            alignItems: "center",
            position: "relative",
            userSelect: "none",
          }}
        >
          {/* traffic lights */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", zIndex: 1 }}>
            <button
              onClick={() => router.back()}
              title="Close"
              style={{
                width: 13, height: 13, borderRadius: "50%",
                background: C.red, border: "none", cursor: "pointer", padding: 0,
              }}
            />
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: C.yellow }} />
            <div
              title="Transform notes"
              onClick={canSubmit ? handleSubmit : undefined}
              style={{
                width: 13, height: 13, borderRadius: "50%",
                background: canSubmit ? C.trafficGreen : "#1e3a1e",
                cursor: canSubmit ? "pointer" : "default",
                transition: "background 0.2s",
              }}
            />
          </div>

          {/* window title */}
          <span
            style={{
              position: "absolute", left: "50%", transform: "translateX(-50%)",
              fontSize: 13, fontWeight: 500, color: C.textMuted,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              maxWidth: "60%",
            }}
          >
            {title || "Untitled Notes"} — DevQuest
          </span>
        </div>

        {/* ── toolbar ───────────────────────────────────────────────────── */}
        <div
          style={{
            background: C.toolbar,
            borderBottom: `1px solid ${C.toolbarBorder}`,
            padding: "5px 14px",
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <TBtn label="B"  title="Bold"          onClick={() => wrap("**")} />
          <TBtn label="I"  title="Italic"         onClick={() => wrap("*")} />
          <TBtn label="S"  title="Strikethrough"  onClick={() => wrap("~~")} />
          <TBtn label="H1" title="Heading 1"      onClick={() => prepend("# ")}   divider />
          <TBtn label="H2" title="Heading 2"      onClick={() => prepend("## ")} />
          <TBtn label="H3" title="Heading 3"      onClick={() => prepend("### ")} />
          <TBtn label="`"  title="Inline code"    onClick={() => wrap("`")}        divider />
          <TBtn label="```" title="Code block"    onClick={() => insertAtCursor("\n```\n\n```\n")} />
          <TBtn label="&gt;" title="Blockquote / key insight" onClick={() => prepend("> ")} divider />
          <TBtn label="—"  title="Divider"        onClick={() => insertAtCursor("\n---\n")} />
          <TBtn label="•"  title="Bullet list"    onClick={() => prepend("- ")}   divider />
          <TBtn label="1." title="Numbered list"  onClick={() => prepend("1. ")} />
          <TBtn
            label="⌘ Image"
            title="Insert image (or paste / drag-drop)"
            onClick={() => fileRef.current?.click()}
            divider
          />
        </div>

        {/* ── title input ───────────────────────────────────────────────── */}
        <div style={{ padding: "18px 22px 0" }}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Subject or topic…"
            disabled={step === "processing"}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              outline: "none",
              color: C.amber,
              fontSize: "clamp(18px,2.5vw,24px)",
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
              caretColor: C.amber,
            }}
          />
        </div>

        {/* ── body textarea ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: "10px 22px 18px",
            position: "relative",
          }}
        >
          {isDragging && (
            <div
              style={{
                position: "absolute", inset: 8,
                border: `2px dashed ${C.amber}`,
                borderRadius: 8,
                background: C.amberDim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: C.amber,
                zIndex: 5,
                pointerEvents: "none",
              }}
            >
              Drop image here
            </div>
          )}
          <textarea
            ref={taRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onPaste={handlePaste}
            disabled={step === "processing"}
            placeholder={`Start writing your notes here…\n\nTips:\n  # for headings\n  > for key insights (becomes a callout)\n  \`\`\` for code blocks\n  Paste or drag images directly`}
            style={{
              width: "100%",
              minHeight: 440,
              background: "none",
              border: "none",
              outline: "none",
              resize: "none",
              color: C.text,
              fontSize: 14.5,
              lineHeight: 1.9,
              fontFamily: "var(--font-geist-mono, monospace)",
              caretColor: C.amber,
              overflow: "hidden",
            }}
          />
        </div>

        {/* ── image thumbnails ──────────────────────────────────────────── */}
        {images.length > 0 && (
          <div
            style={{
              padding: "0 22px 16px",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {images.map(img => (
              <div
                key={img.id}
                style={{
                  position: "relative",
                  width: 72,
                  height: 72,
                  borderRadius: 6,
                  overflow: "hidden",
                  border: `1px solid ${C.editorBorder}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  onClick={() => {
                    setImages(prev => prev.filter(i => i.id !== img.id));
                    setBody(b => b.replace(`\n![${img.name}](image:${img.id})\n`, ""));
                  }}
                  style={{
                    position: "absolute", top: 2, right: 2,
                    width: 18, height: 18,
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)",
                    border: "none",
                    color: "#fff",
                    fontSize: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── error / processing / done ─────────────────────────────────── */}
        {step === "error" && (
          <div style={{ margin: "0 22px 16px", background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "11px 14px", fontSize: 13, color: "#fca5a5" }}>
            {error}
          </div>
        )}
        {step === "processing" && (
          <div style={{ margin: "0 22px 16px", background: C.amberDim, border: `0.5px solid ${C.amberBorder}`, borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Spinner color={C.amber} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>Building your experience</span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(245,158,11,0.6)", margin: 0 }}>{STEPS[stepIdx]}</p>
          </div>
        )}
        {step === "done" && (
          <div style={{ margin: "0 22px 16px", background: C.greenDim, border: "0.5px solid rgba(34,197,94,0.22)", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: C.green, display: "flex", alignItems: "center", gap: 8 }}>
            <span>✓</span> Experience ready — opening now…
          </div>
        )}

        {/* ── status bar ────────────────────────────────────────────────── */}
        <div
          style={{
            background: C.statusBar,
            borderTop: `1px solid ${C.toolbarBorder}`,
            padding: "7px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Stat label="words"  value={words.toLocaleString()} />
            <Stat label="chars"  value={body.length.toLocaleString()} />
            <Stat label="~tokens" value={tokens.toLocaleString()} accent={tokens > 1600} />
            {images.length > 0 && <Stat label="images" value={String(images.length)} />}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              background: canSubmit ? C.amber : "rgba(255,255,255,0.05)",
              border: "none",
              borderRadius: 7,
              padding: "6px 18px",
              color: canSubmit ? "#0a0600" : C.textDim,
              fontSize: 13,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "opacity 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            {step === "processing" ? "Creating…" : "Transform →"}
          </button>
        </div>
      </div>

      {/* hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={e => { Array.from(e.target.files ?? []).forEach(addImageFile); e.target.value = ""; }}
      />

      <p style={{ marginTop: "1.5rem", fontSize: 12, color: C.textDim, textAlign: "center", lineHeight: 1.7 }}>
        Click the green dot or the Transform button to generate your experience.
        <br />Paste or drag images directly into the editor.
      </p>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span style={{ fontSize: 11, color: accent ? C.amber : C.textMuted }}>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
      {" "}<span style={{ color: C.textDim }}>{label}</span>
    </span>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" strokeOpacity="0.25" />
      <path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* re-export C for greenDim used inline */
const { greenDim: C_greenDim } = C;
void C_greenDim; // prevent unused warning
