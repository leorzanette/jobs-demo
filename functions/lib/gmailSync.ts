import { decryptSecret, encryptSecret } from "./crypto";
import {
  getMessagesBatch,
  listRecentMessages,
  refreshAccessToken,
  requireGoogleConfig,
  getMessageFrom,
  getMessageSubject,
} from "./gmail";
import {
  findMatchingApplication,
  gmailKeywordQuery,
  matchKeyword,
} from "./gmailRules";
import {
  insertSuggestion,
  listApplications,
  markGmailSynced,
  updateGmailAccessToken,
  type GmailConnectionRow,
} from "./db";

/** Stay well under Workers Free external subrequest cap (50). */
const MAX_MESSAGES = 40;

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

  if (
    connection.access_token_enc &&
    expiresAt > now + 60_000
  ) {
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

export async function syncUserInbox(
  env: Env,
  connection: GmailConnectionRow,
): Promise<{ scanned: number; created: number }> {
  const accessToken = await resolveAccessToken(env, connection);
  const applications = await listApplications(env.DB, connection.user_email);
  const matchable = applications.map((app) => ({
    id: app.id,
    company: app.company,
    role: app.role,
    status: app.status,
  }));

  // External subrequests: ~1 token refresh (optional) + 1 list + 1 batch
  const listed = await listRecentMessages(accessToken, {
    maxResults: MAX_MESSAGES,
    newerThanDays: 14,
    query: gmailKeywordQuery(),
  });

  const messages = await getMessagesBatch(
    accessToken,
    listed.map((item) => item.id),
  );

  let created = 0;

  for (const message of messages) {
    const from = getMessageFrom(message);
    const subject = getMessageSubject(message);
    const snippet = message.snippet ?? "";
    const searchable = `${from} ${subject} ${snippet}`;

    const keywordMatch = matchKeyword(`${subject} ${snippet}`);
    if (!keywordMatch) continue;

    const application = findMatchingApplication(matchable, searchable);
    if (!application) continue;

    if (application.status === keywordMatch.status) continue;

    const row = await insertSuggestion(env.DB, connection.user_email, {
      applicationId: application.id,
      gmailMessageId: message.id,
      suggestedStatus: keywordMatch.status,
      matchedKeyword: keywordMatch.keyword,
      emailFrom: from,
      emailSubject: subject,
      emailSnippet: snippet.slice(0, 280),
    });

    if (row) created += 1;
  }

  await markGmailSynced(env.DB, connection.user_email);
  return { scanned: messages.length, created };
}
