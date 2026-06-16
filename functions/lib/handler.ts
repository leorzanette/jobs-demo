export function requireDb(env: Env): D1Database | Response {
  if (!env.DB) {
    return Response.json(
      { error: "Database binding missing. Add D1 binding named DB in Pages settings." },
      { status: 503 },
    );
  }
  return env.DB;
}

export async function withHandler(
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error("API error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}