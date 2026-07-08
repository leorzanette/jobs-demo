import { useRef } from "react";
import type { JobApplication } from "../types/application";
import { StatusBadge } from "./StatusBadge";
import { PlatformBadge } from "./PlatformBadge";
import { StageProgressBadge } from "./StageProgressBadge";
import { formatDate, isUpcoming } from "../utils/stats";

interface ApplicationCardProps {
  application: JobApplication;
  onClick: (app: JobApplication) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function ApplicationCard({
  application,
  onClick,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: ApplicationCardProps) {
  const upcomingFollowUp = isUpcoming(application.followUpDate);
  const upcomingInterview = isUpcoming(application.interviewDate);
  const moved = useRef(false);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        moved.current = true;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", application.id);
        // Transparent drag image looks odd; keep default clone.
        onDragStart?.();
      }}
      onDragEnd={() => {
        onDragEnd?.();
        // Delay clearing so click from dragend doesn't open the modal
        window.setTimeout(() => {
          moved.current = false;
        }, 0);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(application);
        }
      }}
      onClick={() => {
        if (moved.current || isDragging) return;
        onClick(application);
      }}
      className={`w-full cursor-grab select-none rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md active:cursor-grabbing ${
        isDragging ? "opacity-40 ring-2 ring-blue-200" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">
            {application.company}
          </p>
          <p className="truncate text-sm text-slate-600">{application.role}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>
      {(application.platform || application.stageCurrent) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {application.platform && (
            <PlatformBadge platform={application.platform} />
          )}
          <StageProgressBadge
            stageCurrent={application.stageCurrent}
            stageTotal={application.stageTotal}
          />
        </div>
      )}
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
    </div>
  );
}
