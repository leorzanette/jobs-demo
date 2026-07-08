import { useCallback, useEffect, useState } from "react";
import type {
  ApplicationInput,
  ApplicationStatus,
  JobApplication,
} from "../types/application";
import {
  createApplicationApi,
  deleteApplicationApi,
  fetchApplications,
  updateApplicationApi,
} from "../utils/api";

export function useApplications() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const apps = await fetchApplications();
    setApplications(apps);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchApplications()
      .then((apps) => {
        if (!cancelled) setApplications(apps);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load applications");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(async (input: ApplicationInput) => {
    setError(null);
    const app = await createApplicationApi(input);
    setApplications((prev) => [app, ...prev]);
  }, []);

  const update = useCallback(async (id: string, input: ApplicationInput) => {
    setError(null);
    const app = await updateApplicationApi(id, input);
    setApplications((prev) => prev.map((item) => (item.id === id ? app : item)));
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: ApplicationStatus) => {
      setError(null);

      let previous: JobApplication | undefined;
      setApplications((prev) => {
        const current = prev.find((item) => item.id === id);
        if (!current || current.status === status) return prev;
        previous = current;
        return prev.map((item) =>
          item.id === id
            ? { ...item, status, updatedAt: new Date().toISOString() }
            : item,
        );
      });

      if (!previous) return;

      try {
        const {
          id: _id,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          ...input
        } = previous;
        const app = await updateApplicationApi(id, { ...input, status });
        setApplications((prev) =>
          prev.map((item) => (item.id === id ? app : item)),
        );
      } catch (err) {
        const rollback = previous;
        setApplications((prev) =>
          prev.map((item) => (item.id === id ? rollback : item)),
        );
        throw err;
      }
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    setError(null);
    await deleteApplicationApi(id);
    setApplications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return {
    applications,
    loading,
    error,
    add,
    update,
    updateStatus,
    remove,
    retry,
  };
}