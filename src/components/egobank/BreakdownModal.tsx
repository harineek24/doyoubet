"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { EgoBankEntry } from "@/types/schema";
import { cn } from "@/lib/utils";

export function BreakdownModal({
  entry,
  onClose,
}: {
  entry: EgoBankEntry;
  onClose: () => void;
}) {
  const accent = entry.isXpToken ? "purple" : "emerald";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "glass max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6",
          accent === "emerald" ? "border-emerald/40" : "border-purple/40"
        )}
      >
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p
              className={cn(
                "text-[10px] font-medium uppercase tracking-wider",
                accent === "emerald" ? "text-emerald" : "text-purple"
              )}
            >
              {entry.isXpToken ? "XP Token · Failure Breakdown" : "Win"}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{entry.title}</h2>
          </div>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-charcoal px-2 py-0.5 text-[10px]">
              {tag}
            </span>
          ))}
        </div>

        <article className="markdown-body mt-4 text-sm leading-relaxed text-foreground/80">
          <ReactMarkdown>{entry.markdownBody}</ReactMarkdown>
        </article>
      </motion.div>
    </div>
  );
}
