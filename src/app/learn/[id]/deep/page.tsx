"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import type { Phase2Section } from "@/lib/db/experiences";

// ── Palette ───────────────────────────────────────────────────
const C = {
  bg: "#080d18",
  surface: "#0e1525",
  surfaceAlt: "#0b1220",
  border: "rgba(255,255,255,0.06)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.1)",
  text: "#e2e8f8",
  textMuted: "#6b7fa8",
  textDim: "rgba(107,127,168,0.28)",
  cyan: "#06b6d4",
  violet: "#818cf8",
  rose: "#f43f5e",
};

// ── Utilities ─────────────────────────────────────────────────
function useInView(ref: { current: Element | null }, threshold = 0.12): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

// ──────────────────────────────────────────────────────────────
// 1. HEADING — each word slides up from below
// ──────────────────────────────────────────────────────────────
function HeadingSection({ content, inView }: { content: string; inView: boolean }) {
  const text = content.replace(/^#+\s*/, "").trim();
  const words = text.split(" ");
  return (
    <div style={{
      padding: "clamp(5rem,13vh,10rem) clamp(1.5rem,8vw,8rem)",
      minHeight: "75vh",
      display: "flex",
      alignItems: "center",
    }}>
      <h2 style={{ margin: 0, fontSize: "clamp(2.8rem,6.5vw,5.5rem)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em" }}>
        {words.map((word, i) => (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", marginRight: "0.28em", verticalAlign: "bottom" }}>
            <span style={{
              display: "inline-block",
              color: C.amber,
              transform: inView ? "translateY(0)" : "translateY(115%)",
              opacity: inView ? 1 : 0,
              transition: `transform 0.78s cubic-bezier(0.22,1,0.36,1) ${i * 0.065}s, opacity 0.4s ease ${i * 0.065}s`,
            }}>
              {word}
            </span>
          </span>
        ))}
      </h2>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2. DECODE — scramble that resolves left→right
// ──────────────────────────────────────────────────────────────
const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$&*";

function DecodeSection({ content, inView }: { content: string; inView: boolean }) {
  const text = content.replace(/^#+\s*/, "").trim().toUpperCase();
  const [chars, setChars] = useState<string[]>(() =>
    text.split("").map(c => c === " " ? " " : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)])
  );
  const started = useRef(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const duration = Math.min(text.length * 42, 1800);
    const t0 = performance.now();

    function frame(now: number) {
      const progress = Math.min(1, (now - t0) / duration);
      setChars(text.split("").map((ch, i) => {
        if (ch === " ") return " ";
        if (progress >= i / text.length) return ch;
        return SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
      }));
      if (progress < 1) rafId.current = requestAnimationFrame(frame);
    }
    rafId.current = requestAnimationFrame(frame);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [inView]);

  return (
    <div style={{
      padding: "clamp(5rem,13vh,10rem) clamp(1.5rem,8vw,8rem)",
      minHeight: "55vh",
      display: "flex",
      alignItems: "center",
    }}>
      <h2 style={{
        margin: 0,
        fontSize: "clamp(2.5rem,5.5vw,4.8rem)",
        fontWeight: 800,
        letterSpacing: "0.07em",
        color: C.amber,
        fontFamily: "var(--font-geist-mono, monospace)",
        opacity: inView ? 1 : 0,
        transition: "opacity 0.25s ease",
        lineHeight: 1.1,
      }}>
        {chars.join("")}
      </h2>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 3. PROSE — masked curtain reveal per paragraph
// ──────────────────────────────────────────────────────────────
function ProseSection({ content, inView }: { content: string; inView: boolean }) {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  return (
    <div style={{ padding: "clamp(3.5rem,9vh,7rem) clamp(1.5rem,8vw,8rem)", maxWidth: "calc(680px + clamp(3rem,16vw,16rem))" }}>
      {paragraphs.map((para, i) => (
        <div key={i} style={{ overflow: "hidden", marginBottom: "1.85rem" }}>
          <p style={{
            margin: 0,
            fontSize: "clamp(1.05rem,1.6vw,1.22rem)",
            lineHeight: 1.92,
            color: C.text,
            transform: inView ? "translateY(0)" : "translateY(108%)",
            opacity: inView ? 1 : 0,
            transition: `transform 0.88s cubic-bezier(0.22,1,0.36,1) ${i * 0.13}s, opacity 0.5s ease ${i * 0.13}s`,
          }}>
            {para}
          </p>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 4. CALLOUT — full-bleed clip-path wipe from left
// ──────────────────────────────────────────────────────────────
function CalloutSection({ content, pullQuote, inView }: { content: string; pullQuote: string | null; inView: boolean }) {
  const text = pullQuote || content.slice(0, 200);
  return (
    <div style={{
      padding: "clamp(4.5rem,11vh,9rem) clamp(1.5rem,8vw,8rem)",
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
      minHeight: "50vh",
      display: "flex",
      alignItems: "center",
    }}>
      <div style={{
        clipPath: inView ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
        transition: "clip-path 1.05s cubic-bezier(0.22,1,0.36,1) 0.1s",
      }}>
        <div style={{ width: "clamp(2rem,4vw,3.5rem)", height: 2, background: C.amber, marginBottom: "clamp(1.5rem,3vh,2.5rem)" }} />
        <p style={{
          margin: 0,
          fontSize: "clamp(1.65rem,3.5vw,3.2rem)",
          fontWeight: 700,
          color: C.text,
          lineHeight: 1.22,
          letterSpacing: "-0.025em",
          maxWidth: "18em",
        }}>
          {text}
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 5. CODE — line-by-line terminal reveal with macOS chrome
// ──────────────────────────────────────────────────────────────
function CodeSection({ content, inView }: { content: string; inView: boolean }) {
  const code = content.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
  const lines = code.split("\n");
  return (
    <div style={{ padding: "clamp(3.5rem,9vh,7rem) clamp(1.5rem,8vw,8rem)" }}>
      <div style={{ background: "#0d1117", border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 14, overflow: "hidden", maxWidth: 880 }}>
        <div style={{
          padding: "10px 16px",
          background: "#161b22",
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((col, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: col }} />
          ))}
        </div>
        <div style={{ padding: "22px 26px" }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              display: "flex",
              gap: 22,
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(7px)",
              transition: `opacity 0.32s ease ${i * 0.052}s, transform 0.38s ease ${i * 0.052}s`,
            }}>
              <span style={{ color: C.textDim, fontFamily: "monospace", fontSize: 13, userSelect: "none", minWidth: 22, textAlign: "right" }}>
                {i + 1}
              </span>
              <span style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "clamp(12px,1.3vw,14px)",
                color: "#e2e8f8",
                lineHeight: 1.68,
                whiteSpace: "pre",
              }}>
                {line || " "}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 6. TIMELINE — vertical SVG path draw + staggered nodes
// ──────────────────────────────────────────────────────────────
function TimelineInner({ items, inView }: { items: string[]; inView: boolean }) {
  return (
    <div style={{ padding: "clamp(3.5rem,9vh,7rem) clamp(1.5rem,8vw,8rem)" }}>
      <div style={{ position: "relative", paddingLeft: 48 }}>
        <div style={{
          position: "absolute",
          left: 15,
          top: 18,
          bottom: 18,
          width: 1,
          background: `linear-gradient(to bottom, ${C.amber}, rgba(245,158,11,0.04))`,
          transformOrigin: "top",
          transform: inView ? "scaleY(1)" : "scaleY(0)",
          transition: "transform 1.5s cubic-bezier(0.22,1,0.36,1)",
        }} />
        {items.map((item, i) => (
          <div key={i} style={{
            position: "relative",
            marginBottom: 38,
            opacity: inView ? 1 : 0,
            transform: inView ? "translateX(0)" : "translateX(-20px)",
            transition: `opacity 0.55s ease ${0.28 + i * 0.14}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${0.28 + i * 0.14}s`,
          }}>
            <div style={{
              position: "absolute",
              left: -40,
              top: 4,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: C.bg,
              border: `2px solid ${C.amber}`,
              boxShadow: `0 0 10px rgba(245,158,11,0.32)`,
            }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
              Step {i + 1}
            </div>
            <p style={{ margin: 0, fontSize: "clamp(1rem,1.7vw,1.12rem)", color: C.text, lineHeight: 1.8 }}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 7. BENTO GRID — css grid cards with staggered scale reveal
// ──────────────────────────────────────────────────────────────
function BentoGrid({ items, inView }: { items: string[]; inView: boolean }) {
  const cards = items.map(item => {
    const ci = item.indexOf(":");
    return ci > 0
      ? { title: item.slice(0, ci).trim(), body: item.slice(ci + 1).trim() }
      : { title: "", body: item };
  });
  return (
    <div style={{
      padding: "clamp(3.5rem,9vh,7rem) clamp(1.5rem,8vw,8rem)",
      display: "grid",
      gridTemplateColumns: cards.length >= 3 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
      gap: 12,
      maxWidth: 1100,
    }}>
      {cards.map((card, i) => (
        <div key={i} style={{
          gridColumn: i === 0 && cards.length === 4 ? "span 2" : "auto",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "clamp(1.4rem,2.8vw,2.2rem)",
          opacity: inView ? 1 : 0,
          transform: inView ? "scale(1) translateY(0)" : "scale(0.92) translateY(28px)",
          transition: `opacity 0.55s ease ${i * 0.09}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 0.09}s`,
        }}>
          {card.title && (
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: "0.09em", textTransform: "uppercase" }}>
              {card.title}
            </p>
          )}
          <p style={{ margin: 0, fontSize: "clamp(0.88rem,1.4vw,1.04rem)", color: C.textMuted, lineHeight: 1.72 }}>
            {card.body}
          </p>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 8. LIST — numbered stagger with translateX
// ──────────────────────────────────────────────────────────────
function PlainList({ items, inView }: { items: string[]; inView: boolean }) {
  return (
    <div style={{ padding: "clamp(3.5rem,9vh,7rem) clamp(1.5rem,8vw,8rem)", display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          opacity: inView ? 1 : 0,
          transform: inView ? "translateX(0)" : "translateX(-48px)",
          transition: `opacity 0.5s ease ${i * 0.075}s, transform 0.68s cubic-bezier(0.22,1,0.36,1) ${i * 0.075}s`,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: C.amberDim,
            border: `1px solid rgba(245,158,11,0.22)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            fontSize: 12, fontWeight: 600, color: C.amber,
            marginTop: 3,
          }}>
            {i + 1}
          </div>
          <span style={{ fontSize: "clamp(1rem,1.7vw,1.15rem)", color: C.text, lineHeight: 1.8 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

// Smart list dispatcher: detects bento / timeline / plain
function ListSection({ content, inView }: { content: string; inView: boolean }) {
  const rawItems = content.split("\n").map(l => l.replace(/^[-*•\d.]\s*/, "").trim()).filter(Boolean);
  const isBento = rawItems.length >= 2 && rawItems.length <= 5
    && rawItems.filter(it => it.includes(":")).length >= Math.ceil(rawItems.length * 0.6);
  const isTimeline = /^\d+\./m.test(content) && rawItems.length >= 3;
  if (isBento) return <BentoGrid items={rawItems} inView={inView} />;
  if (isTimeline) return <TimelineInner items={rawItems} inView={inView} />;
  return <PlainList items={rawItems} inView={inView} />;
}

// ──────────────────────────────────────────────────────────────
// 9. STACKED CARDS — problem / context / solution lift
// (triggered when prose contains \n---\n separators)
// ──────────────────────────────────────────────────────────────
function StackedSection({ content, inView }: { content: string; inView: boolean }) {
  const cards = content.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
  const labels = ["Problem", "Context", "Solution"];
  const accents = [C.rose, C.violet, C.amber];
  return (
    <div style={{ padding: "clamp(3.5rem,9vh,7rem) clamp(1.5rem,8vw,8rem)", display: "flex", flexDirection: "column", gap: 10 }}>
      {cards.map((card, i) => (
        <div key={i} style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderTop: `2px solid ${accents[i % accents.length]}`,
          borderRadius: 16,
          padding: "clamp(1.5rem,3vw,2.25rem)",
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0) scale(1)" : `translateY(${38 + i * 20}px) scale(${0.97 - i * 0.015})`,
          transition: `opacity 0.55s ease ${i * 0.14}s, transform 0.72s cubic-bezier(0.22,1,0.36,1) ${i * 0.14}s`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: accents[i % accents.length], letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            {labels[i] || `Part ${i + 1}`}
          </div>
          <p style={{ margin: 0, fontSize: "clamp(1rem,1.7vw,1.12rem)", color: C.text, lineHeight: 1.8 }}>{card}</p>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 10. HORIZONTAL SCROLL PANELS — numbered cards with snap
// ──────────────────────────────────────────────────────────────
function HorizontalSection({ content, inView }: { content: string; inView: boolean }) {
  const items = content.split("\n").map(l => l.replace(/^\d+\.\s*|-\s*/, "").trim()).filter(Boolean);
  return (
    <div style={{ padding: "clamp(3.5rem,9vh,7rem) 0" }}>
      <style>{`
        .h-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="h-scroll" style={{
        display: "flex",
        gap: 14,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
        padding: "0 clamp(1.5rem,8vw,8rem) 14px",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateX(0)" : "translateX(56px)",
        transition: "opacity 0.65s ease, transform 0.9s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {items.map((item, i) => {
          const ci = item.indexOf(":");
          const title = ci > 0 ? item.slice(0, ci).trim() : `Step ${i + 1}`;
          const body = ci > 0 ? item.slice(ci + 1).trim() : item;
          return (
            <div key={i} style={{
              minWidth: "clamp(260px,38vw,340px)",
              scrollSnapAlign: "start",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "clamp(1.5rem,3vw,2.25rem)",
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: "clamp(3.2rem,6vw,4.5rem)",
                fontWeight: 900,
                color: "rgba(245,158,11,0.08)",
                lineHeight: 1,
                marginBottom: 14,
                letterSpacing: "-0.05em",
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 8, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {title}
              </div>
              <p style={{ margin: 0, fontSize: "clamp(0.88rem,1.4vw,1rem)", color: C.textMuted, lineHeight: 1.73 }}>{body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 11. STAT — ghost number bg + animated foreground
// ──────────────────────────────────────────────────────────────
function StatSection({ content, inView }: { content: string; inView: boolean }) {
  const match = content.match(/\b(O\([^)]+\)|\d+(?:[.,]\d+)?(?:%|x|X|ms|s|k|M|B)?)\b/);
  const stat = match ? match[0] : "∞";
  const description = content.replace(stat, "").replace(/^[:\s—–-]+/, "").trim();
  return (
    <div style={{
      padding: "clamp(5rem,14vh,11rem) clamp(1.5rem,8vw,8rem)",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        fontSize: "clamp(9rem,26vw,20rem)",
        fontWeight: 900,
        color: "rgba(245,158,11,0.04)",
        lineHeight: 1,
        letterSpacing: "-0.06em",
        userSelect: "none",
        pointerEvents: "none",
      }}>
        {stat}
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          fontSize: "clamp(3.5rem,9vw,7.5rem)",
          fontWeight: 800,
          color: C.amber,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          opacity: inView ? 1 : 0,
          transform: inView ? "scale(1)" : "scale(0.55)",
          transition: "opacity 0.65s ease, transform 0.95s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          {stat}
        </div>
        {description && (
          <p style={{
            fontSize: "clamp(1rem,1.8vw,1.28rem)",
            color: C.textMuted,
            maxWidth: "42ch",
            lineHeight: 1.68,
            margin: "1.3rem auto 0",
            opacity: inView ? 1 : 0,
            transition: "opacity 0.55s ease 0.38s",
          }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 12. IMAGE — fade + translateY
// ──────────────────────────────────────────────────────────────
function ImageSection({ inView }: { inView: boolean }) {
  return (
    <div style={{
      padding: "clamp(3.5rem,9vh,7rem) clamp(1.5rem,8vw,8rem)",
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(36px)",
      transition: "opacity 0.65s ease, transform 0.85s cubic-bezier(0.22,1,0.36,1)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 640,
        aspectRatio: "16/9",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ color: C.textDim, fontSize: 13 }}>[ image ]</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// SECTION DISPATCHER
// ──────────────────────────────────────────────────────────────
function SectionBlock({ section, inView }: { section: Phase2Section; inView: boolean }) {
  const { display_mode, content } = section;

  // Heading heuristic: short single line → decode; longer → word kinetic
  if (display_mode === "heading") {
    const clean = content.replace(/^#+\s*/, "").trim();
    return clean.length < 44 && !clean.includes("\n")
      ? <DecodeSection content={content} inView={inView} />
      : <HeadingSection content={content} inView={inView} />;
  }

  // Prose heuristic: has --- separators → stacked cards
  if (display_mode === "prose" && content.includes("\n---\n")) {
    return <StackedSection content={content} inView={inView} />;
  }

  // Callout heuristic: starts with a number/stat pattern → stat card
  if (display_mode === "callout" && /^\s*[\d]+(?:[.,]\d+)?(?:%|x|ms|s)?\s/.test(content)) {
    return <StatSection content={content} inView={inView} />;
  }

  switch (display_mode) {
    case "prose":      return <ProseSection content={content} inView={inView} />;
    case "callout":    return <CalloutSection content={content} pullQuote={section.pull_quote} inView={inView} />;
    case "code":       return <CodeSection content={content} inView={inView} />;
    case "list":       return <ListSection content={content} inView={inView} />;
    case "bento":      return <BentoGrid items={content.split("\n").map(l => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)} inView={inView} />;
    case "stat":       return <StatSection content={content} inView={inView} />;
    case "timeline":   return <TimelineInner items={content.split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean)} inView={inView} />;
    case "horizontal": return <HorizontalSection content={content} inView={inView} />;
    case "stacked":    return <StackedSection content={content} inView={inView} />;
    case "decode":     return <DecodeSection content={content} inView={inView} />;
    case "image":      return <ImageSection inView={inView} />;
    default:           return <ProseSection content={content} inView={inView} />;
  }
}

// ──────────────────────────────────────────────────────────────
// ANIMATED SECTION WRAPPER — IntersectionObserver per section
// ──────────────────────────────────────────────────────────────
function AnimatedSection({ section, index }: { section: Phase2Section; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const alt = index % 2 === 1;
  return (
    <div
      ref={ref}
      style={{
        background: alt ? C.surfaceAlt : "transparent",
        borderTop: alt ? `1px solid ${C.border}` : "none",
        borderBottom: alt ? `1px solid ${C.border}` : "none",
      }}
    >
      <SectionBlock section={section} inView={inView} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────
export default function DeepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sections, setSections] = useState<Phase2Section[]>([]);
  const [noteTitle, setNoteTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [scrollPct, setScrollPct] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/notes/${id}`);
      if (!res.ok) { setErrorMsg("Experience not found."); setLoading(false); return; }
      const { note, experience } = await res.json();
      if (!experience || experience.status !== "ready") {
        setErrorMsg("Experience not ready yet."); setLoading(false); return;
      }
      setSections(experience.phase2_sections ?? []);
      setNoteTitle(note.title ?? "Your Notes");
      setLoading(false);
    }
    load();
  }, [id]);

  // Scroll progress + velocity-based skew
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? y / max : 0);
      velocityRef.current = (y - lastYRef.current) * 0.028;
      lastYRef.current = y;
    }

    function decayLoop() {
      velocityRef.current *= 0.8;
      if (contentRef.current) {
        const s = Math.max(-1.6, Math.min(1.6, velocityRef.current));
        contentRef.current.style.transform = `skewY(${-s}deg)`;
      }
      rafRef.current = requestAnimationFrame(decayLoop);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(decayLoop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ animation: "spin 1.2s linear infinite" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="18" cy="18" r="15" stroke={C.amber} strokeWidth="2" strokeOpacity="0.18" />
        <path d="M18 3 A15 15 0 0 1 33 18" stroke={C.amber} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );

  if (errorMsg) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#fca5a5", fontSize: 15 }}>{errorMsg}</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", overflowX: "hidden" }}>
      {/* Progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.04)", zIndex: 50 }}>
        <div style={{ height: "100%", width: `${scrollPct * 100}%`, background: C.amber, transition: "width 0.06s" }} />
      </div>

      {/* Fixed nav */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        padding: "1rem clamp(1.5rem,5vw,4rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: `rgba(8,13,24,${0.82 + scrollPct * 0.14})`,
        backdropFilter: "blur(16px)",
        zIndex: 40,
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
      }}>
        <button
          onClick={() => router.push(`/learn/${id}`)}
          style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}
        >
          ← Back to flashcards
        </button>
        <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, maxWidth: "40vw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {noteTitle}
        </span>
        <span style={{ fontSize: 12, color: C.textDim }}>{Math.round(scrollPct * 100)}%</span>
      </div>

      {/* Sections — velocity skew applied here */}
      <div ref={contentRef} style={{ paddingTop: 56, willChange: "transform" }}>
        {sections.map((section, i) => (
          <AnimatedSection key={i} section={section} index={i} />
        ))}

        {/* Footer */}
        <div style={{
          padding: "clamp(4rem,10vh,8rem) clamp(1.5rem,8vw,8rem)",
          textAlign: "center",
          borderTop: `1px solid ${C.border}`,
        }}>
          <p style={{ color: C.textDim, fontSize: 13, margin: "0 0 1.5rem" }}>End of notes</p>
          <button
            onClick={() => router.push(`/learn/${id}`)}
            style={{
              background: "none",
              border: `1px solid rgba(245,158,11,0.28)`,
              borderRadius: 8,
              color: C.amber,
              padding: "10px 24px",
              fontSize: 13,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            ← Back to flashcards
          </button>
        </div>
      </div>
    </div>
  );
}
