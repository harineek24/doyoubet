"use client";

import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import type { EgoBankEntry } from "@/types/schema";
import { cn } from "@/lib/utils";

export function EgoBankCard({
  entry,
  onViewBreakdown,
}: {
  entry: EgoBankEntry;
  onViewBreakdown: () => void;
}) {
  const accent = entry.isXpToken ? "purple" : "emerald";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "glass mb-4 break-inside-avoid rounded-2xl border p-4",
        accent === "emerald" ? "border-emerald/40 glow-emerald" : "border-purple/40 glow-purple"
      )}
    >
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
