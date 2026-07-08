import { useEffect, useState } from "react";
import type { GmailRulesConfig, SuggestedStatus } from "../types/gmail";
import { SUGGESTED_STATUS_LABELS } from "../types/gmail";
import {
  fetchGmailRules,
  resetGmailRulesApi,
  saveGmailRulesApi,
} from "../utils/api";

interface GmailRulesSettingsProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_ORDER: SuggestedStatus[] = [
  "offer",
  "rejected",
  "interview",
  "applied",
];

function emptyDraft(): GmailRulesConfig {
  return {
    keywords: STATUS_ORDER.map((status) => ({ status, keywords: [] })),
    blacklist: [],
  };
}

export function GmailRulesSettings({ open, onClose }: GmailRulesSettingsProps) {
  const [draft, setDraft] = useState<GmailRulesConfig>(emptyDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState<Record<SuggestedStatus, string>>(
    {
      offer: "",
      rejected: "",
      interview: "",
      applied: "",
    },
  );
  const [newBlacklist, setNewBlacklist] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchGmailRules()
      .then((rules) => {
        if (!cancelled) setDraft(rules);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load rules");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  function keywordsFor(status: SuggestedStatus): string[] {
    return draft.keywords.find((r) => r.status === status)?.keywords ?? [];
  }

  function setKeywords(status: SuggestedStatus, keywords: string[]) {
    setDraft((prev) => ({
      ...prev,
      keywords: STATUS_ORDER.map((s) =>
        s === status
          ? { status: s, keywords }
          : prev.keywords.find((r) => r.status === s) ?? {
              status: s,
              keywords: [],
            },
      ),
    }));
  }

  function addKeyword(status: SuggestedStatus) {
    const value = newKeyword[status].trim();
    if (value.length < 2) return;
    const current = keywordsFor(status);
    if (current.some((k) => k.toLowerCase() === value.toLowerCase())) {
      setNewKeyword((prev) => ({ ...prev, [status]: "" }));
      return;
    }
    setKeywords(status, [...current, value]);
    setNewKeyword((prev) => ({ ...prev, [status]: "" }));
  }

  function removeKeyword(status: SuggestedStatus, keyword: string) {
    setKeywords(
      status,
      keywordsFor(status).filter((k) => k !== keyword),
    );
  }

  function addBlacklistTerm() {
    const value = newBlacklist.trim();
    if (value.length < 2) return;
    if (draft.blacklist.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setNewBlacklist("");
      return;
    }
    setDraft((prev) => ({
      ...prev,
      blacklist: [...prev.blacklist, value],
    }));
    setNewBlacklist("");
  }

  function removeBlacklistTerm(term: string) {
    setDraft((prev) => ({
      ...prev,
      blacklist: prev.blacklist.filter((t) => t !== term),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveGmailRulesApi(draft);
      setDraft(saved);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError(null);
    try {
      const defaults = await resetGmailRulesApi();
      setDraft(defaults);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close settings"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Gmail keyword settings
            </h2>
            <p className="text-xs text-slate-500">
              Edit match keywords and blacklist terms. Blacklisted mail is skipped.
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
          {loading ? (
            <p className="text-sm text-slate-500">Loading rules…</p>
          ) : (
            <div className="space-y-6">
              {STATUS_ORDER.map((status) => (
                <section key={status}>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    {SUGGESTED_STATUS_LABELS[status]}
                  </h3>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {keywordsFor(status).length === 0 ? (
                      <span className="text-xs text-slate-400">No keywords</span>
                    ) : (
                      keywordsFor(status).map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                        >
                          {keyword}
                          <button
                            type="button"
                            onClick={() => removeKeyword(status, keyword)}
                            className="text-slate-400 hover:text-red-600"
                            aria-label={`Remove ${keyword}`}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword[status]}
                      onChange={(e) =>
                        setNewKeyword((prev) => ({
                          ...prev,
                          [status]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addKeyword(status);
                        }
                      }}
                      placeholder="Add keyword…"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => addKeyword(status)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Add
                    </button>
                  </div>
                </section>
              ))}

              <section>
                <h3 className="mb-1 text-sm font-semibold text-slate-800">
                  Blacklist
                </h3>
                <p className="mb-2 text-xs text-slate-500">
                  If any of these appear in From, subject, or body, skip the email.
                </p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {draft.blacklist.length === 0 ? (
                    <span className="text-xs text-slate-400">No blacklist terms</span>
                  ) : (
                    draft.blacklist.map((term) => (
                      <span
                        key={term}
                        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 ring-1 ring-red-100"
                      >
                        {term}
                        <button
                          type="button"
                          onClick={() => removeBlacklistTerm(term)}
                          className="text-red-400 hover:text-red-700"
                          aria-label={`Remove ${term}`}
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBlacklist}
                    onChange={(e) => setNewBlacklist(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBlacklistTerm();
                      }
                    }}
                    placeholder="Add blacklist term…"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addBlacklistTerm}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Add
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void handleReset()}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Reset defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void handleSave()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
