export type SuggestedStatus =
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface KeywordRule {
  status: SuggestedStatus;
  keywords: string[];
}

export interface GmailRulesConfig {
  keywords: KeywordRule[];
  blacklist: string[];
}

/** Default rules — first matching keyword wins (more specific statuses listed first). */
export const DEFAULT_KEYWORD_RULES: KeywordRule[] = [
  {
    status: "offer",
    keywords: [
      "oferta de emprego",
      "job offer",
      "offer letter",
      "proposta de emprego",
      "proposta de oferta",
      "congratulations on your offer",
    ],
  },
  {
    status: "rejected",
    keywords: [
      "infelizmente",
      "unfortunately",
      "not moving forward",
      "seguiremos com outras",
      "outras candidaturas",
      "we will not be moving forward",
      "decided not to proceed",
      "não seguiremos",
      "nao seguiremos",
    ],
  },
  {
    status: "interview",
    keywords: [
      "agendar conversa",
      "agendar entrevista",
      "entrevista",
      "interview",
      "schedule a call",
      "schedule an interview",
    ],
  },
  {
    status: "applied",
    keywords: [
      "candidatura recebida",
      "application received",
      "thank you for applying",
      "obrigado por se candidatar",
      "recebemos sua candidatura",
      "we received your application",
    ],
  },
];

export const DEFAULT_GMAIL_RULES: GmailRulesConfig = {
  keywords: DEFAULT_KEYWORD_RULES,
  blacklist: [],
};

export const SUGGESTED_STATUSES: SuggestedStatus[] = [
  "offer",
  "rejected",
  "interview",
  "applied",
];

const ACTIVE_STATUSES = new Set(["wishlist", "applied", "interview"]);

export interface MatchableApplication {
  id: string;
  company: string;
  role: string;
  status: string;
}

export interface KeywordMatch {
  status: SuggestedStatus;
  keyword: string;
}

export function isBlacklisted(
  text: string,
  blacklist: string[],
): string | null {
  const haystack = text.toLowerCase();
  for (const term of blacklist) {
    const needle = term.trim().toLowerCase();
    if (needle.length >= 2 && haystack.includes(needle)) {
      return term.trim();
    }
  }
  return null;
}

export function matchKeyword(
  text: string,
  rules: KeywordRule[] = DEFAULT_KEYWORD_RULES,
): KeywordMatch | null {
  const haystack = text.toLowerCase();
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      const needle = keyword.trim().toLowerCase();
      if (needle.length >= 2 && haystack.includes(needle)) {
        return { status: rule.status, keyword: keyword.trim() };
      }
    }
  }
  return null;
}

/** Gmail `q` fragment that narrows list results before we fetch full messages. */
export function gmailKeywordQuery(
  rules: KeywordRule[] = DEFAULT_KEYWORD_RULES,
): string {
  const terms = rules.flatMap((rule) =>
    rule.keywords.map((keyword) => {
      const escaped = keyword.trim().replace(/"/g, "");
      if (!escaped) return "";
      return escaped.includes(" ") ? `"${escaped}"` : escaped;
    }),
  ).filter(Boolean);

  if (terms.length === 0) return "";
  return `(${terms.join(" OR ")})`;
}

export function findMatchingApplication(
  applications: MatchableApplication[],
  searchableText: string,
): MatchableApplication | null {
  const haystack = searchableText.toLowerCase();
  const matches = applications.filter((app) => {
    const company = app.company.trim().toLowerCase();
    return company.length >= 2 && haystack.includes(company);
  });

  if (matches.length === 0) return null;

  const active = matches.filter((app) => ACTIVE_STATUSES.has(app.status));
  const pool = active.length > 0 ? active : matches;

  // Prefer longer company names (more specific matches)
  pool.sort((a, b) => b.company.length - a.company.length);
  return pool[0] ?? null;
}

export function normalizeGmailRules(input: unknown): GmailRulesConfig | string {
  if (!input || typeof input !== "object") {
    return "Invalid rules payload";
  }

  const body = input as { keywords?: unknown; blacklist?: unknown };
  if (!Array.isArray(body.keywords)) {
    return "keywords must be an array";
  }
  if (!Array.isArray(body.blacklist)) {
    return "blacklist must be an array";
  }

  const statusOrder = SUGGESTED_STATUSES;
  const byStatus = new Map<SuggestedStatus, string[]>();

  for (const status of statusOrder) {
    byStatus.set(status, []);
  }

  let keywordCount = 0;
  for (const item of body.keywords) {
    if (!item || typeof item !== "object") {
      return "Each keyword rule must be an object";
    }
    const rule = item as { status?: unknown; keywords?: unknown };
    if (
      typeof rule.status !== "string" ||
      !statusOrder.includes(rule.status as SuggestedStatus)
    ) {
      return "Invalid keyword status";
    }
    if (!Array.isArray(rule.keywords)) {
      return "keywords must be an array of strings per status";
    }

    const status = rule.status as SuggestedStatus;
    const cleaned: string[] = [];
    const seen = new Set<string>();

    for (const raw of rule.keywords) {
      if (typeof raw !== "string") return "Keywords must be strings";
      const keyword = raw.trim();
      if (keyword.length < 2) return "Keywords must be at least 2 characters";
      if (keyword.length > 80) return "Keywords must be at most 80 characters";
      const key = keyword.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(keyword);
      keywordCount += 1;
      if (keywordCount > 100) return "Too many keywords (max 100)";
    }

    byStatus.set(status, cleaned);
  }

  const blacklist: string[] = [];
  const blackSeen = new Set<string>();
  for (const raw of body.blacklist) {
    if (typeof raw !== "string") return "Blacklist entries must be strings";
    const term = raw.trim();
    if (!term) continue;
    if (term.length < 2) return "Blacklist terms must be at least 2 characters";
    if (term.length > 80) return "Blacklist terms must be at most 80 characters";
    const key = term.toLowerCase();
    if (blackSeen.has(key)) continue;
    blackSeen.add(key);
    blacklist.push(term);
    if (blacklist.length > 50) return "Too many blacklist terms (max 50)";
  }

  return {
    keywords: statusOrder.map((status) => ({
      status,
      keywords: byStatus.get(status) ?? [],
    })),
    blacklist,
  };
}
