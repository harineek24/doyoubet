"use client";

import { motion } from "framer-motion";
import { Pencil, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { polarToCartesian } from "@/lib/wheelGeometry";
import { recordSpin, saveWheelSlices } from "@/lib/repo";
import type { WheelSlice } from "@/types/schema";
import { EditWheelModal } from "@/components/wheel/EditWheelModal";

const CONTAINER_W = 360;
const CONTAINER_H = 300;
const CARD_W = 220;
const CARD_H = 150;
const FLY_MS = 1100;
const FLIP_DELAY_MS = 480;
const FLIP_MS = 620;
const RETURN_MS = 700;

type Phase = "idle" | "drawing" | "revealed" | "returning";

export function MutationWheel({
  tenantId,
  initialSlices,
}: {
  tenantId: string;
  initialSlices: WheelSlice[];
}) {
  const [slices, setSlices] = useState(initialSlices);
  const [phase, setPhase] = useState<Phase>("idle");
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const drawTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (drawTimer.current) clearTimeout(drawTimer.current);
    };
  }, []);

  const layout = useMemo(() => {
    const n = slices.length;
    return slices.map((_, i) => {
      const angle = (360 / n) * i + (Math.random() - 0.5) * (360 / n) * 0.4;
      const radius = 86 + Math.random() * 26;
      const { x, y } = polarToCartesian(0, 0, radius, angle);
      return {
        x,
        y,
        dx: (Math.random() - 0.5) * 16,
        dy: (Math.random() - 0.5) * 16,
        dr: (Math.random() - 0.5) * 8,
        dur: 4.5 + Math.random() * 3,
        delay: Math.random() * 3,
      };
    });
  }, [slices]);

  const stars = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 1.8,
        dur: 2.4 + Math.random() * 3,
        delay: Math.random() * 4,
      })),
    []
  );

  function beginDraw() {
    const idx = Math.floor(Math.random() * slices.length);
    setTargetIndex(idx);
    setPhase("drawing");
    drawTimer.current = setTimeout(() => {
      setPhase("revealed");
      recordSpin(tenantId, slices[idx].id);
    }, FLY_MS);
  }

  function draw() {
    if (phase === "drawing" || phase === "returning") return;
    if (phase === "revealed") {
      setPhase("returning");
      setTargetIndex(null);
      drawTimer.current = setTimeout(beginDraw, RETURN_MS);
      return;
    }
    beginDraw();
  }

  function handleSaveSlices(updated: WheelSlice[]) {
    if (drawTimer.current) clearTimeout(drawTimer.current);
    setSlices(updated);
    setPhase("idle");
    setTargetIndex(null);
    saveWheelSlices(tenantId, updated);
    setEditing(false);
  }

  const isIdleLayout = phase === "idle" || phase === "returning";
  const result = phase === "revealed" && targetIndex !== null ? slices[targetIndex] : null;

  return (
    <div className="glass relative flex flex-col items-center rounded-2xl p-6">
      <style>{`
        @keyframes wheelStarTwinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.85; }
        }
        @keyframes wheelCardBob {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(var(--dx), var(--dy)) rotate(var(--dr)); }
        }
      `}</style>

      <button
        onClick={() => setEditing(true)}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal text-foreground/60 transition hover:text-foreground"
        aria-label="Edit wheel"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          width: CONTAINER_W,
          height: CONTAINER_H,
          background:
            "radial-gradient(ellipse 80% 70% at 50% 45%, rgba(245,158,11,0.07), transparent 70%), #0e0a06",
          border: "1px solid rgba(245,158,11,0.12)",
        }}
      >
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              background: "#fde68a",
              animation: `wheelStarTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}

        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: 0, height: 0 }}
        >
          {slices.map((slice, i) => {
            const pos = layout[i];
            const isTarget = i === targetIndex;
            const flipped = !isIdleLayout && isTarget;

            const offset = isIdleLayout
              ? { x: pos.x, y: pos.y, opacity: 1 }
              : isTarget
              ? { x: 0, y: 0, opacity: 1 }
              : { x: pos.x * 1.6, y: pos.y * 1.6, opacity: 0 };

            return (
              <motion.div
                key={slice.id}
                className="absolute"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  marginLeft: -CARD_W / 2,
                  marginTop: -CARD_H / 2,
                }}
                animate={{ x: offset.x, y: offset.y, opacity: offset.opacity }}
                transition={{ duration: FLY_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative h-full w-full" style={{ perspective: 900 }}>
                  <motion.div
                    className="absolute inset-0"
                    style={{ transformStyle: "preserve-3d" }}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{
                      duration: FLIP_MS / 1000,
                      delay: flipped ? FLIP_DELAY_MS / 1000 : 0,
                      ease: "easeInOut",
                    }}
                  >
                    {/* Idle face — small drifting glow + short label */}
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div
                        className={isIdleLayout ? "flex flex-col items-center gap-1.5" : "flex flex-col items-center gap-1.5 opacity-0"}
                        style={
                          isIdleLayout
                            ? ({
                                "--dx": `${pos.dx}px`,
                                "--dy": `${pos.dy}px`,
                                "--dr": `${pos.dr}deg`,
                                animation: `wheelCardBob ${pos.dur}s ease-in-out ${pos.delay}s infinite`,
                              } as React.CSSProperties)
                            : undefined
                        }
                      >
                        <span
                          className="block h-3 w-3 rounded-full"
                          style={{ background: slice.color, boxShadow: `0 0 12px ${slice.color}` }}
                        />
                        <span className="max-w-[80px] text-center text-[10px] text-foreground/50">
                          {truncate(slice.label, 14)}
                        </span>
                      </div>
                    </div>

                    {/* Revealed face — full constraint text */}
                    <div
                      className="glass glow-amber absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-amber/40 p-5 text-center"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wider text-amber">
                        Today&apos;s constraint
                      </p>
                      <p className="text-base font-semibold">{slice.label}</p>
                      {slice.description && (
                        <p className="text-xs text-foreground/60">{slice.description}</p>
                      )}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <button
        onClick={draw}
        disabled={phase === "drawing" || phase === "returning"}
        className="mt-4 flex items-center gap-2 rounded-full bg-amber px-6 py-3 text-sm font-semibold text-void shadow-lg shadow-amber/30 transition disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {phase === "drawing" || phase === "returning"
          ? "Drawing…"
          : result
          ? "Draw Again"
          : "Draw a Constraint"}
      </button>

      {editing && (
        <EditWheelModal
          slices={slices}
          onSave={handleSaveSlices}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
