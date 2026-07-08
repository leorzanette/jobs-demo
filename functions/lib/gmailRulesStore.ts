import {
  DEFAULT_GMAIL_RULES,
  normalizeGmailRules,
  type GmailRulesConfig,
} from "./gmailRules";
import { getGmailRulesRow } from "./db";

export async function loadGmailRules(
  db: D1Database,
  email: string,
): Promise<GmailRulesConfig> {
  const row = await getGmailRulesRow(db, email);
  if (!row) return structuredClone(DEFAULT_GMAIL_RULES);

  try {
    const parsed = normalizeGmailRules({
      keywords: JSON.parse(row.keywords_json),
      blacklist: JSON.parse(row.blacklist_json),
    });
    if (typeof parsed === "string") {
      return structuredClone(DEFAULT_GMAIL_RULES);
    }
    return parsed;
  } catch {
    return structuredClone(DEFAULT_GMAIL_RULES);
  }
}
