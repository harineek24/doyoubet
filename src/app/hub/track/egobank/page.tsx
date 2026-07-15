"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DirectTenantProvider, useTenant } from "@/contexts/TenantContext";
import { getEgoBankEntries } from "@/lib/repo";
import { EgoBankGrid } from "@/components/egobank/EgoBankGrid";
import { DefconTracker } from "@/components/layout/DefconTracker";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';

function EgoBankContent() {
  const { tenant, xp } = useTenant();
  const router = useRouter();

  const entries = useMemo(
    () => (tenant ? getEgoBankEntries(tenant.id) : []),
    [tenant]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d" }}>
      {/* Top bar */}
      <div className="glass sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <button
          onClick={() => router.push("/hub")}
          style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.8rem", color: "rgba(52,211,153,0.6)", background: "none", border: "none", cursor: "pointer" }}
        >
          ← Hub
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span style={{ fontFamily: SERIF, fontStyle: "italic" }}>Track</span>
        </div>
        <DefconTracker xp={xp} />
      </div>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8">
        {tenant ? (
          <EgoBankGrid tenantId={tenant.id} initialEntries={entries} />
        ) : (
          <p style={{ fontFamily: SERIF, fontStyle: "italic", color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: "4rem" }}>
            Loading your track…
          </p>
        )}
      </main>
    </div>
  );
}

export default function EgoBankPage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <DirectTenantProvider type="study">
      <EgoBankContent />
    </DirectTenantProvider>
  );
}
