import { readKey, writeKey } from "@/lib/store/localStore";
import {
  makeDefaultEgoBankEntries,
  makeDefaultTenants,
  makeDefaultWheelSlices,
  makeDefaultXpProgress,
} from "@/lib/store/seed";
import { BUILTIN_TRACKS, getBuiltinTrack } from "@/lib/store/tracks";
import type {
  EgoBankEntry,
  Tenant,
  Track,
  UserPreferences,
  WheelSlice,
  WheelSpinResult,
  WorkbenchSubmission,
  XpProgress,
} from "@/types/schema";

// Local-storage backed data layer, scoped per user. The shapes here mirror
// the Postgres schema in supabase/migrations/0001_init.sql 1:1, so the call
// sites below won't need to change when this swaps to real Supabase queries.

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPreferences(userId: string): UserPreferences | null {
  return readKey<UserPreferences | null>(`prefs:${userId}`, null);
}

export function savePreferences(prefs: UserPreferences): void {
  writeKey(`prefs:${prefs.userId}`, prefs);
}

export function getTenants(userId: string): Tenant[] {
  const existing = readKey<Tenant[]>(`tenants:${userId}`, []);
  if (existing.length > 0) return existing;
  const defaults = makeDefaultTenants(userId);
  writeKey(`tenants:${userId}`, defaults);
  return defaults;
}

export function getWheelSlices(tenant: Tenant): WheelSlice[] {
  const existing = readKey<WheelSlice[]>(`wheel:${tenant.id}`, []);
  if (existing.length > 0) return existing;
  const defaults = makeDefaultWheelSlices(tenant.id, tenant.type);
  writeKey(`wheel:${tenant.id}`, defaults);
  return defaults;
}

export function saveWheelSlices(tenantId: string, slices: WheelSlice[]): void {
  writeKey(`wheel:${tenantId}`, slices);
}

export function recordSpin(tenantId: string, sliceId: string): WheelSpinResult {
  const result: WheelSpinResult = {
    id: uid("spin"),
    tenantId,
    sliceId,
    spunAt: new Date().toISOString(),
  };
  const history = readKey<WheelSpinResult[]>(`spins:${tenantId}`, []);
  writeKey(`spins:${tenantId}`, [result, ...history].slice(0, 50));
  return result;
}

export function getEgoBankEntries(tenantId: string): EgoBankEntry[] {
  const existing = readKey<EgoBankEntry[]>(`egobank:${tenantId}`, []);
  if (existing.length > 0) return existing;
  const defaults = makeDefaultEgoBankEntries(tenantId);
  writeKey(`egobank:${tenantId}`, defaults);
  return defaults;
}

export function createEgoBankEntry(
  tenantId: string,
  input: Pick<EgoBankEntry, "title" | "tags" | "thumbnailUrl" | "markdownBody" | "isXpToken">
): EgoBankEntry {
  const entry: EgoBankEntry = {
    id: uid("ego"),
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...input,
  };
  const existing = getEgoBankEntries(tenantId);
  writeKey(`egobank:${tenantId}`, [entry, ...existing]);
  return entry;
}

export function deleteEgoBankEntry(tenantId: string, entryId: string): EgoBankEntry[] {
  const existing = getEgoBankEntries(tenantId);
  const updated = existing.filter((e) => e.id !== entryId);
  writeKey(`egobank:${tenantId}`, updated);
  return updated;
}

export function getXpProgress(tenantId: string): XpProgress {
  const existing = readKey<XpProgress | null>(`xp:${tenantId}`, null);
  if (existing) return existing;
  const defaults = makeDefaultXpProgress(tenantId);
  writeKey(`xp:${tenantId}`, defaults);
  return defaults;
}

const XP_PER_WIN = 20;
const XP_PER_TOKEN = 30;

export function depositXp(tenantId: string, isXpToken: boolean): XpProgress {
  const progress = getXpProgress(tenantId);
  let currentXp = progress.currentXp + (isXpToken ? XP_PER_TOKEN : XP_PER_WIN);
  let level = progress.level;
  let xpToNextLevel = progress.xpToNextLevel;

  while (currentXp >= xpToNextLevel) {
    currentXp -= xpToNextLevel;
    level += 1;
    xpToNextLevel = Math.round(xpToNextLevel * 1.25);
  }

  const updated: XpProgress = {
    tenantId,
    level,
    currentXp,
    xpToNextLevel,
    totalDeposits: progress.totalDeposits + 1,
    updatedAt: new Date().toISOString(),
  };
  writeKey(`xp:${tenantId}`, updated);
  return updated;
}

export function getWorkbenchSubmissions(tenantId: string): WorkbenchSubmission[] {
  return readKey<WorkbenchSubmission[]>(`workbench:${tenantId}`, []);
}

export function createWorkbenchSubmission(
  tenantId: string,
  input: Pick<WorkbenchSubmission, "content" | "contentType" | "topicId">
): WorkbenchSubmission {
  const submission: WorkbenchSubmission = {
    id: uid("wb"),
    tenantId,
    status: "pending",
    pushedToGithub: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const existing = getWorkbenchSubmissions(tenantId);
  writeKey(`workbench:${tenantId}`, [submission, ...existing]);
  return submission;
}

export function updateWorkbenchSubmission(
  tenantId: string,
  id: string,
  patch: Partial<WorkbenchSubmission>
): WorkbenchSubmission[] {
  const existing = getWorkbenchSubmissions(tenantId);
  const updated = existing.map((s) => (s.id === id ? { ...s, ...patch } : s));
  writeKey(`workbench:${tenantId}`, updated);
  return updated;
}

export function getCustomTracks(userId: string): Track[] {
  return readKey<Track[]>(`tracks:${userId}`, []);
}

export function getAllTracks(userId: string): Track[] {
  return [...BUILTIN_TRACKS, ...getCustomTracks(userId)];
}

export function getTrack(userId: string, trackId: string): Track | undefined {
  return getBuiltinTrack(trackId) ?? getCustomTracks(userId).find((t) => t.id === trackId);
}

export function saveCustomTrack(userId: string, trackToSave: Track): void {
  const existing = getCustomTracks(userId).filter((t) => t.id !== trackToSave.id);
  writeKey(`tracks:${userId}`, [trackToSave, ...existing]);
}

export function deleteCustomTrack(userId: string, trackId: string): void {
  const existing = getCustomTracks(userId).filter((t) => t.id !== trackId);
  writeKey(`tracks:${userId}`, existing);
}

export interface InternalSearchResult {
  id: string;
  title: string;
  subtitle: string;
  kind: "ego" | "wheel" | "workbench";
}

export function searchInternal(tenantId: string, query: string): InternalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: InternalSearchResult[] = [];

  for (const entry of getEgoBankEntries(tenantId)) {
    const haystack = `${entry.title} ${entry.tags.join(" ")}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({ id: entry.id, title: entry.title, subtitle: entry.tags.join(" "), kind: "ego" });
    }
  }

  for (const slice of readKey<WheelSlice[]>(`wheel:${tenantId}`, [])) {
    const haystack = `${slice.label} ${slice.description ?? ""}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({ id: slice.id, title: slice.label, subtitle: slice.description ?? "", kind: "wheel" });
    }
  }

  for (const sub of getWorkbenchSubmissions(tenantId)) {
    if (sub.content.toLowerCase().includes(q)) {
      results.push({
        id: sub.id,
        title: sub.content.slice(0, 60),
        subtitle: sub.contentType,
        kind: "workbench",
      });
    }
  }

  return results.slice(0, 8);
}
