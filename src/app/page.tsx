"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPreferences } from "@/lib/repo";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const prefs = getPreferences(user.id);
    router.replace(prefs ? "/dashboard/study" : "/onboarding");
  }, [loading, user, router]);

  return null;
}
