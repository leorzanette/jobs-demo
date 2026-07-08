import type { EmailSuggestion } from "../types/gmail";
import { STATUS_LABELS, type ApplicationStatus } from "../types/application";

interface SuggestionQueueProps {
  open: boolean;
  suggestions: EmailSuggestion[];
  actingId: string | null;
  error: string | null;
  onClose: () => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}

function statusLabel(status: string | undefined): string {
  if (!status) return "—";
  return STATUS_LABELS[status as ApplicationStatus] ?? status;
}

export function SuggestionQueue({
  open,
  suggestions,
  actingId,
  error,
  onClose,
  onAccept,
  onDismiss,
}: SuggestionQueueProps) {
  if (!open) return null;

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
              Email suggestions
            </h2>
            <p className="text-xs text-slate-500">
              Review keyword matches before moving cards
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {suggestions.length === 0 ? (
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
