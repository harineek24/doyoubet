"use client";

import { JOURNEY } from "./journeyData";

interface Props {
  activeId: number;
  onJump: (id: number) => void;
}

export default function SideTimeline({ activeId, onJump }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 216,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        padding: "2rem 0 2rem 1.5rem",
        background: "linear-gradient(to right, rgba(254,249,240,0.97) 80%, rgba(254,249,240,0))",
        pointerEvents: "none",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <span
          style={{
            fontFamily: 'var(--font-playfair, Georgia, serif)',
            fontSize: "0.72rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(120,70,20,0.55)",
            fontStyle: "italic",
          }}
        >
          Your journey
        </span>
        <div
          style={{
            marginTop: 8,
            width: 36,
            height: 2,
            borderRadius: 1,
            background: "#f59e0b",
            opacity: 0.65,
          }}
        />
      </div>

      {/* Chapter list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 4,
          scrollbarWidth: "none",
          pointerEvents: "auto",
        }}
      >
        <style>{`div::-webkit-scrollbar{display:none}`}</style>

        <div style={{ position: "relative" }}>
          {/* Track line */}
          <div
            style={{
              position: "absolute",
              left: 6,
              top: 10,
              bottom: 10,
              width: 1.5,
              background: "rgba(245,158,11,0.15)",
            }}
          />
          {/* Filled progress */}
          <div
            style={{
              position: "absolute",
              left: 6,
              top: 10,
              width: 1.5,
              height: `${(activeId / (JOURNEY.length - 1)) * 100}%`,
              background: "#f59e0b",
              opacity: 0.75,
              transition: "height 0.6s ease",
            }}
          />

          {JOURNEY.map((ch) => {
            const isActive = ch.id === activeId;
            const isDone   = ch.id < activeId;

            return (
              <button
                key={ch.id}
                onClick={() => onJump(ch.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 0",
                  width: "100%",
                  textAlign: "left",
                  position: "relative",
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    border: isActive
                      ? "2px solid #f59e0b"
                      : `1.5px solid ${isDone ? "#f59e0b" : "rgba(245,158,11,0.30)"}`,
                    background: isActive
                      ? "#f59e0b"
                      : isDone ? "rgba(245,158,11,0.38)" : "transparent",
                    transition: "all 0.4s ease",
                    boxShadow: isActive ? "0 0 9px rgba(245,158,11,0.55)" : "none",
                    zIndex: 1,
                  }}
                />
                {/* Label */}
                <span
                  style={{
                    fontFamily: 'var(--font-playfair, Georgia, serif)',
                    fontSize: isActive ? "0.85rem" : "0.76rem",
                    fontWeight: isActive ? 700 : 400,
                    fontStyle: isActive ? "normal" : "italic",
                    color: isActive
                      ? "#92400e"
                      : isDone
                      ? "rgba(120,70,20,0.62)"
                      : "rgba(120,70,20,0.38)",
                    transition: "all 0.4s ease",
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 148,
                  }}
                >
                  {ch.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "1rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid rgba(245,158,11,0.15)",
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-playfair, Georgia, serif)',
            fontSize: "0.82rem",
            color: "#b45309",
            fontStyle: "italic",
            fontWeight: 600,
          }}
        >
          {String(activeId + 1).padStart(2, "0")} / {String(JOURNEY.length).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
