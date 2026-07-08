import { getUserEmail, unauthorized } from "../../../lib/auth";
import {
  deleteAllSuggestions,
  getApplicationById,
  listPendingSuggestions,
  rowToSuggestion,
} from "../../../lib/db";
import { requireDb, withHandler } from "../../../lib/handler";

export const onRequestGet: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const rows = await listPendingSuggestions(db, email);
    const suggestions = [];

    for (const row of rows) {
      const app = await getApplicationById(db, email, row.application_id);
      suggestions.push(
        rowToSuggestion(
          row,
          app
            ? { company: app.company, role: app.role, status: app.status }
            : null,
        ),
      );
    }

    return Response.json(suggestions);
  });

export const onRequestDelete: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const deleted = await deleteAllSuggestions(db, email);
    return Response.json({ deleted });
  });
