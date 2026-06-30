import { getUserEmail, unauthorized } from "../../lib/auth";
import {
  createApplication,
  listApplications,
  rowToApplication,
  type ApplicationPayload,
} from "../../lib/db";
import { requireDb, withHandler } from "../../lib/handler";
import { normalizePayload } from "../../lib/payload";

export const onRequestGet: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const rows = await listApplications(db, email);
    return Response.json(rows.map(rowToApplication));
  });

export const onRequestPost: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

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

    const payload = normalizePayload(body);
    if (payload instanceof Response) return payload;

    const row = await createApplication(db, email, payload);

    return Response.json(rowToApplication(row), { status: 201 });
  });