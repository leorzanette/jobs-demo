import type { ApplicationStatus, JobApplication } from "./application";

export interface GmailStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
}

export interface EmailSuggestion {
  id: string;
  applicationId: string;
  gmailMessageId: string;
  suggestedStatus: ApplicationStatus;
  matchedKeyword: string;
  emailFrom?: string;
  emailSubject?: string;
  emailSnippet?: string;
  status: "pending" | "accepted" | "dismissed";
  company?: string;
  role?: string;
  currentStatus?: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptSuggestionResult {
  suggestion: EmailSuggestion;
  application: JobApplication;
}

export type SuggestedStatus =
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface KeywordRule {
  status: SuggestedStatus;
  keywords: string[];
}

export interface GmailRulesConfig {
  keywords: KeywordRule[];
  blacklist: string[];
}

export const SUGGESTED_STATUS_LABELS: Record<SuggestedStatus, string> = {
  offer: "Offer",
  rejected: "Rejected",
  interview: "Interview",
  applied: "Applied",
};

