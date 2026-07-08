import { getUserEmail, unauthorized } from "../../lib/auth";
import { decryptSecret } from "../../lib/crypto";
import {
  deleteGmailConnection,
  getGmailConnection,
} from "../../lib/db";
import { requireGoogleConfig, revokeToken } from "../../lib/gmail";
import { requireDb, withHandler } from "../../lib/handler";

export const onRequestDelete: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const connection = await getGmailConnection(db, email);
    if (!connection) {
      return Response.json({ error: "Not connected" }, { status: 404 });
    }

    const config = requireGoogleConfig(context.env);
    if (!(config instanceof Response)) {
      try {
        const refreshToken = await decryptSecret(
          config.encryptionKey,
          connection.refresh_token_enc,
        );
        await revokeToken(refreshToken);
      } catch (err) {
        console.error("Token revoke failed:", err);
      }
    }

    await deleteGmailConnection(db, email);
    return new Response(null, { status: 204 });
  });
