import type { JobPlatform } from "../types/application";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "../types/application";

interface PlatformBadgeProps {
  platform: JobPlatform;
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PLATFORM_COLORS[platform]}`}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
