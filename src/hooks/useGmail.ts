import { useCallback, useEffect, useState } from "react";
import type { EmailSuggestion, GmailStatus, SuggestedStatus } from "../types/gmail";
import type { JobApplication } from "../types/application";
import {
  acceptSuggestionApi,
  disconnectGmailApi,
  dismissSuggestionApi,
  fetchGmailStatus,
  fetchSuggestionHistory,
  fetchSuggestions,
  syncGmailApi,
  updateSuggestionApi,
} from "../utils/api";

export function useGmail(onApplicationUpdated?: (app: JobApplication) => void) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [history, setHistory] = useState<EmailSuggestion[]>([]);
  const [view, setView] = useState<"pending" | "history">("pending");
  const [queueOpen, setQueueOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextStatus, nextSuggestions] = await Promise.all([
      fetchGmailStatus(),
      fetchSuggestions(),
    ]);
    setStatus(nextStatus);
    setSuggestions(nextSuggestions);
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const items = await fetchSuggestionHistory();
      setHistory(items);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchGmailStatus()
      .then(async (nextStatus) => {
        if (cancelled) return;
        setStatus(nextStatus);
        if (nextStatus.connected || nextStatus.pendingCount > 0) {
          const nextSuggestions = await fetchSuggestions();
          if (!cancelled) setSuggestions(nextSuggestions);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.error(err);
          setStatus({ connected: false, lastSyncedAt: null, pendingCount: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get("gmail");
    if (!gmail) return;

    if (gmail === "connected") {
      void refresh().then(() => {
        setView("pending");
        setQueueOpen(true);
      });
    } else if (gmail === "error") {
      const reason = params.get("reason") ?? "unknown";
      setError(`Gmail connection failed (${reason})`);
    }

    params.delete("gmail");
    params.delete("reason");
    const next = params.toString();
    const path = next
      ? `${window.location.pathname}?${next}`
      : window.location.pathname;
    window.history.replaceState({}, "", path);
  }, [refresh]);

  const openQueue = useCallback((nextView: "pending" | "history" = "pending") => {
    setError(null);
    setView(nextView);
    setQueueOpen(true);
    if (nextView === "history") {
      void refreshHistory().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load history");
      });
    }
  }, [refreshHistory]);

  const showHistory = useCallback(() => {
    setView("history");
    setError(null);
    void refreshHistory().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load history");
    });
  }, [refreshHistory]);

  const showPending = useCallback(() => {
    setView("pending");
    setError(null);
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncGmailApi();
      await refresh();
      setView("pending");
      setQueueOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const disconnect = useCallback(async () => {
    setError(null);
    await disconnectGmailApi();
    setSuggestions([]);
    setHistory([]);
    setStatus({ connected: false, lastSyncedAt: null, pendingCount: 0 });
  }, []);

  const accept = useCallback(
    async (id: string) => {
      setActingId(id);
      setError(null);
      try {
        const result = await acceptSuggestionApi(id);
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                pendingCount: Math.max(0, prev.pendingCount - 1),
              }
            : prev,
        );
        onApplicationUpdated?.(result.application);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to accept");
        throw err;
      } finally {
        setActingId(null);
      }
    },
    [onApplicationUpdated],
  );

  const dismiss = useCallback(async (id: string) => {
    setActingId(id);
    setError(null);
    try {
      await dismissSuggestionApi(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              pendingCount: Math.max(0, prev.pendingCount - 1),
            }
          : prev,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dismiss");
      throw err;
    } finally {
      setActingId(null);
    }
  }, []);

  const updateHistoryItem = useCallback(
    async (
      id: string,
      payload: {
        suggestedStatus?: SuggestedStatus;
        status?: "pending" | "accepted" | "dismissed";
        applyToApplication?: boolean;
      },
    ) => {
      setActingId(id);
      setError(null);
      try {
        const result = await updateSuggestionApi(id, payload);
        if (payload.status === "pending") {
          setHistory((prev) => prev.filter((s) => s.id !== id));
          setSuggestions((prev) => [result.suggestion, ...prev]);
          setStatus((prev) =>
            prev
              ? { ...prev, pendingCount: prev.pendingCount + 1 }
              : prev,
          );
        } else {
          setHistory((prev) =>
            prev.map((s) => (s.id === id ? result.suggestion : s)),
          );
        }
        if (result.application) {
          onApplicationUpdated?.(result.application);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to update");
        throw err;
      } finally {
        setActingId(null);
      }
    },
    [onApplicationUpdated],
  );

  return {
    status,
    suggestions,
    history,
    view,
    queueOpen,
    setQueueOpen,
    loading,
    historyLoading,
    syncing,
    actingId,
    error,
    setError,
    sync,
    disconnect,
    accept,
    dismiss,
    updateHistoryItem,
    openQueue,
    showHistory,
    showPending,
    refresh,
  };
}
