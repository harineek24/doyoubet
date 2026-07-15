"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, GitBranch, Loader2, Play, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createWorkbenchSubmission,
  updateWorkbenchSubmission,
} from "@/lib/repo";
import { ensureRepo, pushFile } from "@/lib/github";
import { getGithubConnection, setGithubRepo } from "@/lib/githubConnection";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { GithubConnection, RunResult, WorkbenchSubmission } from "@/types/schema";
import { cn } from "@/lib/utils";

const LANGUAGES = ["python", "javascript", "typescript", "java", "cpp"];
const EXTENSIONS: Record<string, string> = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  java: "java",
  cpp: "cpp",
};
const REPO_NAME = "devquest-submissions";

export function Workbench({
  tenantId,
  initialSubmissions,
}: {
  tenantId: string;
  initialSubmissions: WorkbenchSubmission[];
}) {
  const { user, connectGithub } = useAuth();
  const [content, setContent] = useState(
    initialSubmissions[0]?.content ?? "# Write your solution here\n"
  );
  const [language, setLanguage] = useState("python");
  const [running, setRunning] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushedUrl, setPushedUrl] = useState<string | null>(null);
  const [submission, setSubmission] = useState<WorkbenchSubmission | null>(
    initialSubmissions[0] ?? null
  );
  const [githubConnection, setGithubConnection] = useState<GithubConnection | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;
    getGithubConnection(supabase, user.id).then(setGithubConnection);
  }, [user]);

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunResult({ stdout: "", stderr: data.error ?? "Run failed", exitCode: 1 });
      } else {
        setRunResult(data);
      }

      const status = data.exitCode === 0 ? "reviewed" : "flagged";
      const next =
        submission ??
        createWorkbenchSubmission(tenantId, { content, contentType: "code", topicId: null });
      const updated = updateWorkbenchSubmission(tenantId, next.id, { content, status });
      setSubmission(updated.find((s) => s.id === next.id) ?? next);
    } finally {
      setRunning(false);
    }
  }

  async function handlePush() {
    if (!submission) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user || !githubConnection) return;

    setPushing(true);
    setPushError(null);
    try {
      const repoFullName =
        githubConnection.repoFullName ?? (await ensureRepo(githubConnection.accessToken, REPO_NAME));
      if (!githubConnection.repoFullName) {
        await setGithubRepo(supabase, user.id, repoFullName);
        setGithubConnection({ ...githubConnection, repoFullName });
      }

      const ext = EXTENSIONS[language] ?? "txt";
      const path = `study/${submission.id}.${ext}`;
      const { htmlUrl } = await pushFile(
        githubConnection.accessToken,
        repoFullName,
        path,
        content,
        `Betonyou: Study submission ${submission.id}`
      );

      const updated = updateWorkbenchSubmission(tenantId, submission.id, { pushedToGithub: true });
      setSubmission(updated.find((s) => s.id === submission.id) ?? null);
      setPushedUrl(htmlUrl);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Push failed");
    } finally {
      setPushing(false);
    }
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
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 rounded-lg bg-emerald px-4 py-2 text-xs font-semibold text-void disabled:opacity-50"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? "Running…" : "Run Code"}
        </button>

        {githubConnection ? (
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
            {submission?.pushedToGithub ? "Pushed" : `Push to ${githubConnection.githubUsername}/${REPO_NAME}`}
          </button>
        ) : (
          <button
            onClick={connectGithub}
            className="flex items-center gap-2 rounded-lg border border-border-glass bg-charcoal px-4 py-2 text-xs font-medium transition hover:bg-charcoal-soft"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Connect GitHub to push
          </button>
        )}
      </div>

      <AnimatePresence>
        {runResult && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className={cn(
              "mt-3 rounded-lg px-3 py-2 text-xs",
              runResult.exitCode === 0 ? "bg-emerald/10 text-emerald" : "bg-purple/10 text-purple"
            )}
          >
            <div className="flex items-center gap-2 font-medium">
              {runResult.exitCode === 0 ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {runResult.exitCode === 0 ? "Ran successfully" : `Exited with code ${runResult.exitCode}`}
            </div>
            {runResult.stdout && (
              <pre className="mt-2 whitespace-pre-wrap font-mono text-foreground/80">{runResult.stdout}</pre>
            )}
            {runResult.stderr && (
              <pre className="mt-2 whitespace-pre-wrap font-mono text-red-400">{runResult.stderr}</pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {pushedUrl && (
        <p className="mt-2 text-xs text-foreground/50">
          Pushed —{" "}
          <a href={pushedUrl} target="_blank" rel="noopener noreferrer" className="text-emerald underline">
            view on GitHub
          </a>
        </p>
      )}
      {pushError && <p className="mt-2 text-xs text-red-400">{pushError}</p>}
    </div>
  );
}
