import type { ApplicationInput, JobApplication } from "../types/application";
import type {
  AcceptSuggestionResult,
  EmailSuggestion,
  GmailRulesConfig,
  GmailStatus,
  SuggestedStatus,
} from "../types/gmail";

const API_BASE = "/api/applications";
const GMAIL_BASE = "/api/gmail";

async function apiFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      redirect: "manual",
      ...init,
    });

    if (
      response.type === "opaqueredirect" ||
      response.status === 302 ||
      response.status === 303
    ) {
      throw new Error(
        "Session expired. Please refresh the page and sign in again.",
      );
    }

    return response;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Session expired")) {
      throw err;
    }
    throw new Error(
      "Network error — check your connection and try again. If this persists, refresh the page.",
    );
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchApplications(): Promise<JobApplication[]> {
  const response = await apiFetch(API_BASE);
  return handleResponse<JobApplication[]>(response);
}

export async function createApplicationApi(
  input: ApplicationInput,
): Promise<JobApplication> {
  const response = await apiFetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<JobApplication>(response);
}

export async function updateApplicationApi(
  id: string,
  input: ApplicationInput,
): Promise<JobApplication> {
  const response = await apiFetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<JobApplication>(response);
}

export async function deleteApplicationApi(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE}/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    await handleResponse(response);
  }
}

export async function fetchGmailStatus(): Promise<GmailStatus> {
  const response = await apiFetch(`${GMAIL_BASE}/status`);
  return handleResponse<GmailStatus>(response);
}

export async function disconnectGmailApi(): Promise<void> {
  const response = await apiFetch(`${GMAIL_BASE}/connection`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    await handleResponse(response);
  }
}

export interface GmailSyncResult {
  scanned: number;
  created: number;
  lookbackDays?: number;
  candidates?: number;
  blacklisted?: number;
  noKeyword?: number;
  noApplication?: number;
  skippedExisting?: number;
  skippedAlreadySorted?: number;
}

export async function syncGmailApi(): Promise<GmailSyncResult> {
  const response = await apiFetch(`${GMAIL_BASE}/sync`, { method: "POST" });
  return handleResponse(response);
}

export async function fetchSuggestions(): Promise<EmailSuggestion[]> {
  const response = await apiFetch(`${GMAIL_BASE}/suggestions`);
  return handleResponse<EmailSuggestion[]>(response);
}

export async function clearSuggestionsApi(): Promise<{ deleted: number }> {
  const response = await apiFetch(`${GMAIL_BASE}/suggestions`, {
    method: "DELETE",
  });
  return handleResponse(response);
}

export async function acceptSuggestionApi(
  id: string,
): Promise<AcceptSuggestionResult> {
  const response = await apiFetch(`${GMAIL_BASE}/suggestions/${id}/accept`, {
    method: "POST",
  });
  return handleResponse<AcceptSuggestionResult>(response);
}

export async function dismissSuggestionApi(
  id: string,
): Promise<{ suggestion: EmailSuggestion }> {
  const response = await apiFetch(`${GMAIL_BASE}/suggestions/${id}/dismiss`, {
    method: "POST",
  });
  return handleResponse(response);
}

export async function fetchSuggestionHistory(): Promise<EmailSuggestion[]> {
  const response = await apiFetch(`${GMAIL_BASE}/suggestions/history`);
  return handleResponse<EmailSuggestion[]>(response);
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
  const response = await apiFetch(`${GMAIL_BASE}/suggestions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export function gmailConnectUrl(): string {
  return `${GMAIL_BASE}/oauth/start`;
}

export async function connectGmailDemo(): Promise<void> {
  throw new Error("Demo connect is not available in production mode");
}

export async function fetchGmailRules(): Promise<GmailRulesConfig> {
  const response = await apiFetch(`${GMAIL_BASE}/rules`);
  return handleResponse<GmailRulesConfig>(response);
}

export async function saveGmailRulesApi(
  rules: GmailRulesConfig,
): Promise<GmailRulesConfig> {
  const response = await apiFetch(`${GMAIL_BASE}/rules`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules),
  });
  return handleResponse<GmailRulesConfig>(response);
}

export async function resetGmailRulesApi(): Promise<GmailRulesConfig> {
  const response = await apiFetch(`${GMAIL_BASE}/rules`, { method: "POST" });
  return handleResponse<GmailRulesConfig>(response);
}
