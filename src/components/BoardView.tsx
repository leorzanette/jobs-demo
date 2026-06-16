import type { JobApplication } from "../types/application";
import { STATUSES, STATUS_LABELS } from "../types/application";
import { ApplicationCard } from "./ApplicationCard";

interface BoardViewProps {
  applications: JobApplication[];
  onSelect: (app: JobApplication) => void;
}

export function BoardView({ applications, onSelect }: BoardViewProps) {
  const columns = STATUSES.filter((s) => s !== "withdrawn");

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const items = applications.filter((a) => a.status === status);
        return (
          <div key={status} className="min-w-[260px] flex-1">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                {STATUS_LABELS[status]}
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  No applications
                </p>
              ) : (
                items.map((app) => (
                  <ApplicationCard key={app.id} application={app} onClick={onSelect} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
