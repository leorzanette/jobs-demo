import { useCallback, useEffect, useState } from "react";
import type { ApplicationInput, JobApplication } from "../types/application";
import { loadApplications, saveApplications } from "../utils/storage";

export function useApplications() {
  const [applications, setApplications] = useState<JobApplication[]>(() =>
    loadApplications(),
  );

  useEffect(() => {
    saveApplications(applications);
  }, [applications]);

  const add = useCallback((input: ApplicationInput) => {
    const now = new Date().toISOString();
    const app: JobApplication = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setApplications((prev) => [app, ...prev]);
  }, []);

  const update = useCallback((id: string, input: ApplicationInput) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, ...input, updatedAt: new Date().toISOString() }
          : app,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
  }, []);

  return { applications, add, update, remove };
}
