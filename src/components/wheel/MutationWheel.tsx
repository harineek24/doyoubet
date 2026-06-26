"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { describeSlice, labelRotation, polarToCartesian } from "@/lib/wheelGeometry";
import { recordSpin, saveWheelSlices } from "@/lib/repo";
import type { WheelSlice } from "@/types/schema";
import { EditWheelModal } from "@/components/wheel/EditWheelModal";

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 140;
const SPIN_DURATION = 4;

export function MutationWheel({
  tenantId,
  initialSlices,
}: {
  tenantId: string;
  initialSlices: WheelSlice[];
}) {
  const [slices, setSlices] = useState(initialSlices);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelSlice | null>(null);
  const [editing, setEditing] = useState(false);
  const pendingResultIndex = useRef<number | null>(null);

  const n = slices.length;
  const anglePerSlice = n > 0 ? 360 / n : 0;

  function spin() {
    if (spinning || n === 0) return;
    setSpinning(true);
    setResult(null);

    const targetIndex = Math.floor(Math.random() * n);
    const jitter = (Math.random() - 0.5) * anglePerSlice * 0.6;
    const targetCenter = targetIndex * anglePerSlice + anglePerSlice / 2 + jitter;

    const currentMod = ((rotation % 360) + 360) % 360;
    const desiredMod = (360 - targetCenter + 360) % 360;
    const delta = (desiredMod - currentMod + 360) % 360;
    const extraSpins = 4 + Math.floor(Math.random() * 3);

    setRotation(rotation + delta + extraSpins * 360);

    // Stash the target so onAnimationComplete can report it precisely.
    pendingResultIndex.current = targetIndex;
  }

  function handleAnimationComplete() {
    setSpinning(false);
    const idx = pendingResultIndex.current;
    if (idx === null) return;
    const slice = slices[idx];
    setResult(slice);
    recordSpin(tenantId, slice.id);
    pendingResultIndex.current = null;
  }

  function handleSaveSlices(updated: WheelSlice[]) {
    setSlices(updated);
    saveWheelSlices(tenantId, updated);
    setEditing(false);
  }

  return (
    <div className="glass relative flex flex-col items-center rounded-2xl p-6">
      <button
        onClick={() => setEditing(true)}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal text-foreground/60 transition hover:text-foreground"
        aria-label="Edit wheel"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      <div className="relative" style={{ width: SIZE, height: SIZE + 24 }}>
        <div
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "16px solid var(--purple)",
          }}
        />
        <motion.svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="absolute left-0 top-6 drop-shadow-[0_0_30px_rgba(168,85,247,0.25)]"
          animate={{ rotate: rotation }}
          transition={{ duration: SPIN_DURATION, ease: [0.12, 0.67, 0.18, 1] }}
          onAnimationComplete={handleAnimationComplete}
        >
          {slices.map((slice, i) => {
            const start = i * anglePerSlice;
            const end = start + anglePerSlice;
            const mid = start + anglePerSlice / 2;
            const label = polarToCartesian(CENTER, CENTER, RADIUS * 0.62, mid);
            return (
              <g key={slice.id}>
                <path
                  d={describeSlice(CENTER, CENTER, RADIUS, start, end)}
                  fill={slice.color}
                  fillOpacity={0.85}
                  stroke="#0b0b0f"
                  strokeWidth={2}
                />
                <text
                  x={label.x}
                  y={label.y}
                  fill="#0b0b0f"
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${labelRotation(mid)}, ${label.x}, ${label.y})`}
                >
                  {truncate(slice.label, 16)}
                </text>
              </g>
            );
          })}
          <circle cx={CENTER} cy={CENTER} r={28} fill="#0b0b0f" stroke="#a855f7" strokeWidth={2} />
        </motion.svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="mt-4 flex items-center gap-2 rounded-full bg-purple px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple/30 transition disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        {spinning ? "Spinning…" : "SPIN"}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass glow-purple mt-4 w-full rounded-xl border border-purple/40 p-4 text-center"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-purple">
              Today&apos;s constraint
            </p>
            <p className="mt-1 text-base font-semibold">{result.label}</p>
            {result.description && (
              <p className="mt-1 text-xs text-foreground/60">{result.description}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
