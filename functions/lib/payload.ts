import type { ApplicationPayload } from "./db";

function parseStage(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return undefined;
  return n;
}

export function normalizePayload(body: ApplicationPayload): ApplicationPayload | Response {
  if (!body.company?.trim() || !body.role?.trim() || !body.status) {
    return Response.json(
      { error: "company, role, and status are required" },
      { status: 400 },
    );
  }

  const stageCurrent = parseStage(body.stageCurrent);
  const stageTotal = parseStage(body.stageTotal);

  if (stageCurrent && stageTotal && stageCurrent > stageTotal) {
    return Response.json(
      { error: "stageCurrent cannot be greater than stageTotal" },
      { status: 400 },
    );
  }

  if ((stageCurrent && !stageTotal) || (!stageCurrent && stageTotal)) {
    return Response.json(
      { error: "Both stageCurrent and stageTotal are required for progress" },
      { status: 400 },
    );
  }

  return {
    company: body.company.trim(),
    role: body.role.trim(),
    status: body.status,
    platform: body.platform?.trim() || undefined,
    stageCurrent,
    stageTotal,
    appliedDate: body.appliedDate,
    followUpDate: body.followUpDate,
    interviewDate: body.interviewDate,
    jobUrl: body.jobUrl,
    notes: body.notes,
  };
}
