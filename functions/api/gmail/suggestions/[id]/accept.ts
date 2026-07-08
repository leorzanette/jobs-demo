import { getUserEmail, unauthorized } from "../../../../lib/auth";
import {
  getApplicationById,
  getSuggestion,
  rowToApplication,
  rowToSuggestion,
  updateApplicationStatus,
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

    const application = await getApplicationById(
      db,
      email,
      suggestion.application_id,
    );
    if (!application) {
      return Response.json(
        { error: "Matched application no longer exists" },
        { status: 404 },
      );
    }

    const updatedApp = await updateApplicationStatus(
      db,
      email,
      application.id,
      suggestion.suggested_status,
    );
    if (!updatedApp) {
      return Response.json({ error: "Failed to update application" }, { status: 500 });
    }

    const updatedSuggestion = await updateSuggestionStatus(
      db,
      email,
      id,
      "accepted",
    );

    return Response.json({
      suggestion: rowToSuggestion(updatedSuggestion!, {
        company: updatedApp.company,
        role: updatedApp.role,
        status: updatedApp.status,
      }),
      application: rowToApplication(updatedApp),
    });
  });
