"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, GitBranch, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import {
  createWorkbenchSubmission,
  updateWorkbenchSubmission,
} from "@/lib/repo";
import type { WorkbenchSubmission } from "@/types/schema";
import { cn } from "@/lib/utils";

const LANGUAGES = ["python", "javascript", "typescript", "java", "cpp"];

export function Workbench({
  tenantId,
  initialSubmissions,
}: {
  tenantId: string;
  initialSubmissions: WorkbenchSubmission[];
}) {
  const [content, setContent] = useState(
    initialSubmissions[0]?.content ?? "# Write your solution here\n"
  );
  const [language, setLanguage] = useState("python");
  const [checking, setChecking] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [submission, setSubmission] = useState<WorkbenchSubmission | null>(
    initialSubmissions[0] ?? null
  );

  function handleCheck() {
    setChecking(true);
    const next =
      submission ??
      createWorkbenchSubmission(tenantId, { content, contentType: "code", topicId: null });

    setTimeout(() => {
      const passed = content.trim().length > 20;
      const status = passed ? "reviewed" : "flagged";
      const updated = updateWorkbenchSubmission(tenantId, next.id, { content, status });
      setSubmission(updated.find((s) => s.id === next.id) ?? null);
      setChecking(false);
    }, 900);
  }

  function handlePush() {
    if (!submission) return;
    setPushing(true);
    // Stub: real implementation will call GitHub's API with this payload shape.
    const payload = {
      repo: "devquest-submissions",
      path: `submissions/${submission.id}.${language}`,
      message: `DevQuest: ${submission.id}`,
      content,
    };
    console.log("push to GitHub (stub)", payload);

    setTimeout(() => {
      const updated = updateWorkbenchSubmission(tenantId, submission.id, {
        pushedToGithub: true,
      });
      setSubmission(updated.find((s) => s.id === submission.id) ?? null);
      setPushing(false);
    }, 700);
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground/60">Workbench</h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-lg bg-charcoal px-2 py-1 text-xs outline-none"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        spellCheck={false}
        className="w-full resize-none rounded-xl bg-charcoal p-4 font-mono text-sm leading-relaxed outline-none focus:ring-1 focus:ring-emerald"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          onClick={handleCheck}
          disabled={checking}
          className="flex items-center gap-2 rounded-lg bg-emerald px-4 py-2 text-xs font-semibold text-void disabled:opacity-50"
        >
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {checking ? "Checking…" : "Check Code"}
        </button>

        <button
          onClick={handlePush}
          disabled={!submission || pushing}
          className="flex items-center gap-2 rounded-lg border border-border-glass bg-charcoal px-4 py-2 text-xs font-medium transition hover:bg-charcoal-soft disabled:opacity-40"
        >
          {pushing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitBranch className="h-3.5 w-3.5" />
          )}
          {submission?.pushedToGithub ? "Pushed" : "Push to GitHub"}
        </button>
      </div>

      <AnimatePresence>
        {submission && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className={cn(
              "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
              submission.status === "reviewed" && "bg-emerald/10 text-emerald",
              submission.status === "flagged" && "bg-purple/10 text-purple",
              submission.status === "pending" && "bg-charcoal text-foreground/50"
            )}
          >
            {submission.status === "reviewed" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {submission.status === "flagged" && <XCircle className="h-3.5 w-3.5" />}
            {submission.status === "reviewed" && "Looks solid — nice work."}
            {submission.status === "flagged" && "Too short to evaluate — add more detail."}
            {submission.status === "pending" && "Awaiting check."}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
