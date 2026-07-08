import type { ApplicationStatus, JobApplication } from "../types/application";

export interface AppStats {
  total: number;
  active: number;
  interviews: number;
  responseRate: number | null;
}

export function computeStats(applications: JobApplication[]): AppStats {
  const total = applications.length;
  const active = applications.filter(
    (a) => a.status === "applied" || a.status === "interview",
  ).length;
  const interviews = applications.filter((a) => a.status === "interview").length;

  const appliedOrLater = applications.filter((a) =>
    isAppliedOrLater(a.status),
  );
  const responded = appliedOrLater.filter(
    (a) => a.status === "interview" || a.status === "offer",
  );

  const responseRate =
    appliedOrLater.length > 0
      ? Math.round((responded.length / appliedOrLater.length) * 100)
      : null;

  return { total, active, interviews, responseRate };
}

function isAppliedOrLater(status: ApplicationStatus): boolean {
  return status !== "wishlist";
}

export function isUpcoming(dateStr?: string, withinDays = 7): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= withinDays;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
