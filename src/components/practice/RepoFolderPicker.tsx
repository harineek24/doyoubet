"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Folder, ChevronRight } from "lucide-react";
import { listUserRepos, listRepoContents, type GithubRepoSummary, type GithubContentEntry } from "@/lib/github";

const SERIF = 'var(--font-playfair, Georgia, "Book Antiqua", Palatino, serif)';
const MONO = "var(--font-geist-mono, 'Courier New', monospace)";

/** Repo + folder selector, no commit button of its own — reports the current
 * choice via onChange so the caller decides what/when to push. */
export function RepoFolderPicker({
  token,
  defaultRepo,
  defaultPath,
  accentColor,
  onChange,
}: {
  token: string;
  defaultRepo: string | null;
  defaultPath: string;
  accentColor: string;
  onChange: (repoFullName: string, path: string) => void;
}) {
  const [repos, setRepos] = useState<GithubRepoSummary[] | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(defaultRepo);
  const [currentPath, setCurrentPath] = useState(defaultPath.replace(/^\/|\/$/g, ""));
  const [entries, setEntries] = useState<GithubContentEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notifiedInitial = useRef(false);

  useEffect(() => {
    listUserRepos(token)
      .then((list) => {
        setRepos(list);
        if (!selectedRepo && list.length > 0) setSelectedRepo(list[0].fullName);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load repositories"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadEntries = useCallback(
    (repo: string, path: string) => {
      setLoadingEntries(true);
      listRepoContents(token, repo, path)
        .then((list) => setEntries(list.filter((e) => e.type === "dir")))
        .catch(() => setEntries([]))
        .finally(() => setLoadingEntries(false));
    },
    [token]
  );

  useEffect(() => {
    if (!selectedRepo) return;
    loadEntries(selectedRepo, currentPath);
    onChange(selectedRepo, currentPath);
    notifiedInitial.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepo, currentPath, loadEntries]);

  const pathParts = currentPath.split("/").filter(Boolean);

  function goToBreadcrumb(index: number) {
    setCurrentPath(pathParts.slice(0, index + 1).join("/"));
  }

  function confirmNewFolder() {
    const name = newFolderInput.trim().replace(/[/\\]/g, "-");
    if (!name) return;
    setCurrentPath(currentPath ? `${currentPath}/${name}` : name);
    setNewFolderInput("");
    setShowNewFolder(false);
  }

  return (
    <div style={{ background: "rgba(245,158,11,0.04)", border: `1px solid ${accentColor}33`, borderRadius: 12, padding: "0.9rem 1rem" }}>
      <label style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.72rem", color: "rgba(245,158,11,0.5)", display: "block", marginBottom: 5 }}>
        Repository
      </label>
      {repos === null ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(245,158,11,0.4)", fontSize: 12.5, padding: "6px 0" }}>
          <Loader2 size={13} className="animate-spin" /> Loading your repositories…
        </div>
      ) : (
        <select
          value={selectedRepo ?? ""}
          onChange={(e) => { setSelectedRepo(e.target.value); setCurrentPath(""); }}
          style={{
            width: "100%", fontFamily: MONO, fontSize: 12.5,
            background: "#080504", border: `1px solid ${accentColor}44`, borderRadius: 8,
            padding: "6px 10px", color: "rgba(254,249,231,0.88)", marginBottom: 10, cursor: "pointer", outline: "none",
          }}
        >
          {repos.map((r) => (
            <option key={r.fullName} value={r.fullName}>{r.fullName}{r.private ? " (private)" : ""}</option>
          ))}
        </select>
      )}

      <label style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.72rem", color: "rgba(245,158,11,0.5)", display: "block", marginBottom: 5 }}>
        Folder
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", fontFamily: MONO, fontSize: 11.5, color: "rgba(245,158,11,0.45)", marginBottom: 6 }}>
        <button onClick={() => setCurrentPath("")} style={{ background: "none", border: "none", color: pathParts.length === 0 ? accentColor : "rgba(245,158,11,0.45)", cursor: "pointer", padding: "1px 3px", fontFamily: "inherit" }}>
          root
        </button>
        {pathParts.map((part, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronRight size={10} />
            <button onClick={() => goToBreadcrumb(i)} style={{ background: "none", border: "none", color: i === pathParts.length - 1 ? accentColor : "rgba(245,158,11,0.45)", cursor: "pointer", padding: "1px 3px", fontFamily: "inherit" }}>
              {part}
            </button>
          </span>
        ))}
      </div>

      <div style={{ background: "#080504", border: `1px solid ${accentColor}22`, borderRadius: 8, minHeight: 38, maxHeight: 130, overflowY: "auto", marginBottom: 8 }}>
        {loadingEntries ? (
          <div style={{ padding: 10, fontSize: 11.5, color: "rgba(245,158,11,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
            <Loader2 size={12} className="animate-spin" /> Loading folders…
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 10, fontSize: 11.5, color: "rgba(245,158,11,0.3)" }}>No subfolders here yet.</div>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.path}
              onClick={() => setCurrentPath(entry.path)}
              style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${accentColor}18`, padding: "6px 10px", fontSize: 12, color: "rgba(254,249,231,0.85)", cursor: "pointer", fontFamily: "inherit" }}
            >
              <Folder size={12} color={accentColor} /> {entry.name}
            </button>
          ))
        )}
      </div>

      {showNewFolder ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input
            autoFocus
            value={newFolderInput}
            onChange={(e) => setNewFolderInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmNewFolder()}
            placeholder="new-folder-name"
            style={{ flex: 1, fontFamily: MONO, fontSize: 12, background: "#080504", border: `1px solid ${accentColor}44`, borderRadius: 8, padding: "5px 10px", color: "rgba(254,249,231,0.88)", outline: "none" }}
          />
          <button onClick={confirmNewFolder} style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}55`, borderRadius: 8, color: accentColor, padding: "0 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewFolder(true)}
          style={{ background: "none", border: "none", color: "rgba(245,158,11,0.45)", fontSize: 11.5, cursor: "pointer", padding: 0, fontFamily: SERIF, fontStyle: "italic", textDecoration: "underline" }}
        >
          + New folder
        </button>
      )}

      {error && <p style={{ marginTop: 8, fontSize: 11.5, color: "#f87171", fontFamily: SERIF, fontStyle: "italic" }}>{error}</p>}
    </div>
  );
}
