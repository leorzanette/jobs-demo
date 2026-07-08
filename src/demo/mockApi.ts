import type { ApplicationInput, JobApplication } from "../types/application";
import type {
  AcceptSuggestionResult,
  EmailSuggestion,
  GmailRulesConfig,
  GmailStatus,
  SuggestedStatus,
} from "../types/gmail";
import type { GmailSyncResult } from "../utils/apiLive";
import * as store from "./mockStore";

function delay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchApplications(): Promise<JobApplication[]> {
  await delay(300);
  return store.listApplications();
}

export async function createApplicationApi(
  input: ApplicationInput,
): Promise<JobApplication> {
  await delay(250);
  return store.createApplication(input);
}

export async function updateApplicationApi(
  id: string,
  input: ApplicationInput,
): Promise<JobApplication> {
  await delay(250);
  const updated = store.updateApplication(id, input);
  if (!updated) throw new Error("Application not found");
  return updated;
}

export async function deleteApplicationApi(id: string): Promise<void> {
  await delay(200);
  if (!store.deleteApplication(id)) {
    throw new Error("Application not found");
  }
}

export async function fetchGmailStatus(): Promise<GmailStatus> {
  await delay(150);
  return store.getGmailStatus();
}

export async function connectGmailDemo(): Promise<void> {
  await delay(400);
  store.connectGmail();
}

export async function disconnectGmailApi(): Promise<void> {
  await delay(200);
  store.disconnectGmail();
}

export async function syncGmailApi(): Promise<GmailSyncResult> {
  await delay(1500);
  return store.runSync();
}

export async function fetchSuggestions(): Promise<EmailSuggestion[]> {
  await delay(150);
  return store.listPendingSuggestions();
}

export async function clearSuggestionsApi(): Promise<{ deleted: number }> {
  await delay(200);
  return { deleted: store.clearAllSuggestions() };
}

export async function acceptSuggestionApi(
  id: string,
): Promise<AcceptSuggestionResult> {
  await delay(300);
  const result = store.acceptSuggestion(id);
  if (!result) throw new Error("Suggestion not found");
  return result;
}

export async function dismissSuggestionApi(
  id: string,
): Promise<{ suggestion: EmailSuggestion }> {
  await delay(250);
  const result = store.dismissSuggestion(id);
  if (!result) throw new Error("Suggestion not found");
  return result;
}

export async function fetchSuggestionHistory(): Promise<EmailSuggestion[]> {
  await delay(200);
  return store.listSuggestionHistory();
}

export async function updateSuggestionApi(
  id: string,
  payload: {
    suggestedStatus?: SuggestedStatus;
    status?: "pending" | "accepted" | "dismissed";
    applyToApplication?: boolean;
  },
): Promise<{
  suggestion: EmailSuggestion;
  application: JobApplication | null;
}> {
  await delay(300);
  const result = store.updateSuggestion(id, payload);
  if (!result) throw new Error("Suggestion not found");
  return result;
}

export function gmailConnectUrl(): string {
  return "#demo-connect";
}

export async function fetchGmailRules(): Promise<GmailRulesConfig> {
  await delay(150);
  return store.getRules();
}

export async function saveGmailRulesApi(
  rules: GmailRulesConfig,
): Promise<GmailRulesConfig> {
  await delay(250);
  return store.saveRules(rules);
}

export async function resetGmailRulesApi(): Promise<GmailRulesConfig> {
  await delay(200);
  return store.resetRules();
}
