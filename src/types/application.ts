export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type JobPlatform = "gupy" | "linkedin" | "indeed" | "infojobs";

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  platform?: JobPlatform;
  stageCurrent?: number;
  stageTotal?: number;
  appliedDate?: string;
  followUpDate?: string;
  interviewDate?: string;
  jobUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUSES: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export const PLATFORMS: JobPlatform[] = [
  "gupy",
  "linkedin",
  "indeed",
  "infojobs",
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "To do",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const PLATFORM_LABELS: Record<JobPlatform, string> = {
  gupy: "Gupy",
  linkedin: "LinkedIn",
  indeed: "Indeed",
  infojobs: "InfoJobs",
};

export const PLATFORM_COLORS: Record<JobPlatform, string> = {
  gupy: "bg-teal-100 text-teal-800 ring-teal-200",
  linkedin: "bg-sky-100 text-sky-800 ring-sky-200",
  indeed: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  infojobs: "bg-orange-100 text-orange-800 ring-orange-200",
};

/** Etapas típicas do processo Gupy */
export const GUPY_DEFAULT_STAGE_TOTAL = 6;

export const GUPY_STAGE_HINTS = [
  "Currículo",
  "Testes",
  "Entrevista RH",
  "Entrevista gestor",
  "Proposta",
  "Final",
];

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  wishlist: "bg-slate-100 text-slate-700 ring-slate-200",
  applied: "bg-blue-100 text-blue-800 ring-blue-200",
  interview: "bg-purple-100 text-purple-800 ring-purple-200",
  offer: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  rejected: "bg-red-100 text-red-800 ring-red-200",
  withdrawn: "bg-gray-100 text-gray-600 ring-gray-200",
};

export type ApplicationInput = Omit<
  JobApplication,
  "id" | "createdAt" | "updatedAt"
>;

export function formatStageProgress(
  current?: number,
  total?: number,
): string | null {
  if (!current || !total || total < 1 || current < 1 || current > total) {
    return null;
  }
  return `${current}/${total}`;
}
