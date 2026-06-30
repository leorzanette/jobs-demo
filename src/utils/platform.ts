import type { JobPlatform } from "../types/application";

const URL_PATTERNS: { platform: JobPlatform; patterns: RegExp[] }[] = [
  { platform: "gupy", patterns: [/gupy\.io/i, /gupy\.com\.br/i] },
  { platform: "linkedin", patterns: [/linkedin\.com/i] },
  { platform: "indeed", patterns: [/indeed\.com/i] },
  { platform: "infojobs", patterns: [/infojobs\.com/i] },
];

export function detectPlatformFromUrl(url: string): JobPlatform | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  try {
    const hostname = new URL(trimmed).hostname;
    for (const { platform, patterns } of URL_PATTERNS) {
      if (patterns.some((p) => p.test(hostname) || p.test(trimmed))) {
        return platform;
      }
    }
  } catch {
    for (const { platform, patterns } of URL_PATTERNS) {
      if (patterns.some((p) => p.test(trimmed))) return platform;
    }
  }

  return undefined;
}
