import { createRemoteJWKSet, jwtVerify } from "jose";

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedIssuer: string | null = null;

function getJwks(issuer: string) {
  if (cachedIssuer !== issuer || !cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    cachedIssuer = issuer;
  }
  return cachedJwks;
}

function emailFromPayload(payload: Record<string, unknown>): string | null {
  if (typeof payload.email === "string") return payload.email;
  if (typeof payload.common_name === "string") return payload.common_name;
  return null;
}

export async function getUserEmail(
  request: Request,
  env: Env,
): Promise<string | null> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    return env.DEV_BYPASS_EMAIL ?? null;
  }

  const teamDomain =
    env.ACCESS_TEAM_DOMAIN ?? "leorzanet.cloudflareaccess.com";
  const issuer = `https://${teamDomain}`;

  try {
    const options: { issuer: string; audience?: string | string[] } = {
      issuer,
    };
    if (env.ACCESS_AUD) {
      options.audience = env.ACCESS_AUD;
    }

    const { payload } = await jwtVerify(token, getJwks(issuer), options);
    return emailFromPayload(payload as Record<string, unknown>);
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
