"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTenant } from "@/contexts/TenantContext";
import {
  getEgoBankEntries,
  getWheelSlices,
  getWorkbenchSubmissions,
} from "@/lib/repo";
import { MutationWheel } from "@/components/wheel/MutationWheel";
import { SearchBar } from "@/components/search/SearchBar";
import { EgoBankGrid } from "@/components/egobank/EgoBankGrid";
import { Workbench } from "@/components/workbench/Workbench";

export default function TenantPage() {
  const { tenant } = useTenant();

  const slices = useMemo(() => (tenant ? getWheelSlices(tenant) : []), [tenant]);
  const entries = useMemo(() => (tenant ? getEgoBankEntries(tenant.id) : []), [tenant]);
  const submissions = useMemo(
    () => (tenant ? getWorkbenchSubmissions(tenant.id) : []),
    [tenant]
  );

  if (!tenant) return null;

  return (
    <div key={tenant.id} className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col items-center gap-4">
        <MutationWheel tenantId={tenant.id} initialSlices={slices} />
        <div className="w-full max-w-md">
          <SearchBar tenantId={tenant.id} />
        </div>
      </div>

      {tenant.type === "study" && (
        <>
          <Link
            href="/notes/new"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 24px",
              background: "linear-gradient(135deg, rgba(15,22,42,0.95), rgba(10,16,32,0.95))",
              border: "1px solid rgba(245,158,11,0.18)",
              borderRadius: 12,
              textDecoration: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(245,158,11,0.45)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px rgba(245,158,11,0.08)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(245,158,11,0.18)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}
              >
                ✦
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#e2e8f8" }}>
                  Transform notes into an experience
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#576a96" }}>
                  Paste your notes → AI builds a cinematic study session
                </p>
              </div>
            </div>
            <span style={{ fontSize: 20, color: "#f59e0b", marginLeft: 16 }}>→</span>
          </Link>
          <Workbench tenantId={tenant.id} initialSubmissions={submissions} />
        </>
      )}

      <EgoBankGrid tenantId={tenant.id} initialEntries={entries} />
    </div>
  );
}
