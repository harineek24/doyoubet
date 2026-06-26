"use client";

import { useMemo } from "react";
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
        <Workbench tenantId={tenant.id} initialSubmissions={submissions} />
      )}

      <EgoBankGrid tenantId={tenant.id} initialEntries={entries} />
    </div>
  );
}
