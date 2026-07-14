"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readKey, writeKey } from "@/lib/store/localStore";
import { DEMO_USER_ID } from "@/lib/store/seed";
import { fetchGithubUser } from "@/lib/github";
import { upsertGithubConnection } from "@/lib/githubConnection";

export interface AuthUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isDemoMode: boolean;
  signInWithGoogle: (joinToken?: string) => Promise<void>;
  connectGithub: () => Promise<void>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<AuthUser | null>(() =>
    supabase ? null : readKey<AuthUser | null>("auth:demoUser", null)
  );
  const [loading, setLoading] = useState(() => Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const sessionUser = data.session?.user;
      setUser(
        sessionUser
          ? {
              id: sessionUser.id,
              displayName:
                sessionUser.user_metadata?.full_name ??
                sessionUser.email ??
                "Engineer",
              avatarUrl: sessionUser.user_metadata?.avatar_url ?? null,
            }
          : null
      );
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      const sessionUser = session?.user;
      setUser(
        sessionUser
          ? {
              id: sessionUser.id,
              displayName:
                sessionUser.user_metadata?.full_name ??
                sessionUser.email ??
                "Engineer",
              avatarUrl: sessionUser.user_metadata?.avatar_url ?? null,
            }
          : null
      );

      const providerToken = (session as Session & { provider_token?: string })?.provider_token;
      if (sessionUser && providerToken) {
        const isGithubIdentity = sessionUser.identities?.some((i) => i.provider === "github");
        if (isGithubIdentity) {
          fetchGithubUser(providerToken)
            .then((githubUser) =>
              upsertGithubConnection(supabase, {
                userId: sessionUser.id,
                accessToken: providerToken,
                githubUsername: githubUser.login,
              })
            )
            .catch(() => {});
        }
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const signInWithGoogle = useCallback(async (joinToken?: string) => {
    if (!supabase) return;
    const redirect = joinToken
      ? `${window.location.origin}/onboarding?join=${joinToken}`
      : `${window.location.origin}/onboarding`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect },
    });
  }, [supabase]);

  const connectGithub = useCallback(async () => {
    if (!supabase) return;
    // Return the user to wherever they clicked "Connect GitHub" from (e.g. a
    // chapter's Practice tab), not a fixed page — otherwise anything they'd
    // typed there is lost when they land somewhere else after OAuth.
    const redirect = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    await supabase.auth.linkIdentity({
      provider: "github",
      options: {
        scopes: "repo",
        redirectTo: redirect,
      },
    });
  }, [supabase]);

  const signInDemo = useCallback(() => {
    const demoUser: AuthUser = {
      id: DEMO_USER_ID,
      displayName: "Demo Engineer",
      avatarUrl: null,
    };
    writeKey("auth:demoUser", demoUser);
    setUser(demoUser);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      writeKey("auth:demoUser", null);
      setUser(null);
    }
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode: !isSupabaseConfigured,
        signInWithGoogle,
        connectGithub,
        signInDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
