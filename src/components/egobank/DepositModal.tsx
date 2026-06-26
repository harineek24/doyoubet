"use client";

import { motion } from "framer-motion";
import { ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import type { EgoBankEntry } from "@/types/schema";

export function DepositModal({
  onSave,
  onClose,
}: {
  onSave: (input: Pick<EgoBankEntry, "title" | "tags" | "thumbnailUrl" | "markdownBody" | "isXpToken">) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [markdownBody, setMarkdownBody] = useState("");
  const [isXpToken, setIsXpToken] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accent = isXpToken ? "purple" : "emerald";
  const canSave = title.trim().length > 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setThumbnailUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!canSave) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));
    onSave({ title: title.trim(), tags, thumbnailUrl, markdownBody, isXpToken });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "glass max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 transition-colors",
          accent === "emerald" ? "border-emerald/40" : "border-purple/40"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deposit New Trophy</h2>
          <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={cn(
            "mb-4 flex items-center justify-between rounded-xl p-3",
            accent === "emerald" ? "bg-emerald/10" : "bg-purple/10"
          )}
        >
          <div>
            <p className="text-sm font-medium">XP Token (Failure Breakdown)</p>
            <p className="text-xs text-foreground/50">
              Toggle on for a deep-dive into something that didn&apos;t go well.
            </p>
          </div>
          <Switch checked={isXpToken} onChange={setIsXpToken} />
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="rounded-lg bg-charcoal px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald"
          />
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags, comma separated (e.g. SystemDesign, LeetCode)"
            className="rounded-lg bg-charcoal px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border-glass bg-charcoal/50 px-3 py-6 text-xs text-foreground/50 transition hover:text-foreground"
          >
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="Preview" className="h-16 rounded object-cover" />
            ) : (
              <>
                <ImageIcon className="h-4 w-4" />
                Upload screenshot
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <textarea
            value={markdownBody}
            onChange={(e) => setMarkdownBody(e.target.value)}
            placeholder="Markdown: code snippets, learnings…"
            rows={6}
            className="resize-none rounded-lg bg-charcoal px-3 py-2 font-mono text-xs outline-none focus:ring-1 focus:ring-emerald"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-void transition disabled:opacity-40",
              accent === "emerald" ? "bg-emerald hover:opacity-90" : "bg-purple hover:opacity-90"
            )}
          >
            Deposit
          </button>
        </div>
      </motion.div>
    </div>
  );
}
