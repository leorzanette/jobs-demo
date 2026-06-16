import type { JobApplication } from "../types/application";

const STORAGE_KEY = "job-applications";

export function loadApplications(): JobApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JobApplication[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveApplications(applications: JobApplication[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}
