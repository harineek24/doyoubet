import type { SupabaseClient } from "@supabase/supabase-js";
import type { GithubConnection } from "@/types/schema";

interface GithubConnectionRow {
  user_id: string;
  access_token: string;
  github_username: string;
  repo_full_name: string | null;
  connected_at: string;
}

function fromRow(row: GithubConnectionRow): GithubConnection {
  return {
    userId: row.user_id,
    accessToken: row.access_token,
    githubUsername: row.github_username,
    repoFullName: row.repo_full_name,
    connectedAt: row.connected_at,
  };
}

export async function getGithubConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<GithubConnection | null> {
  const { data, error } = await supabase
    .from("github_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data as GithubConnectionRow);
}

export async function upsertGithubConnection(
  supabase: SupabaseClient,
  conn: Pick<GithubConnection, "userId" | "accessToken" | "githubUsername">
): Promise<void> {
  await supabase.from("github_connections").upsert({
    user_id: conn.userId,
    access_token: conn.accessToken,
    github_username: conn.githubUsername,
  });
}

export async function setGithubRepo(
  supabase: SupabaseClient,
  userId: string,
  repoFullName: string
): Promise<void> {
  await supabase
    .from("github_connections")
    .update({ repo_full_name: repoFullName })
    .eq("user_id", userId);
}
