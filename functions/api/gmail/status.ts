import { getUserEmail, unauthorized } from "../../lib/auth";
import {
  countPendingSuggestions,
  getGmailConnection,
} from "../../lib/db";
import { requireDb, withHandler } from "../../lib/handler";

export const onRequestGet: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const connection = await getGmailConnection(db, email);
    const pendingCount = await countPendingSuggestions(db, email);

    return Response.json({
      connected: Boolean(connection),
      lastSyncedAt: connection?.last_synced_at ?? null,
      pendingCount,
    });
  });
