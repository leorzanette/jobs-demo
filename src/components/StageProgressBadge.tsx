import { formatStageProgress } from "../types/application";

interface StageProgressBadgeProps {
  stageCurrent?: number;
  stageTotal?: number;
}

export function StageProgressBadge({
  stageCurrent,
  stageTotal,
}: StageProgressBadgeProps) {
  const label = formatStageProgress(stageCurrent, stageTotal);
  if (!label) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">
      {label}
    </span>
  );
}
