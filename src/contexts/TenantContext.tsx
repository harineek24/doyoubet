"use client";

import { useParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getTenants, getXpProgress } from "@/lib/repo";
import type { Tenant, TenantType, XpProgress } from "@/types/schema";

interface TenantContextValue {
  tenant: Tenant | null;
  tenants: Tenant[];
  xp: XpProgress | null;
  refreshXp: () => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const params = useParams<{ tenant: string }>();
  const [refreshKey, setRefreshKey] = useState(0);

  const tenants = useMemo(() => (user ? getTenants(user.id) : []), [user]);
  const tenant =
    tenants.find((t) => t.type === (params.tenant as TenantType)) ?? null;

  const xp = useMemo(
    () => (tenant ? getXpProgress(tenant.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenant, refreshKey]
  );

  const refreshXp = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <TenantContext.Provider value={{ tenant, tenants, xp, refreshXp }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
