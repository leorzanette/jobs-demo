export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
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

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

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
