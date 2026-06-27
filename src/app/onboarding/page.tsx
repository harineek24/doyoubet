"use client";

import { motion } from "framer-motion";
import { Compass, Dice5, Code2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPreferences, getTenants, savePreferences } from "@/lib/repo";
import type { Domain, LearningStyle } from "@/types/schema";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [domain, setDomain] = useState<Domain>("generic");
  const [learningStyle, setLearningStyle] = useState<LearningStyle>("spontaneous");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const existing = getPreferences(user.id);
    if (existing) {
      getTenants(user.id);
      router.replace("/dashboard/study");
    }
  }, [loading, user, router]);

  if (!user) return null;

  function handleContinue() {
    savePreferences({
      userId: user!.id,
      domain,
      learningStyle,
      activeTenantId: null,
      updatedAt: new Date().toISOString(),
    });
    getTenants(user!.id);
    if (domain === "cs_sde") {
      router.replace("/cs-intro");
    } else {
      router.replace("/dashboard/study");
    }
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <h1 className="text-center text-2xl font-semibold tracking-tight">
          How do you want to learn?
        </h1>
        <p className="mt-2 text-center text-sm text-foreground/60">
          You can change this anytime from settings.
        </p>

        <section className="mt-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground/40">
            Subject domain
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              active={domain === "generic"}
              onClick={() => setDomain("generic")}
              title="Generic"
              description="Any subject — language, fitness, music, anything."
            />
            <OptionCard
              active={domain === "cs_sde"}
              onClick={() => setDomain("cs_sde")}
              icon={<Code2 className="h-4 w-4" />}
              title="CS / SDE"
              description="Data structures, algorithms, systems, and more."
            />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground/40">
            Learning style
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              active={learningStyle === "spontaneous"}
              onClick={() => setLearningStyle("spontaneous")}
              icon={<Dice5 className="h-4 w-4" />}
              title="Spontaneous"
              description="Wheel-driven, random, discovery-first."
            />
            <OptionCard
              active={learningStyle === "structured"}
              onClick={() => setLearningStyle("structured")}
              icon={<Compass className="h-4 w-4" />}
              title="Structured"
              description="Follow a guided roadmap, step by step."
            />
          </div>
        </section>

        <button
          onClick={handleContinue}
          className="mt-8 w-full rounded-xl bg-emerald px-4 py-3 text-sm font-medium text-void transition hover:opacity-90"
        >
          Enter DevQuest
        </button>
      </motion.div>
    </main>
  );
}

function OptionCard({
  active,
  disabled,
  onClick,
  title,
  description,
  icon,
}: {
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "glass rounded-xl p-4 text-left transition",
        active && "border-emerald/60 glow-emerald",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-xs text-foreground/50">{description}</p>
    </button>
  );
}
