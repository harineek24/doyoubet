"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    const joinRedirect = localStorage.getItem("devquest_join_redirect");
    if (joinRedirect) {
      localStorage.removeItem("devquest_join_redirect");
      router.replace(joinRedirect);
      return;
    }
    router.replace("/onboarding");
  }, [loading, user, router]);

  return null;
}
