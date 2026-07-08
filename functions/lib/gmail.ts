const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function requireGoogleConfig(env: Env): {
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
} | Response {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.TOKEN_ENCRYPTION_KEY
  ) {
    return Response.json(
      {
        error:
          "Gmail integration is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and TOKEN_ENCRYPTION_KEY.",
      },
      { status: 503 },
    );
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    encryptionKey: env.TOKEN_ENCRYPTION_KEY,
  };
}

export function resolveRedirectUri(request: Request, env: Env): string {
  if (env.GMAIL_REDIRECT_URI) return env.GMAIL_REDIRECT_URI;
  const url = new URL(request.url);
  return `${url.origin}/api/gmail/oauth/callback`;
}

export function buildAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: opts.state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export async function exchangeCodeForTokens(opts: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function refreshAccessToken(opts: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      refresh_token: opts.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed: ${text}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

export interface GmailMessageListItem {
  id: string;
  threadId: string;
}

export interface GmailMessage {
  id: string;
  snippet: string;
  payload?: {
    headers?: { name: string; value: string }[];
  };
  internalDate?: string;
}

function headerValue(
  message: GmailMessage,
  name: string,
): string | undefined {
  const headers = message.payload?.headers ?? [];
  const found = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return found?.value;
}

export function getMessageFrom(message: GmailMessage): string {
  return headerValue(message, "From") ?? "";
}

export function getMessageSubject(message: GmailMessage): string {
  return headerValue(message, "Subject") ?? "";
}

export async function listRecentMessages(
  accessToken: string,
  opts?: { maxResults?: number; newerThanDays?: number; query?: string },
): Promise<GmailMessageListItem[]> {
  const maxResults = opts?.maxResults ?? 40;
  const days = opts?.newerThanDays ?? 14;
  const extra = opts?.query?.trim();
  const q = extra
    ? `newer_than:${days}d ${extra}`
    : `newer_than:${days}d`;
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    q,
  });

  const response = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail list failed: ${text}`);
  }

  const data = (await response.json()) as { messages?: GmailMessageListItem[] };
  return data.messages ?? [];
}

export async function getMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailMessage> {
  const url = `${GMAIL_API}/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail get message failed: ${text}`);
  }

  return response.json() as Promise<GmailMessage>;
}

/**
 * Fetch message metadata in one HTTP call via Gmail's batch API.
 * Essential on Workers Free (50 external subrequests/invocation).
 */
export async function getMessagesBatch(
  accessToken: string,
  messageIds: string[],
): Promise<GmailMessage[]> {
  if (messageIds.length === 0) return [];

  const boundary = `batch_${crypto.randomUUID().replace(/-/g, "")}`;
  const parts = messageIds.map((id, index) => {
    const path = `/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`;
    return [
      `--${boundary}`,
      "Content-Type: application/http",
      `Content-ID: <item${index}+${id}>`,
      "",
      `GET ${path}`,
      "",
    ].join("\r\n");
  });
  const body = `${parts.join("\r\n")}\r\n--${boundary}--`;

  const response = await fetch("https://gmail.googleapis.com/batch/gmail/v1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail batch failed: ${text}`);
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const match = /boundary="?([^";]+)"?/i.exec(contentType);
  if (!match?.[1]) {
    throw new Error("Gmail batch response missing boundary");
  }

  const text = await response.text();
  return parseBatchMessages(text, match[1]);
}

function parseBatchMessages(raw: string, boundary: string): GmailMessage[] {
  const delimiter = `--${boundary}`;
  const chunks = raw.split(delimiter).slice(1);
  const messages: GmailMessage[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed || trimmed === "--") continue;

    // Each part: multipart headers, then nested HTTP response, then JSON body
    const jsonStart = trimmed.indexOf("{");
    if (jsonStart === -1) continue;

    const statusLine = trimmed.match(/HTTP\/\d(?:\.\d)?\s+(\d{3})/);
    if (statusLine && Number(statusLine[1]) >= 400) continue;

    try {
      const json = JSON.parse(trimmed.slice(jsonStart)) as GmailMessage;
      if (json.id) messages.push(json);
    } catch {
      // skip malformed part
    }
  }

  return messages;
}
