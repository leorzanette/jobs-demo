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
  const haystack = normalizeMatchText(text);
  for (const term of blacklist) {
    const needle = normalizeMatchText(term.trim());
    if (needle.length >= 2 && haystack.includes(needle)) {
      return term.trim();
    }
  }
  return null;
}

/** Lowercase + strip diacritics so "Educação" matches "educacao". */
export function normalizeMatchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function matchKeyword(
  text: string,
  rules: KeywordRule[] = DEFAULT_KEYWORD_RULES,
): KeywordMatch | null {
  const haystack = normalizeMatchText(text);
  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      const needle = normalizeMatchText(keyword.trim());
      if (needle.length >= 2 && haystack.includes(needle)) {
        return { status: rule.status, keyword: keyword.trim() };
      }
    }
  }
  return null;
}

function quoteGmailTerm(term: string): string {
  const escaped = term.trim().replace(/"/g, "");
  if (!escaped) return "";
  return escaped.includes(" ") ? `"${escaped}"` : escaped;
}

/** Gmail `q` fragment: keywords OR tracked companies OR roles (cargos). */
export function gmailKeywordQuery(
  rules: KeywordRule[] = DEFAULT_KEYWORD_RULES,
  companies: string[] = [],
  roles: string[] = [],
): string {
  const keywordTerms = rules
    .flatMap((rule) => rule.keywords.map(quoteGmailTerm))
    .filter(Boolean);

  const companyTerms = companies
    .map((company) => quoteGmailTerm(company))
    .filter((term) => term.length >= 2);

  const roleTerms = roles
    .flatMap((role) => roleSearchTerms(role))
    .map(quoteGmailTerm)
    .filter((term) => term.length >= 3);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const term of [...keywordTerms, ...companyTerms, ...roleTerms]) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }

  if (terms.length === 0) return "";
  return `(${terms.join(" OR ")})`;
}

/** Skip generic job-title filler that would over-match unrelated mail. */
const ROLE_STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "para",
  "por",
  "com",
  "the",
  "and",
  "of",
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "jr",
  "sr",
  "pl",
]);

function significantTokens(text: string, minLen = 3): string[] {
  return normalizeMatchText(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= minLen && !ROLE_STOPWORDS.has(token));
}

/** Full role plus distinctive phrase chunks for the Gmail search query. */
function roleSearchTerms(role: string): string[] {
  const trimmed = role.trim();
  if (!trimmed) return [];

  const terms: string[] = [trimmed];
  const tokens = significantTokens(trimmed, 4);

  // Prefer multi-word phrases so "Analista de Sistemas" beats lone "Analista"
  if (tokens.length >= 2) {
    terms.push(tokens.slice(0, 2).join(" "));
    if (tokens.length >= 3) {
      terms.push(tokens.slice(0, 3).join(" "));
    }
  } else if (tokens.length === 1 && tokens[0]!.length >= 6) {
    terms.push(tokens[0]!);
  }

  return terms;
}

function companyAppearsInText(haystack: string, company: string): boolean {
  const normalizedCompany = normalizeMatchText(company.trim());
  if (normalizedCompany.length < 2) return false;

  // Exact / substring company name
  if (haystack.includes(normalizedCompany)) return true;

  // Significant tokens (e.g. "Afya Educação" → "afya")
  const tokens = significantTokens(company, 3);

  if (tokens.length === 0) return false;

  // Single meaningful token: accept it
  if (tokens.length === 1) {
    return haystack.includes(tokens[0]!);
  }

  // Multi-word: prefer the longest token (usually the brand)
  const longest = [...tokens].sort((a, b) => b.length - a.length)[0]!;
  if (longest.length >= 4 && haystack.includes(longest)) return true;

  // Or require at least two tokens to appear
  const hits = tokens.filter((token) => haystack.includes(token));
  return hits.length >= 2;
}

function roleAppearsInText(haystack: string, role: string): boolean {
  const normalizedRole = normalizeMatchText(role.trim());
  if (normalizedRole.length < 4) return false;

  // Full role title substring
  if (haystack.includes(normalizedRole)) return true;

  const tokens = significantTokens(role, 4);
  if (tokens.length === 0) return false;

  // Require a distinctive multi-token hit to avoid "Junior" alone
  if (tokens.length === 1) {
    return tokens[0]!.length >= 8 && haystack.includes(tokens[0]!);
  }

  if (tokens.length >= 2) {
    const phrase2 = tokens.slice(0, 2).join(" ");
    if (haystack.includes(phrase2)) return true;
  }
  if (tokens.length >= 3) {
    const phrase3 = tokens.slice(0, 3).join(" ");
    if (haystack.includes(phrase3)) return true;
  }

  const hits = tokens.filter((token) => haystack.includes(token));
  return hits.length >= 2;
}

export function findMatchingApplication(
  applications: MatchableApplication[],
  searchableText: string,
): MatchableApplication | null {
  const haystack = normalizeMatchText(searchableText);

  const scored = applications
    .map((app) => {
      let score = 0;
      if (companyAppearsInText(haystack, app.company)) score += 10;
      if (roleAppearsInText(haystack, app.role)) score += 5;
      return { app, score };
    })
    .filter((item) => item.score > 0);

  if (scored.length === 0) return null;

  const active = scored.filter((item) => ACTIVE_STATUSES.has(item.app.status));
  const pool = active.length > 0 ? active : scored;

  pool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.app.company.length - a.app.company.length;
  });

  return pool[0]?.app ?? null;
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
