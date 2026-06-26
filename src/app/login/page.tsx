"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, loading, isDemoMode, signInWithGoogle, signInDemo } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/onboarding");
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass w-full max-w-sm rounded-2xl p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10">
          <Sparkles className="h-6 w-6 text-emerald" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">DevQuest</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Positive reinforcement for engineering practice.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {isDemoMode ? (
            <>
              <button
                onClick={signInDemo}
                className="w-full rounded-xl bg-emerald px-4 py-3 text-sm font-medium text-void transition hover:opacity-90"
              >
                Continue in Demo Mode
              </button>
              <p className="text-xs text-foreground/40">
                No Supabase project connected yet — your data stays in this
                browser until one is configured.
              </p>
            </>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="w-full rounded-xl border border-border-glass bg-charcoal px-4 py-3 text-sm font-medium transition hover:bg-charcoal-soft"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </motion.div>
    </main>
  );
}
