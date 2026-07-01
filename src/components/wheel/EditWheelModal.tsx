"use client";

import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { WheelSlice } from "@/types/schema";

const COLORS = ["#f59e0b", "#fb923c"];
const MIN_SLICES = 3;
const MAX_SLICES = 8;

export function EditWheelModal({
  slices,
  onSave,
  onClose,
}: {
  slices: WheelSlice[];
  onSave: (slices: WheelSlice[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<WheelSlice[]>(slices);

  function updateSlice(id: string, patch: Partial<WheelSlice>) {
    setDraft((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSlice(id: string) {
    if (draft.length <= MIN_SLICES) return;
    setDraft((prev) => prev.filter((s) => s.id !== id));
  }

  function addSlice() {
    if (draft.length >= MAX_SLICES) return;
    setDraft((prev) => [
      ...prev,
      {
        id: `slice-${Date.now()}`,
        tenantId: prev[0]?.tenantId ?? "",
        label: "New Constraint",
        description: "",
        color: COLORS[prev.length % COLORS.length],
        weight: 1,
      },
    ]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Wheel</h2>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {draft.map((slice) => (
            <div key={slice.id} className="flex items-start gap-2 rounded-lg bg-charcoal p-3">
              <span
                className="mt-2 h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex flex-1 flex-col gap-1">
                <input
                  value={slice.label}
                  onChange={(e) => updateSlice(slice.id, { label: e.target.value })}
                  className="rounded bg-charcoal-soft px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald"
                  placeholder="Constraint label"
                />
                <input
                  value={slice.description ?? ""}
                  onChange={(e) => updateSlice(slice.id, { description: e.target.value })}
                  className="rounded bg-charcoal-soft px-2 py-1 text-xs text-foreground/60 outline-none focus:ring-1 focus:ring-emerald"
                  placeholder="Description (optional)"
                />
              </div>
              <button
                onClick={() => removeSlice(slice.id)}
                disabled={draft.length <= MIN_SLICES}
                className="mt-1 text-foreground/40 transition hover:text-red-400 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addSlice}
          disabled={draft.length >= MAX_SLICES}
          className="mt-3 flex items-center gap-1.5 text-xs text-foreground/60 transition hover:text-foreground disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
          Add constraint
        </button>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="rounded-lg bg-emerald px-4 py-2 text-sm font-medium text-void transition hover:opacity-90"
          >
            Save wheel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
