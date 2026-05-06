export const config = { runtime: "edge" };

const PRODUCTION_ORIGIN = "https://nairrative.vercel.app";

function corsHeaders(req) {
  const origin = req.headers.get("Origin") || "";
  const allowed = process.env.ALLOWED_ORIGIN || PRODUCTION_ORIGIN;
  return {
    "Access-Control-Allow-Origin": origin === allowed ? allowed : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
]);
const MAX_TOKENS_HARD_LIMIT = 2000;

const RATE_LIMIT = 30;
const RATE_WINDOW_S = 60;

// Returns true (allow) or false (block). Fails open if Redis is unreachable.
async function checkRateLimit(sub, redisUrl, redisToken) {
  try {
    const key = `rl:${sub}`;
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, RATE_WINDOW_S]]),
    });
    if (!res.ok) return true;
    const data = await res.json();
    const count = data[0]?.result;
    return typeof count !== "number" || count <= RATE_LIMIT;
  } catch { return true; }
}

function b64url(s) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

// Returns { ok: true, sub } on success, { ok: false } on failure
async function verifyJWT(token, supabaseUrl) {
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

function securityLog(event, req, extra = {}) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  console.warn(JSON.stringify({ event, ip, t: new Date().toISOString(), ...extra }));
}

export default async function handler(req) {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(req) });

  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!apiKey) return new Response("API key not configured", { status: 500 });
  if (!supabaseUrl) return new Response("Server misconfigured", { status: 500 });
  if (!redisUrl || !redisToken) return new Response("Server misconfigured", { status: 500 });

  const cors = corsHeaders(req);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    securityLog("missing_token", req);
    return new Response("Unauthorized", { status: 401, headers: cors });
  }

  const { ok, sub } = await verifyJWT(token, supabaseUrl);
  if (!ok) {
    securityLog("invalid_jwt", req);
    return new Response("Unauthorized", { status: 401, headers: cors });
  }

  if (!await checkRateLimit(sub, redisUrl, redisToken)) {
    securityLog("rate_limit_exceeded", req, { sub });
    return new Response("Too Many Requests", { status: 429, headers: cors });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response("Invalid JSON", { status: 400, headers: cors }); }

  if (body.model && !ALLOWED_MODELS.has(body.model))
    return new Response("Model not allowed", { status: 400, headers: cors });
  if (body.max_tokens > MAX_TOKENS_HARD_LIMIT)
    body.max_tokens = MAX_TOKENS_HARD_LIMIT;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
