import { getUserEmail, unauthorized } from "../../lib/auth";
import {
  deleteApplication,
  rowToApplication,
  updateApplication,
  type ApplicationPayload,
} from "../../lib/db";
import { requireDb, withHandler } from "../../lib/handler";

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

    let body: ApplicationPayload;
    try {
      body = await context.request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.company?.trim() || !body.role?.trim() || !body.status) {
      return Response.json(
        { error: "company, role, and status are required" },
        { status: 400 },
      );
    }

    const row = await updateApplication(db, email, id, {
      company: body.company.trim(),
      role: body.role.trim(),
      status: body.status,
      appliedDate: body.appliedDate,
      followUpDate: body.followUpDate,
      interviewDate: body.interviewDate,
      jobUrl: body.jobUrl,
      notes: body.notes,
    });

    if (!row) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json(rowToApplication(row));
  });

export const onRequestDelete: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const id = context.params.id as string;
    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const deleted = await deleteApplication(db, email, id);
    if (!deleted) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  });