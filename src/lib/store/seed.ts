import type {
  EgoBankEntry,
  Tenant,
  TenantType,
  WheelSlice,
  XpProgress,
} from "@/types/schema";

export const DEMO_USER_ID = "demo-user";

export const TENANT_DEFS: { type: TenantType; name: string }[] = [
  { type: "study", name: "Study" },
  { type: "build", name: "Build" },
  { type: "network", name: "Network" },
];

export function makeDefaultTenants(userId: string): Tenant[] {
  return TENANT_DEFS.map((def) => ({
    id: `${userId}-${def.type}`,
    userId,
    type: def.type,
    name: def.name,
    accentColor: "emerald",
    createdAt: new Date().toISOString(),
  }));
}

const WHEEL_PRESETS: Record<TenantType, Omit<WheelSlice, "id" | "tenantId">[]> = {
  study: [
    { label: "Vim-Only Mode", description: "No mouse, no arrow keys.", color: "#34d399", weight: 1 },
    { label: "Max 3 Functions", description: "Solve it with three functions or fewer.", color: "#a855f7", weight: 1 },
    { label: "No External Libraries", description: "Standard library only.", color: "#34d399", weight: 1 },
    { label: "Explain With an Analogy", description: "Teach it back using a real-world analogy.", color: "#a855f7", weight: 1 },
    { label: "Optimize to O(1) Space", description: "Constant space, no exceptions.", color: "#34d399", weight: 1 },
    { label: "No Notes Allowed", description: "Work entirely from memory.", color: "#a855f7", weight: 1 },
  ],
  build: [
    { label: "Ship in 60 Minutes", description: "Timebox today's PR to one hour.", color: "#34d399", weight: 1 },
    { label: "No New Dependencies", description: "Use what's already installed.", color: "#a855f7", weight: 1 },
    { label: "Write the Tests First", description: "TDD, no exceptions today.", color: "#34d399", weight: 1 },
    { label: "Solo Code Review", description: "Review your own diff line by line before pushing.", color: "#a855f7", weight: 1 },
    { label: "Small PR Only", description: "Cap the diff at under 150 lines.", color: "#34d399", weight: 1 },
    { label: "Document as You Go", description: "Write the README section while building.", color: "#a855f7", weight: 1 },
  ],
  network: [
    { label: "Cold DM Someone New", description: "Reach out to one new contact today.", color: "#34d399", weight: 1 },
    { label: "Comment, Don't Just Like", description: "Leave a real comment on 3 posts.", color: "#a855f7", weight: 1 },
    { label: "Share a Win Publicly", description: "Post one thing you shipped or learned.", color: "#34d399", weight: 1 },
    { label: "Follow Up With a Lead", description: "Re-engage someone from last week.", color: "#a855f7", weight: 1 },
    { label: "Ask for an Intro", description: "Request one warm introduction.", color: "#34d399", weight: 1 },
    { label: "Give Before You Ask", description: "Offer help or a resource with no ask attached.", color: "#a855f7", weight: 1 },
  ],
};

export function makeDefaultWheelSlices(tenantId: string, type: TenantType): WheelSlice[] {
  return WHEEL_PRESETS[type].map((preset, i) => ({
    id: `${tenantId}-slice-${i}`,
    tenantId,
    ...preset,
  }));
}

export function makeDefaultXpProgress(tenantId: string): XpProgress {
  return {
    tenantId,
    level: 1,
    currentXp: 0,
    xpToNextLevel: 100,
    totalDeposits: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function makeDefaultEgoBankEntries(tenantId: string): EgoBankEntry[] {
  return [
    {
      id: `${tenantId}-ego-1`,
      tenantId,
      title: "Cracked a clean O(n) two-pointer solution",
      tags: ["#LeetCode", "#TwoPointers"],
      thumbnailUrl: "",
      markdownBody: "Realized sorting first made the two-pointer sweep trivial.\n\n```\nwhile left < right: ...\n```",
      isXpToken: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `${tenantId}-ego-2`,
      tenantId,
      title: "Bombed the system design round",
      tags: ["#SystemDesign", "#Breakdown"],
      thumbnailUrl: "",
      markdownBody: "Forgot to ask about read/write ratio before jumping to sharding. Next time: clarify access patterns first.",
      isXpToken: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
