import { getUserEmail, unauthorized } from "../../lib/auth";
import {
  getGmailConnection,
  listGmailConnections,
} from "../../lib/db";
import { syncUserInbox } from "../../lib/gmailSync";
import { requireDb, withHandler } from "../../lib/handler";

function hasCronAuth(request: Request, env: Env): boolean {
  if (!env.CRON_SECRET) return false;
  const header =
    request.headers.get("X-Cron-Secret") ??
    request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  return header === env.CRON_SECRET;
}

export const onRequestPost: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const isCron = hasCronAuth(context.request, context.env);

    if (isCron) {
      const connections = await listGmailConnections(db);
      const results: Array<Record<string, unknown>> = [];

      for (const connection of connections) {
        try {
          const result = await syncUserInbox(context.env, connection);
          results.push({ email: connection.user_email, ...result });
        } catch (err) {
          console.error(`Sync failed for ${connection.user_email}:`, err);
          results.push({
            email: connection.user_email,
            scanned: 0,
            created: 0,
            error: err instanceof Error ? err.message : "sync failed",
          });
        }
      }

      return Response.json({
        mode: "cron",
        users: results.length,
        results,
      });
    }

    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const connection = await getGmailConnection(db, email);
    if (!connection) {
      return Response.json(
        { error: "Gmail is not connected" },
        { status: 400 },
      );
    }

    const result = await syncUserInbox(context.env, connection);
    return Response.json({ mode: "user", ...result });
  });
