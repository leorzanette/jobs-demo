import { createRemoteJWKSet, jwtVerify } from "jose";

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
  const JWKS = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));

  try {
    const options: { issuer: string; audience?: string } = { issuer };
    if (env.ACCESS_AUD) {
      options.audience = env.ACCESS_AUD;
    }

    const { payload } = await jwtVerify(token, JWKS, options);
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}