import { getUserEmail, unauthorized } from "../../lib/auth";
import {
  createApplication,
  listApplications,
  rowToApplication,
  type ApplicationPayload,
} from "../../lib/db";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const email = await getUserEmail(context.request, context.env);
  if (!email) return unauthorized();

  const rows = await listApplications(context.env.DB, email);
  return Response.json(rows.map(rowToApplication));
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const email = await getUserEmail(context.request, context.env);
  if (!email) return unauthorized();

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

  const row = await createApplication(context.env.DB, email, {
    company: body.company.trim(),
    role: body.role.trim(),
    status: body.status,
    appliedDate: body.appliedDate,
    followUpDate: body.followUpDate,
    interviewDate: body.interviewDate,
    jobUrl: body.jobUrl,
    notes: body.notes,
  });

  return Response.json(rowToApplication(row), { status: 201 });
};