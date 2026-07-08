import { getUserEmail, unauthorized } from "../../../../lib/auth";
import {
  getApplicationById,
  getSuggestion,
  rowToApplication,
  rowToSuggestion,
  updateApplicationStatus,
  updateSuggestionFields,
} from "../../../../lib/db";
import { SUGGESTED_STATUSES } from "../../../../lib/gmailRules";
import { requireDb, withHandler } from "../../../../lib/handler";

const REVIEW_STATUSES = new Set(["pending", "accepted", "dismissed"]);

export const onRequestPut: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const id = context.params.id as string;
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await getSuggestion(db, email, id);
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    let body: {
      suggestedStatus?: string;
      status?: string;
      applyToApplication?: boolean;
    };
    try {
      body = await context.request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (
      body.suggestedStatus !== undefined &&
      !SUGGESTED_STATUSES.includes(
        body.suggestedStatus as (typeof SUGGESTED_STATUSES)[number],
      )
    ) {
      return Response.json({ error: "Invalid suggestedStatus" }, { status: 400 });
    }

    if (body.status !== undefined && !REVIEW_STATUSES.has(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const apply =
      body.applyToApplication === true ||
      (body.status === "accepted" && body.applyToApplication !== false);

    let nextStatus =
      (body.status as "pending" | "accepted" | "dismissed" | undefined) ??
      existing.status;
    if (apply) nextStatus = "accepted";

    const updated = await updateSuggestionFields(db, email, id, {
      suggestedStatus: body.suggestedStatus,
      status: nextStatus,
    });
    if (!updated) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    let application = await getApplicationById(
      db,
      email,
      updated.application_id,
    );

    if (apply && application) {
      const appRow = await updateApplicationStatus(
        db,
        email,
        application.id,
        updated.suggested_status,
      );
      if (appRow) application = appRow;
    }

    return Response.json({
      suggestion: rowToSuggestion(
        updated,
        application
          ? {
              company: application.company,
              role: application.role,
              status: application.status,
            }
          : null,
      ),
      application: application ? rowToApplication(application) : null,
    });
  });
