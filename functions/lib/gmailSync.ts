import { decryptSecret, encryptSecret } from "./crypto";
import {
  chunkOrQuery,
  getMessagesBatch,
  hydrateMessageBodies,
  listRecentMessages,
  refreshAccessToken,
  requireGoogleConfig,
  getMessageBody,
  getMessageFrom,
  getMessageSubject,
  getMessageSubjectAndBody,
  type GmailMessageListItem,
} from "./gmail";
import {
  findMatchingApplication,
  gmailKeywordQuery,
  isBlacklisted,
  matchKeyword,
  normalizeMatchText,
  quoteGmailTerm,
} from "./gmailRules";
import { loadGmailRules } from "./gmailRulesStore";
import {
  upsertPendingSuggestion,
  listApplications,
  markGmailSynced,
  updateGmailAccessToken,
  type GmailConnectionRow,
} from "./db";

/** Last N days of mail to scan. */
const LOOKBACK_DAYS = 7;
/** Cap messages processed per sync (Workers subrequest budget). */
const MAX_MESSAGES = 30;
/** Extra fetches for HTML parts stored as Gmail attachments. */
const MAX_ATTACHMENT_FETCHES = 12;
/** Companies per Gmail list query. */
const COMPANY_CHUNK = 6;

async function resolveAccessToken(
  env: Env,
  connection: GmailConnectionRow,
): Promise<string> {
  const config = requireGoogleConfig(env);
  if (config instanceof Response) {
    throw new Error("Gmail is not configured");
  }

  const now = Date.now();
  const expiresAt = connection.access_token_expires_at
    ? Date.parse(connection.access_token_expires_at)
    : 0;

  if (connection.access_token_enc && expiresAt > now + 60_000) {
    return decryptSecret(config.encryptionKey, connection.access_token_enc);
  }

  const refreshToken = await decryptSecret(
    config.encryptionKey,
    connection.refresh_token_enc,
  );
  const tokens = await refreshAccessToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken,
  });

  const accessTokenEnc = await encryptSecret(
    config.encryptionKey,
    tokens.access_token,
  );
  const accessTokenExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000,
  ).toISOString();

  await updateGmailAccessToken(
    env.DB,
    connection.user_email,
    accessTokenEnc,
    accessTokenExpiresAt,
  );

  return tokens.access_token;
}

function companySearchTerms(companies: string[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const company of companies) {
    const quoted = quoteGmailTerm(company);
    if (!quoted || quoted.length < 2) continue;
    const key = quoted.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(quoted);

    // Also search brand token (Afya Educação → Afya)
    const brand = normalizeMatchText(company)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3)[0];
    if (brand && brand.length >= 3) {
      const brandQuoted = quoteGmailTerm(brand);
      const brandKey = brandQuoted.toLowerCase();
      if (brandQuoted && !seen.has(brandKey)) {
        seen.add(brandKey);
        terms.push(brandQuoted);
      }
    }
  }
  return terms;
}

async function collectCandidateIds(
  accessToken: string,
  companies: string[],
  keywordQuery: string,
): Promise<{ ids: string[]; listCalls: number }> {
  const byId = new Map<string, GmailMessageListItem>();
  let listCalls = 0;

  const companyTerms = companySearchTerms(companies);
  for (const chunk of chunkOrQuery(companyTerms, COMPANY_CHUNK)) {
    const listed = await listRecentMessages(accessToken, {
      maxResults: MAX_MESSAGES,
      newerThanDays: LOOKBACK_DAYS,
      query: chunk,
    });
    listCalls += 1;
    for (const item of listed) byId.set(item.id, item);
    if (byId.size >= MAX_MESSAGES) break;
  }

  if (keywordQuery && byId.size < MAX_MESSAGES) {
    const listed = await listRecentMessages(accessToken, {
      maxResults: MAX_MESSAGES,
      newerThanDays: LOOKBACK_DAYS,
      query: keywordQuery,
    });
    listCalls += 1;
    for (const item of listed) byId.set(item.id, item);
  }

  return {
    ids: [...byId.keys()].slice(0, MAX_MESSAGES),
    listCalls,
  };
}

export interface SyncResult {
  scanned: number;
  created: number;
  lookbackDays: number;
  listCalls: number;
  candidates: number;
  blacklisted: number;
  noKeyword: number;
  noApplication: number;
  skippedAccepted: number;
  revived: number;
}

export async function syncUserInbox(
  env: Env,
  connection: GmailConnectionRow,
): Promise<SyncResult> {
  const accessToken = await resolveAccessToken(env, connection);
  const applications = await listApplications(env.DB, connection.user_email);
  const matchable = applications.map((app) => ({
    id: app.id,
    company: app.company,
    role: app.role,
    status: app.status,
  }));

  const rules = await loadGmailRules(env.DB, connection.user_email);
  // Keyword-only query (companies searched separately so Digai/Afya are not drowned out)
  const keywordQuery = gmailKeywordQuery(rules.keywords, [], []);
  const companies = applications.map((app) => app.company);

  const { ids, listCalls } = await collectCandidateIds(
    accessToken,
    companies,
    keywordQuery,
  );

  const messages = await getMessagesBatch(accessToken, ids);
  await hydrateMessageBodies(accessToken, messages, MAX_ATTACHMENT_FETCHES);

  let created = 0;
  let revived = 0;
  let blacklisted = 0;
  let noKeyword = 0;
  let noApplication = 0;
  let skippedAccepted = 0;

  for (const message of messages) {
    const from = getMessageFrom(message);
    const subject = getMessageSubject(message);
    const snippet = message.snippet ?? "";
    const body = getMessageBody(message);
    // Match company, role, and keywords on subject + body (snippet as preview text)
    const searchable = getMessageSubjectAndBody(message);

    if (isBlacklisted(searchable, rules.blacklist)) {
      blacklisted += 1;
      continue;
    }

    const keywordMatch = matchKeyword(searchable, rules.keywords);
    if (!keywordMatch) {
      noKeyword += 1;
      continue;
    }

    const application = findMatchingApplication(matchable, searchable);
    if (!application) {
      noApplication += 1;
      continue;
    }

    const preview = (snippet || body).slice(0, 280);
    const result = await upsertPendingSuggestion(env.DB, connection.user_email, {
      applicationId: application.id,
      gmailMessageId: message.id,
      suggestedStatus: keywordMatch.status,
      matchedKeyword: keywordMatch.keyword,
      emailFrom: from,
      emailSubject: subject,
      emailSnippet: preview,
    });

    if (!result) {
      skippedAccepted += 1;
      continue;
    }
    if (result.outcome === "created") created += 1;
    if (result.outcome === "revived") {
      created += 1;
      revived += 1;
    }
  }

  await markGmailSynced(env.DB, connection.user_email);
  return {
    scanned: messages.length,
    created,
    lookbackDays: LOOKBACK_DAYS,
    listCalls,
    candidates: ids.length,
    blacklisted,
    noKeyword,
    noApplication,
    skippedAccepted,
    revived,
  };
}
