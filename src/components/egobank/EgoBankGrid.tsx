"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { createEgoBankEntry, depositXp } from "@/lib/repo";
import type { EgoBankEntry } from "@/types/schema";
import { EgoBankCard } from "@/components/egobank/EgoBankCard";
import { DepositModal } from "@/components/egobank/DepositModal";
import { BreakdownModal } from "@/components/egobank/BreakdownModal";
import { useTenant } from "@/contexts/TenantContext";

export function EgoBankGrid({
  tenantId,
  initialEntries,
}: {
  tenantId: string;
  initialEntries: EgoBankEntry[];
}) {
  const { refreshXp } = useTenant();
  const [entries, setEntries] = useState(initialEntries);
  const [depositing, setDepositing] = useState(false);
  const [viewing, setViewing] = useState<EgoBankEntry | null>(null);

  function handleSave(
    input: Pick<EgoBankEntry, "title" | "tags" | "thumbnailUrl" | "markdownBody" | "isXpToken">
  ) {
    const entry = createEgoBankEntry(tenantId, input);
    setEntries((prev) => [entry, ...prev]);
    depositXp(tenantId, input.isXpToken);
    refreshXp();
    setDepositing(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground/60">Ego Bank</h2>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setDepositing(true)}
          className="flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-xs font-semibold text-void"
        >
          <Plus className="h-3.5 w-3.5" />
          Deposit New Trophy
        </motion.button>
      </div>

      {entries.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-foreground/40">
          No deposits yet — your first win or breakdown goes here.
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {entries.map((entry) => (
            <EgoBankCard
              key={entry.id}
              entry={entry}
              onViewBreakdown={() => setViewing(entry)}
            />
          ))}
        </div>
      )}

      {depositing && (
        <DepositModal onSave={handleSave} onClose={() => setDepositing(false)} />
      )}
      {viewing && <BreakdownModal entry={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
