import { getUserEmail, unauthorized } from "../../../lib/auth";
import { buildAuthUrl, requireGoogleConfig, resolveRedirectUri } from "../../../lib/gmail";
import { createOAuthState } from "../../../lib/oauthState";
import { withHandler } from "../../../lib/handler";

export const onRequestGet: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const config = requireGoogleConfig(context.env);
    if (config instanceof Response) return config;

    const state = await createOAuthState(config.encryptionKey, email);
    const redirectUri = resolveRedirectUri(context.request, context.env);
    const authUrl = buildAuthUrl({
      clientId: config.clientId,
      redirectUri,
      state,
    });

    return Response.redirect(authUrl, 302);
  });
