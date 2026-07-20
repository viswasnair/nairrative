// ── API edge function utilities ───────────────────────────────────────────
// Extracted here so they can be unit-tested independently of the handler.

export const PRODUCTION_ORIGIN = "https://nairrative.vercel.app";

export function corsHeaders(req) {
  const origin = req.headers.get("Origin") || "";
  const allowed = process.env.ALLOWED_ORIGIN || PRODUCTION_ORIGIN;
  return {
    "Access-Control-Allow-Origin": origin === allowed ? allowed : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Returns { ok: true } when origin is allowed, { ok: false, origin } when rejected.
export function checkOrigin(req) {
  const origin = req.headers.get("Origin") || "";
  if (!origin) return { ok: true };
  const allowed = process.env.ALLOWED_ORIGIN || PRODUCTION_ORIGIN;
  return origin === allowed ? { ok: true } : { ok: false, origin };
}

const RATE_LIMIT = 30;
const RATE_WINDOW_S = 60;

// Returns true (allow) or false (block). Fails closed if Redis is unreachable.
export async function checkRateLimit(sub, redisUrl, redisToken) {
  try {
    const key = `rl:${sub}`;
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, RATE_WINDOW_S]]),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const count = data[0]?.result;
    return typeof count === "number" && count <= RATE_LIMIT;
  } catch { return false; }
}

export function b64url(s) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

// Returns { ok: true, sub } on success, { ok: false } on failure
export async function verifyJWT(token, supabaseUrl) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { ok: false };

    const header = JSON.parse(b64url(parts[0]));
    const payload = JSON.parse(b64url(parts[1]));

    if (payload.exp && payload.exp < Date.now() / 1000) return { ok: false };

    const jwksRes = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    if (!jwksRes.ok) return { ok: false };
    const { keys } = await jwksRes.json();

    const jwk = header.kid ? keys.find(k => k.kid === header.kid) : keys[0];
    if (!jwk) return { ok: false };

    // Reject tokens where header.alg doesn't match the key type — prevents algorithm confusion attacks.
    const algFamilies = { RSA: "RS", EC: "ES", oct: "HS" };
    const expectedFamily = algFamilies[jwk.kty];
    if (!expectedFamily || typeof header.alg !== "string" || !header.alg.startsWith(expectedFamily))
      return { ok: false };

    const enc = new TextEncoder();
    const sig = Uint8Array.from(b64url(parts[2]), c => c.charCodeAt(0));
    const data = enc.encode(`${parts[0]}.${parts[1]}`);

    let algorithm;
    if (jwk.kty === "RSA") algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    else if (jwk.kty === "EC") algorithm = { name: "ECDSA", namedCurve: jwk.crv || "P-256", hash: "SHA-256" };
    else if (jwk.kty === "oct") algorithm = { name: "HMAC", hash: "SHA-256" };
    else return { ok: false };

    const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]);
    const valid = await crypto.subtle.verify(algorithm, key, sig, data);
    return valid ? { ok: true, sub: payload.sub } : { ok: false };
  } catch { return { ok: false }; }
}
