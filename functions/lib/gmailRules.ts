export type SuggestedStatus =
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

/** First matching keyword wins (more specific statuses listed first). */
const KEYWORD_RULES: { status: SuggestedStatus; keywords: string[] }[] = [
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

export function matchKeyword(text: string): KeywordMatch | null {
  const haystack = text.toLowerCase();
  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (haystack.includes(keyword.toLowerCase())) {
        return { status: rule.status, keyword };
      }
    }
  }
  return null;
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
