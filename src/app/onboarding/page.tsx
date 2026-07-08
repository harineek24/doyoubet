"use client";

import { motion } from "framer-motion";
import { Compass, Dice5, Code2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPreferences, getTenants, savePreferences } from "@/lib/repo";
import type { Domain, LearningStyle, Subject } from "@/types/schema";
import { cn } from "@/lib/utils";

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: "computer_science", label: "Computer Science" },
];

function OnboardingInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinToken = searchParams.get("join");
  const [domain, setDomain] = useState<Domain>("generic");
  const [subject, setSubject] = useState<Subject>(SUBJECTS[0].value);
  const [learningStyle, setLearningStyle] = useState<LearningStyle>("spontaneous");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const existing = getPreferences(user.id);
    if (existing) {
      setDomain(existing.domain);
      if (existing.subject) setSubject(existing.subject);
      setLearningStyle(existing.learningStyle);
    }
  }, [loading, user, router]);

  if (!user) return null;

  function handleDomainChange(next: Domain) {
    setDomain(next);
    if (next === "generic") setLearningStyle("spontaneous");
  }

  function handleContinue() {
    savePreferences({
      userId: user!.id,
      domain,
      subject: domain === "cs_sde" ? subject : null,
      learningStyle,
      activeTenantId: null,
      updatedAt: new Date().toISOString(),
    });
    getTenants(user!.id);
    if (joinToken) { router.replace(`/cs-journey/join/${joinToken}`); return; }
    router.replace("/cs-intro");
  }

  const structuredDisabled = domain === "generic";

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
              onClick={() => handleDomainChange("generic")}
              title="Learn your own subject"
              description="Any subject — language, fitness, music, anything. Build your own path."
            />
            <OptionCard
              active={domain === "cs_sde"}
              onClick={() => handleDomainChange("cs_sde")}
              icon={<Code2 className="h-4 w-4" />}
              title="Learn a subject available here"
              description="Pick from subjects with a guided curriculum already built."
            />
          </div>

          {domain === "cs_sde" && (
            <div className="mt-3">
              <label className="mb-1.5 block text-xs text-foreground/50">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="glass w-full rounded-xl p-3 text-sm"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              disabled={structuredDisabled}
              onClick={() => setLearningStyle("structured")}
              icon={<Compass className="h-4 w-4" />}
              title="Structured"
              description={
                structuredDisabled
                  ? "Pick a subject available here to unlock a guided roadmap."
                  : "Follow a guided roadmap, step by step."
              }
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

export default function OnboardingPage() {
  return <Suspense><OnboardingInner /></Suspense>;
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
