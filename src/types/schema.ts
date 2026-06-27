export type TenantType = "study" | "build" | "network";
export type AccentColor = "emerald" | "purple";
export type Domain = "generic" | "cs_sde";
export type LearningStyle = "spontaneous" | "structured";

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserPreferences {
  userId: string;
  domain: Domain;
  learningStyle: LearningStyle;
  activeTenantId: string | null;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  userId: string;
  type: TenantType;
  name: string;
  accentColor: AccentColor;
  createdAt: string;
}

export interface WheelSlice {
  id: string;
  tenantId: string;
  label: string;
  description?: string;
  color: string;
  weight: number;
}

export interface WheelSpinResult {
  id: string;
  tenantId: string;
  sliceId: string;
  spunAt: string;
}

export interface EgoBankEntry {
  id: string;
  tenantId: string;
  title: string;
  tags: string[];
  thumbnailUrl: string;
  markdownBody: string;
  isXpToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface XpProgress {
  tenantId: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalDeposits: number;
  updatedAt: string;
}

export interface SearchIndexItem {
  id: string;
  tenantId: string;
  title: string;
  type: "topic" | "doc" | "link";
  url: string;
  keywords: string[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WorkbenchSubmission {
  id: string;
  tenantId: string;
  topicId: string | null;
  content: string;
  contentType: "code" | "text";
  status: "pending" | "reviewed" | "flagged";
  pushedToGithub: boolean;
  createdAt: string;
}

export interface GithubConnection {
  userId: string;
  accessToken: string;
  githubUsername: string;
  repoFullName: string | null;
  connectedAt: string;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
