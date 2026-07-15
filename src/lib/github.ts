const API_BASE = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

export async function fetchGithubUser(token: string): Promise<{ login: string }> {
  const res = await fetch(`${API_BASE}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error("Failed to read GitHub user");
  return res.json();
}

/** Returns the repo's full_name, creating a private repo under the user's account if it doesn't exist yet. */
export async function ensureRepo(token: string, repoName: string): Promise<string> {
  const user = await fetchGithubUser(token);
  const getRes = await fetch(`${API_BASE}/repos/${user.login}/${repoName}`, {
    headers: headers(token),
  });
  if (getRes.ok) {
    const repo = await getRes.json();
    return repo.full_name;
  }

  const createRes = await fetch(`${API_BASE}/user/repos`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      name: repoName,
      private: true,
      description: "Betonyou submissions",
      auto_init: true,
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Failed to create repo: ${body}`);
  }
  const repo = await createRes.json();
  return repo.full_name;
}

export type GithubRepoSummary = { fullName: string; name: string; private: boolean };

/** Lists repos the authenticated user owns or collaborates on, most recently updated first. */
export async function listUserRepos(token: string): Promise<GithubRepoSummary[]> {
  const res = await fetch(`${API_BASE}/user/repos?per_page=100&sort=updated`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error("Failed to list repositories");
  const repos = await res.json();
  return repos.map((r: { full_name: string; name: string; private: boolean }) => ({
    fullName: r.full_name,
    name: r.name,
    private: r.private,
  }));
}

export type GithubContentEntry = { name: string; path: string; type: "dir" | "file" };

/** Lists the folders (and files) at a given path in a repo — "" for the repo root. */
export async function listRepoContents(
  token: string,
  repoFullName: string,
  path: string = ""
): Promise<GithubContentEntry[]> {
  const res = await fetch(`${API_BASE}/repos/${repoFullName}/contents/${path}`, {
    headers: headers(token),
  });
  if (res.status === 404) return []; // empty/nonexistent path — nothing to show yet
  if (!res.ok) throw new Error("Failed to list repository contents");
  const data = await res.json();
  const entries = Array.isArray(data) ? data : [data];
  return entries.map((e: { name: string; path: string; type: string }) => ({
    name: e.name,
    path: e.path,
    type: e.type === "dir" ? "dir" : "file",
  }));
}

/** Creates or updates a file at the given path in the repo. */
export async function pushFile(
  token: string,
  repoFullName: string,
  path: string,
  content: string,
  message: string
): Promise<{ htmlUrl: string }> {
  const contentBase64 = btoa(unescape(encodeURIComponent(content)));

  const existingRes = await fetch(`${API_BASE}/repos/${repoFullName}/contents/${path}`, {
    headers: headers(token),
  });
  const sha = existingRes.ok ? (await existingRes.json()).sha : undefined;

  const putRes = await fetch(`${API_BASE}/repos/${repoFullName}/contents/${path}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({
      message,
      content: contentBase64,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Failed to push file: ${body}`);
  }
  const data = await putRes.json();
  return { htmlUrl: data.content.html_url };
}
