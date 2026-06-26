"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { XpProgress } from "@/types/schema";

export function DefconTracker({ xp }: { xp: XpProgress | null }) {
  if (!xp) return null;
  const pct = Math.min(100, Math.round((xp.currentXp / xp.xpToNextLevel) * 100));

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-full bg-charcoal px-3 py-1.5 text-xs font-medium">
        <Zap className="h-3.5 w-3.5 text-emerald" />
        Level {xp.level}
      </div>
      <div className="hidden w-40 flex-col gap-1 sm:flex">
        <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal">
          <motion.div
            className="h-full rounded-full bg-emerald glow-emerald"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <span className="text-[10px] text-foreground/40">
          {xp.currentXp} / {xp.xpToNextLevel} XP · {xp.totalDeposits} deposits
        </span>
      </div>
    </div>
  );
}
