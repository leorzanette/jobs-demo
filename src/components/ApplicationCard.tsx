import type { JobApplication } from "../types/application";
import { StatusBadge } from "./StatusBadge";
import { formatDate, isUpcoming } from "../utils/stats";

interface ApplicationCardProps {
  application: JobApplication;
  onClick: (app: JobApplication) => void;
}

export function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const upcomingFollowUp = isUpcoming(application.followUpDate);
  const upcomingInterview = isUpcoming(application.interviewDate);

  return (
    <button
      type="button"
      onClick={() => onClick(application)}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{application.company}</p>
          <p className="truncate text-sm text-slate-600">{application.role}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>
      <div className="space-y-1 text-xs text-slate-500">
        {application.appliedDate && (
          <p>Applied: {formatDate(application.appliedDate)}</p>
        )}
        {application.followUpDate && (
          <p className={upcomingFollowUp ? "font-medium text-amber-700" : ""}>
            Follow-up: {formatDate(application.followUpDate)}
            {upcomingFollowUp && " (soon)"}
          </p>
        )}
        {application.interviewDate && (
          <p className={upcomingInterview ? "font-medium text-purple-700" : ""}>
            Interview: {formatDate(application.interviewDate)}
            {upcomingInterview && " (soon)"}
          </p>
        )}
      </div>
    </button>
  );
}
