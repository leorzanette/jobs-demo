import { getUserEmail, unauthorized } from "../../lib/auth";
import { upsertGmailRules } from "../../lib/db";
import { DEFAULT_GMAIL_RULES, normalizeGmailRules } from "../../lib/gmailRules";
import { loadGmailRules } from "../../lib/gmailRulesStore";
import { requireDb, withHandler } from "../../lib/handler";

export const onRequestGet: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const rules = await loadGmailRules(db, email);
    return Response.json(rules);
  });

export const onRequestPut: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const normalized = normalizeGmailRules(body);
    if (typeof normalized === "string") {
      return Response.json({ error: normalized }, { status: 400 });
    }

    await upsertGmailRules(
      db,
      email,
      JSON.stringify(normalized.keywords),
      JSON.stringify(normalized.blacklist),
    );

    return Response.json(normalized);
  });

export const onRequestPost: PagesFunction<Env> = async (context) =>
  withHandler(async () => {
    // Reset to defaults
    const email = await getUserEmail(context.request, context.env);
    if (!email) return unauthorized();

    const db = await requireDb(context.env);
    if (db instanceof Response) return db;

    const defaults = structuredClone(DEFAULT_GMAIL_RULES);
    await upsertGmailRules(
      db,
      email,
      JSON.stringify(defaults.keywords),
      JSON.stringify(defaults.blacklist),
    );

    return Response.json(defaults);
  });
