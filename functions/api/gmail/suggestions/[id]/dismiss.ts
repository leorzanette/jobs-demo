import { getUserEmail, unauthorized } from "../../../../lib/auth";
import {
  getApplicationById,
  getSuggestion,
  rowToSuggestion,
  updateSuggestionStatus,
} from "../../../../lib/db";
import { requireDb, withHandler } from "../../../../lib/handler";

export const onRequestPost: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const id = context.params.id as string;
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const suggestion = await getSuggestion(db, email, id);
    if (!suggestion || suggestion.status !== "pending") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await updateSuggestionStatus(db, email, id, "dismissed");
    if (!updated) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const app = await getApplicationById(db, email, updated.application_id);

    return Response.json({
      suggestion: rowToSuggestion(
        updated,
        app
          ? { company: app.company, role: app.role, status: app.status }
          : null,
      ),
    });
  });
