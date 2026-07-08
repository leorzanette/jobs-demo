/**
 * Companion cron Worker — POSTs /api/gmail/sync with CRON_SECRET every 10 minutes.
 *
 * Deploy:
 *   cd workers/gmail-cron && npx wrangler deploy
 *
 * Secrets:
 *   npx wrangler secret put CRON_SECRET
 *   (must match the Pages CRON_SECRET)
 *
 * Cloudflare Access must allow this request through (bypass /api/gmail/sync
 * or use a service token — see README).
 */

export interface Env {
  CRON_SECRET: string;
  SYNC_URL: string;
}

async function triggerSync(env: Env): Promise<void> {
  const response = await fetch(env.SYNC_URL, {
    method: "POST",
    headers: {
      "X-Cron-Secret": env.CRON_SECRET,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sync trigger failed (${response.status}): ${text}`);
  }

  console.log("Gmail sync triggered:", await response.text());
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(triggerSync(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Use POST or wait for cron", { status: 405 });
    }
    const auth = request.headers.get("X-Cron-Secret");
    if (!env.CRON_SECRET || auth !== env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    await triggerSync(env);
    return Response.json({ ok: true });
  },
};
