import { encryptSecret } from "../../../lib/crypto";
import {
  exchangeCodeForTokens,
  requireGoogleConfig,
  resolveRedirectUri,
} from "../../../lib/gmail";
import { getGmailConnection, upsertGmailConnection } from "../../../lib/db";
import { requireDb, withHandler } from "../../../lib/handler";
import { verifyOAuthState } from "../../../lib/oauthState";

function homeRedirect(request: Request, query: Record<string, string>): Response {
  const url = new URL(request.url);
  const target = new URL("/", url.origin);
  for (const [key, value] of Object.entries(query)) {
    target.searchParams.set(key, value);
  }
  return Response.redirect(target.toString(), 302);
}

export const onRequestGet: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const config = requireGoogleConfig(context.env);
    if (config instanceof Response) {
      return homeRedirect(context.request, { gmail: "error", reason: "not_configured" });
    }

    const url = new URL(context.request.url);
    const error = url.searchParams.get("error");
    if (error) {
      return homeRedirect(context.request, { gmail: "error", reason: error });
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return homeRedirect(context.request, { gmail: "error", reason: "missing_code" });
    }

    const email = await verifyOAuthState(config.encryptionKey, state);
    if (!email) {
      return homeRedirect(context.request, { gmail: "error", reason: "invalid_state" });
    }

    const db = await requireDb(context.env);
    if (db instanceof Response) {
      return homeRedirect(context.request, { gmail: "error", reason: "db" });
    }

    const redirectUri = resolveRedirectUri(context.request, context.env);
    let tokens;
    try {
      tokens = await exchangeCodeForTokens({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        code,
        redirectUri,
      });
    } catch (err) {
      console.error("OAuth exchange failed:", err);
      return homeRedirect(context.request, { gmail: "error", reason: "token_exchange" });
    }

    if (!tokens.refresh_token) {
      // User may have previously connected; keep existing refresh token
      const existing = await getGmailConnection(db, email);
      if (!existing) {
        return homeRedirect(context.request, {
          gmail: "error",
          reason: "no_refresh_token",
        });
      }

      const accessTokenEnc = await encryptSecret(
        config.encryptionKey,
        tokens.access_token,
      );
      await upsertGmailConnection(db, email, {
        refreshTokenEnc: existing.refresh_token_enc,
        accessTokenEnc,
        accessTokenExpiresAt: new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString(),
      });
      return homeRedirect(context.request, { gmail: "connected" });
    }

    const refreshTokenEnc = await encryptSecret(
      config.encryptionKey,
      tokens.refresh_token,
    );
    const accessTokenEnc = await encryptSecret(
      config.encryptionKey,
      tokens.access_token,
    );

    await upsertGmailConnection(db, email, {
      refreshTokenEnc,
      accessTokenEnc,
      accessTokenExpiresAt: new Date(
        Date.now() + tokens.expires_in * 1000,
      ).toISOString(),
    });

    return homeRedirect(context.request, { gmail: "connected" });
  });
