"use client";

import { BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { getPreferences } from "@/lib/repo";
import { cn } from "@/lib/utils";
import { DefconTracker } from "@/components/layout/DefconTracker";
import { SettingsMenu } from "@/components/layout/SettingsMenu";

const NAV = [
  { type: "study", label: "Wheel", icon: BookOpen },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!getPreferences(user.id)) {
      router.replace("/onboarding");
    }
  }, [loading, user, router]);

  if (!user) return null;

  return (
    <TenantProvider>
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </TenantProvider>
  );
}

function Header() {
  const pathname = usePathname();
  const { xp } = useTenant();

  return (
    <header className="glass sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
      <div className="flex items-center gap-6">
        <Link href="/hub" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground/70 hover:text-foreground transition">
          <Sparkles className="h-4 w-4 text-emerald" />
          ← Hub
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map(({ type, label, icon: Icon }) => {
            const active = pathname.startsWith(`/dashboard/${type}`);
            return (
              <Link
                key={type}
                href={`/dashboard/${type}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition",
                  active
                    ? "bg-charcoal text-foreground"
                    : "text-foreground/50 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <DefconTracker xp={xp} />
        <SettingsMenu />
      </div>
    </header>
  );
}
