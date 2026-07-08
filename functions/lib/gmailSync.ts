import { decryptSecret, encryptSecret } from "./crypto";
import {
  getMessage,
  getMessageFrom,
  getMessageSubject,
  listRecentMessages,
  refreshAccessToken,
  requireGoogleConfig,
} from "./gmail";
import { findMatchingApplication, matchKeyword } from "./gmailRules";
import {
  insertSuggestion,
  listApplications,
  markGmailSynced,
  updateGmailAccessToken,
  type GmailConnectionRow,
} from "./db";

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

  const messages = await listRecentMessages(accessToken, {
    maxResults: 50,
    newerThanDays: 14,
  });

  let created = 0;

  for (const item of messages) {
    const message = await getMessage(accessToken, item.id);
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
