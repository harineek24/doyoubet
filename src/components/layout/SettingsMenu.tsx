"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Compass, Dice5, GitBranch, LogOut, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPreferences, savePreferences } from "@/lib/repo";
import { getGithubConnection } from "@/lib/githubConnection";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GithubConnection, LearningStyle } from "@/types/schema";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function SettingsMenu() {
  const { user, signOut, connectGithub } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const prefs = user ? getPreferences(user.id) : null;
  const [learningStyle, setLearningStyle] = useState<LearningStyle>(
    prefs?.learningStyle ?? "spontaneous"
  );
  const [githubConnection, setGithubConnection] = useState<GithubConnection | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;
    getGithubConnection(supabase, user.id).then(setGithubConnection);
  }, [user]);

  function selectStyle(style: LearningStyle) {
    if (!user || !prefs) return;
    setLearningStyle(style);
    savePreferences({ ...prefs, learningStyle: style, updatedAt: new Date().toISOString() });
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal transition hover:bg-charcoal-soft"
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass absolute right-0 top-11 z-50 w-64 rounded-xl p-3"
          >
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-foreground/40">
              Learning style
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => selectStyle("spontaneous")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border border-border-glass p-2 text-xs transition",
                  learningStyle === "spontaneous" && "border-emerald/60 text-emerald"
                )}
              >
                <Dice5 className="h-4 w-4" />
                Spontaneous
              </button>
              <button
                onClick={() => selectStyle("structured")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border border-border-glass p-2 text-xs transition",
                  learningStyle === "structured" && "border-emerald/60 text-emerald"
                )}
              >
                <Compass className="h-4 w-4" />
                Structured
              </button>
            </div>

            <div className="mt-3 border-t border-border-glass pt-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-foreground/40">
                GitHub
              </p>
              {githubConnection ? (
                <p className="flex items-center gap-2 text-xs text-foreground/70">
                  <GitBranch className="h-3.5 w-3.5 text-emerald" />
                  Connected as @{githubConnection.githubUsername}
                </p>
              ) : (
                <button
                  onClick={connectGithub}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-foreground/60 transition hover:bg-charcoal hover:text-foreground"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  Connect GitHub
                </button>
              )}
            </div>

            <button
              onClick={handleSignOut}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-foreground/60 transition hover:bg-charcoal hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
