import type { EmailSuggestion, SuggestedStatus } from "../types/gmail";
import { SUGGESTED_STATUS_LABELS } from "../types/gmail";
import { STATUS_LABELS, type ApplicationStatus } from "../types/application";

interface SuggestionQueueProps {
  open: boolean;
  view: "pending" | "history";
  suggestions: EmailSuggestion[];
  history: EmailSuggestion[];
  historyLoading: boolean;
  actingId: string | null;
  error: string | null;
  onClose: () => void;
  onShowHistory: () => void;
  onShowPending: () => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onUpdateHistory: (
    id: string,
    payload: {
      suggestedStatus?: SuggestedStatus;
      status?: "pending" | "accepted" | "dismissed";
      applyToApplication?: boolean;
    },
  ) => void;
}

function statusLabel(status: string | undefined): string {
  if (!status) return "—";
  return STATUS_LABELS[status as ApplicationStatus] ?? status;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const EDITABLE_STATUSES: SuggestedStatus[] = [
  "offer",
  "rejected",
  "interview",
  "applied",
];

export function SuggestionQueue({
  open,
  view,
  suggestions,
  history,
  historyLoading,
  actingId,
  error,
  onClose,
  onShowHistory,
  onShowPending,
  onAccept,
  onDismiss,
  onUpdateHistory,
}: SuggestionQueueProps) {
  if (!open) return null;

  const isHistory = view === "history";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close suggestions"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isHistory ? "Suggestion history" : "Email suggestions"}
            </h2>
            <p className="text-xs text-slate-500">
              {isHistory
                ? "Review past accepts/dismissals and edit them"
                : "Review keyword matches before moving cards"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {isHistory ? (
              <button
                type="button"
                onClick={onShowPending}
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Pending
              </button>
            ) : (
              <button
                type="button"
                onClick={onShowHistory}
                className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                History
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {isHistory ? (
            historyLoading ? (
              <p className="text-sm text-slate-500">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500">
                No accepted or dismissed suggestions yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map((suggestion) => {
                  const busy = actingId === suggestion.id;
                  return (
                    <li
                      key={suggestion.id}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="text-sm font-medium text-slate-900">
                          {suggestion.company ?? "Unknown company"} —{" "}
                          {suggestion.role ?? "role"}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            suggestion.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {suggestion.status}
                        </span>
                      </div>
                      <p className="mb-2 text-xs text-slate-500">
                        Card now: {statusLabel(suggestion.currentStatus)}
                        {" · "}keyword “{suggestion.matchedKeyword}”
                      </p>
                      <p className="mb-1 line-clamp-2 text-sm text-slate-700">
                        {suggestion.emailSubject || "(no subject)"}
                      </p>
                      {suggestion.emailSnippet && (
                        <p className="mb-2 line-clamp-2 text-xs text-slate-500">
                          {suggestion.emailSnippet}
                        </p>
                      )}
                      <p className="mb-3 text-[11px] text-slate-400">
                        Updated {formatWhen(suggestion.updatedAt)}
                      </p>

                      <label className="mb-2 block text-xs font-medium text-slate-600">
                        Suggested status
                        <select
                          value={suggestion.suggestedStatus}
                          disabled={busy}
                          onChange={(e) =>
                            onUpdateHistory(suggestion.id, {
                              suggestedStatus: e.target
                                .value as SuggestedStatus,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {EDITABLE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {SUGGESTED_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            onUpdateHistory(suggestion.id, {
                              suggestedStatus: suggestion.suggestedStatus as SuggestedStatus,
                              status: "accepted",
                              applyToApplication: true,
                            })
                          }
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Apply to card
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            onUpdateHistory(suggestion.id, {
                              status: "pending",
                            })
                          }
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Restore to pending
                        </button>
                        {suggestion.status !== "dismissed" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              onUpdateHistory(suggestion.id, {
                                status: "dismissed",
                              })
                            }
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Mark dismissed
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No pending suggestions. Sync Gmail to scan for updates.
            </p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((suggestion) => {
                const busy = actingId === suggestion.id;
                return (
                  <li
                    key={suggestion.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="mb-1 text-sm font-medium text-slate-900">
                      {suggestion.company ?? "Unknown company"} —{" "}
                      {suggestion.role ?? "role"}
                    </div>
                    <p className="mb-2 text-xs text-slate-500">
                      {statusLabel(suggestion.currentStatus)} →{" "}
                      <span className="font-medium text-slate-800">
                        {statusLabel(suggestion.suggestedStatus)}
                      </span>
                      {" · "}keyword “{suggestion.matchedKeyword}”
                    </p>
                    <p className="mb-1 line-clamp-2 text-sm text-slate-700">
                      {suggestion.emailSubject || "(no subject)"}
                    </p>
                    {suggestion.emailFrom && (
                      <p className="mb-2 truncate text-xs text-slate-500">
                        From: {suggestion.emailFrom}
                      </p>
                    )}
                    {suggestion.emailSnippet && (
                      <p className="mb-3 line-clamp-3 text-xs text-slate-500">
                        {suggestion.emailSnippet}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onAccept(suggestion.id)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDismiss(suggestion.id)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
