"use client";

import { motion } from "framer-motion";
import { ImageIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import type { EgoBankEntry } from "@/types/schema";
import { cn } from "@/lib/utils";

export function EgoBankCard({
  entry,
  onViewBreakdown,
  onDelete,
}: {
  entry: EgoBankEntry;
  onViewBreakdown: () => void;
  onDelete: () => void;
}) {
  const accent = entry.isXpToken ? "purple" : "emerald";
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "glass relative mb-4 break-inside-avoid rounded-2xl border p-4",
        accent === "emerald" ? "border-emerald/40 glow-emerald" : "border-purple/40 glow-purple"
      )}
    >
      <button
        onClick={() => setConfirming(true)}
        aria-label="Delete entry"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-charcoal/80 text-foreground/40 transition hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {confirming && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-void/90 p-4 text-center">
          <p className="text-sm font-medium">Delete this entry?</p>
          <p className="text-xs text-foreground/50">This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-foreground/60 transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-charcoal">
        {entry.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.thumbnailUrl}
            alt={entry.title}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <ImageIcon className="h-6 w-6 text-foreground/20" />
        )}
      </div>

      <h3 className="text-sm font-semibold">{entry.title}</h3>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px]",
              accent === "emerald" ? "bg-emerald/10 text-emerald" : "bg-purple/10 text-purple"
            )}
          >
            {tag}
          </span>
        ))}
      </div>

      <button
        onClick={onViewBreakdown}
        className="mt-3 w-full rounded-lg bg-charcoal px-3 py-2 text-xs font-medium transition hover:bg-charcoal-soft"
      >
        View Breakdown
      </button>
    </motion.div>
  );
}
