const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function createOAuthState(
  secret: string,
  email: string,
): Promise<string> {
  const payload = bytesToBase64Url(
    encoder.encode(
      JSON.stringify({
        email,
        exp: Date.now() + 10 * 60 * 1000,
        n: crypto.randomUUID(),
      }),
    ),
  );
  const sig = await hmacSign(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyOAuthState(
  secret: string,
  state: string,
): Promise<string | null> {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;

  const expected = await hmacSign(secret, payload);
  if (expected !== sig) return null;

  try {
    const json = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as {
      email?: string;
      exp?: number;
    };
    if (!json.email || !json.exp || Date.now() > json.exp) return null;
    return json.email;
  } catch {
    return null;
  }
}
