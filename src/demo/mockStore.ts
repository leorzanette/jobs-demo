import type { ApplicationInput, JobApplication } from "../types/application";
import type { EmailSuggestion, GmailRulesConfig } from "../types/gmail";
import {
  DEFAULT_DEMO_RULES,
  INITIAL_PENDING_SUGGESTIONS,
  SEED_APPLICATIONS,
  SYNC_QUEUE,
  type SyncQueueEmail,
} from "./fixtures";

const STORAGE_KEY = "job-tracker-demo-v2";

export interface DemoStoreState {
  applications: JobApplication[];
  suggestions: EmailSuggestion[];
  gmailConnected: boolean;
  lastSyncedAt: string | null;
  rules: GmailRulesConfig;
  syncQueue: SyncQueueEmail[];
}

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

function enrichSuggestion(
  raw: Omit<EmailSuggestion, "company" | "role" | "currentStatus">,
  applications: JobApplication[],
): EmailSuggestion {
  const app = applications.find((a) => a.id === raw.applicationId);
  return {
    ...raw,
    company: app?.company,
    role: app?.role,
    currentStatus: app?.status,
  };
}

function createFreshState(): DemoStoreState {
  const applications = structuredClone(SEED_APPLICATIONS);
  const suggestions = INITIAL_PENDING_SUGGESTIONS.map((s) =>
    enrichSuggestion(s, applications),
  );
  return {
    applications,
    suggestions,
    gmailConnected: false,
    lastSyncedAt: null,
    rules: structuredClone(DEFAULT_DEMO_RULES),
    syncQueue: structuredClone(SYNC_QUEUE),
  };
}

function loadState(): DemoStoreState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as DemoStoreState;
    }
  } catch {
    // ignore corrupt storage
  }
  return createFreshState();
}

let state = loadState();

function persist(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function touch(app: JobApplication): JobApplication {
  return { ...app, updatedAt: new Date().toISOString() };
}

export function getStoreState(): DemoStoreState {
  return state;
}

export function resetStore(): void {
  state = createFreshState();
  persist();
}

export function listApplications(): JobApplication[] {
  return [...state.applications].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function createApplication(input: ApplicationInput): JobApplication {
  const now = new Date().toISOString();
  const app: JobApplication = {
    ...input,
    id: nextId("app"),
    createdAt: now,
    updatedAt: now,
  };
  state.applications.push(app);
  persist();
  return app;
}

export function updateApplication(
  id: string,
  input: ApplicationInput,
): JobApplication | null {
  const idx = state.applications.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const updated = touch({ ...state.applications[idx], ...input, id });
  state.applications[idx] = updated;
  refreshSuggestionContext();
  persist();
  return updated;
}

export function deleteApplication(id: string): boolean {
  const before = state.applications.length;
  state.applications = state.applications.filter((a) => a.id !== id);
  state.suggestions = state.suggestions.filter((s) => s.applicationId !== id);
  persist();
  return state.applications.length < before;
}

export function updateApplicationStatus(
  id: string,
  status: JobApplication["status"],
): JobApplication | null {
  const app = state.applications.find((a) => a.id === id);
  if (!app) return null;
  return updateApplication(id, { ...app, status });
}

function refreshSuggestionContext(): void {
  state.suggestions = state.suggestions.map((s) =>
    enrichSuggestion(s, state.applications),
  );
}

export function getGmailStatus() {
  const pendingCount = state.suggestions.filter(
    (s) => s.status === "pending",
  ).length;
  return {
    connected: state.gmailConnected,
    lastSyncedAt: state.lastSyncedAt,
    pendingCount,
  };
}

export function connectGmail(): void {
  state.gmailConnected = true;
  persist();
}

export function disconnectGmail(): void {
  state.gmailConnected = false;
  state.lastSyncedAt = null;
  state.suggestions = [];
  persist();
}

export function listPendingSuggestions(): EmailSuggestion[] {
  return state.suggestions
    .filter((s) => s.status === "pending")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function listSuggestionHistory(): EmailSuggestion[] {
  return state.suggestions
    .filter((s) => s.status !== "pending")
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export function clearAllSuggestions(): number {
  const count = state.suggestions.length;
  state.suggestions = [];
  persist();
  return count;
}

export function acceptSuggestion(id: string): {
  suggestion: EmailSuggestion;
  application: JobApplication;
} | null {
  const suggestion = state.suggestions.find(
    (s) => s.id === id && s.status === "pending",
  );
  if (!suggestion) return null;

  const application = updateApplicationStatus(
    suggestion.applicationId,
    suggestion.suggestedStatus,
  );
  if (!application) return null;

  const now = new Date().toISOString();
  const updatedSuggestion: EmailSuggestion = {
    ...suggestion,
    status: "accepted",
    currentStatus: application.status,
    updatedAt: now,
  };
  state.suggestions = state.suggestions.map((s) =>
    s.id === id ? updatedSuggestion : s,
  );
  persist();
  return { suggestion: updatedSuggestion, application };
}

export function dismissSuggestion(
  id: string,
): { suggestion: EmailSuggestion } | null {
  const suggestion = state.suggestions.find(
    (s) => s.id === id && s.status === "pending",
  );
  if (!suggestion) return null;

  const updatedSuggestion: EmailSuggestion = {
    ...suggestion,
    status: "dismissed",
    updatedAt: new Date().toISOString(),
  };
  state.suggestions = state.suggestions.map((s) =>
    s.id === id ? updatedSuggestion : s,
  );
  persist();
  return { suggestion: updatedSuggestion };
}

export function updateSuggestion(
  id: string,
  payload: {
    suggestedStatus?: EmailSuggestion["suggestedStatus"];
    status?: EmailSuggestion["status"];
    applyToApplication?: boolean;
  },
): { suggestion: EmailSuggestion; application: JobApplication | null } | null {
  const current = state.suggestions.find((s) => s.id === id);
  if (!current) return null;

  const apply =
    payload.applyToApplication === true ||
    (payload.status === "accepted" && payload.applyToApplication !== false);

  let nextStatus = payload.status ?? current.status;
  if (apply) nextStatus = "accepted";

  const nextSuggestedStatus = payload.suggestedStatus ?? current.suggestedStatus;
  let application: JobApplication | null = state.applications.find(
    (a) => a.id === current.applicationId,
  ) ?? null;

  if (apply && application) {
    application = updateApplicationStatus(
      current.applicationId,
      nextSuggestedStatus,
    );
  }

  const updatedSuggestion = enrichSuggestion(
    {
      ...current,
      suggestedStatus: nextSuggestedStatus,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    },
    state.applications,
  );

  state.suggestions = state.suggestions.map((s) =>
    s.id === id ? updatedSuggestion : s,
  );
  persist();
  return { suggestion: updatedSuggestion, application };
}

export function runSync(): {
  scanned: number;
  created: number;
  lookbackDays: number;
} {
  if (!state.gmailConnected) {
    throw new Error("Gmail is not connected");
  }

  const existingMessageIds = new Set(
    state.suggestions.map((s) => s.gmailMessageId),
  );
  let created = 0;
  const now = new Date().toISOString();

  for (const item of state.syncQueue) {
    if (existingMessageIds.has(item.gmailMessageId)) continue;
    const app = state.applications.find((a) => a.id === item.applicationId);
    if (!app) continue;

    const suggestion = enrichSuggestion(
      {
        id: item.id,
        applicationId: item.applicationId,
        gmailMessageId: item.gmailMessageId,
        suggestedStatus: item.suggestedStatus,
        matchedKeyword: item.matchedKeyword,
        emailFrom: item.emailFrom,
        emailSubject: item.emailSubject,
        emailSnippet: item.emailSnippet,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      },
      state.applications,
    );
    state.suggestions.push(suggestion);
    existingMessageIds.add(item.gmailMessageId);
    created += 1;
  }

  state.lastSyncedAt = now;
  persist();

  return { scanned: 12, created, lookbackDays: 7 };
}

export function getRules(): GmailRulesConfig {
  return structuredClone(state.rules);
}

export function saveRules(rules: GmailRulesConfig): GmailRulesConfig {
  state.rules = structuredClone(rules);
  persist();
  return getRules();
}

export function resetRules(): GmailRulesConfig {
  state.rules = structuredClone(DEFAULT_DEMO_RULES);
  persist();
  return getRules();
}
