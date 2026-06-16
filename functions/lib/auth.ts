import { createRemoteJWKSet, jwtVerify } from "jose";

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
    const JWKS = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const options: { issuer: string; audience?: string | string[] } = {
      issuer,
    };
    if (env.ACCESS_AUD) {
      options.audience = env.ACCESS_AUD;
    }

    const { payload } = await jwtVerify(token, JWKS, options);
    return emailFromPayload(payload as Record<string, unknown>);
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}