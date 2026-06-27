"use client";

import { CHAPTERS } from "./chapters";

interface TimelineProps {
  activeChapter: number;
  progress: number; // 0-1 within the active chapter
}

export default function Timeline({ activeChapter, progress }: TimelineProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 68,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {/* Chapter name */}
      <span
        style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          fontSize: "0.7rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: CHAPTERS[activeChapter]?.accent ?? "#fff",
          opacity: 0.75,
          transition: "color 0.6s ease",
          fontStyle: "italic",
        }}
      >
        {CHAPTERS[activeChapter]?.title}
      </span>

      {/* Dot track */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {CHAPTERS.map((ch, i) => {
          const isActive = i === activeChapter;
          const isPast = i < activeChapter;
          const accent = isActive ? ch.accent : "#ffffff";
          const scale = isActive ? 1.5 : 1;
          const opacity = isPast ? 0.4 : isActive ? 1 : 0.2;

          return (
            <div
              key={ch.id}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: accent,
                opacity,
                transform: `scale(${scale})`,
                transition: "all 0.4s ease",
                boxShadow: isActive ? `0 0 6px ${accent}` : "none",
              }}
            />
          );
        })}
      </div>

      {/* Progress line under the active dot */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 80,
          height: 1,
          background: `rgba(255,255,255,0.12)`,
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: CHAPTERS[activeChapter]?.accent ?? "#fff",
            transition: "width 0.1s linear",
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}
