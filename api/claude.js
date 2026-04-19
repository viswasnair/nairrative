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

function b64url(s) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

async function verifyJWT(token, supabaseUrl) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const header = JSON.parse(b64url(parts[0]));
    const payload = JSON.parse(b64url(parts[1]));

    if (payload.exp && payload.exp < Date.now() / 1000) return false;

    const jwksRes = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    if (!jwksRes.ok) return false;
    const { keys } = await jwksRes.json();

    const jwk = header.kid ? keys.find(k => k.kid === header.kid) : keys[0];
    if (!jwk) return false;

    const enc = new TextEncoder();
    const sig = Uint8Array.from(b64url(parts[2]), c => c.charCodeAt(0));
    const data = enc.encode(`${parts[0]}.${parts[1]}`);

    let algorithm;
    if (jwk.kty === "RSA") algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
    else if (jwk.kty === "EC") algorithm = { name: "ECDSA", namedCurve: jwk.crv || "P-256", hash: "SHA-256" };
    else if (jwk.kty === "oct") algorithm = { name: "HMAC", hash: "SHA-256" };
    else return false;

    const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]);
    return await crypto.subtle.verify(algorithm, key, sig, data);
  } catch { return false; }
}

export default async function handler(req) {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(req) });

  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!apiKey) return new Response("API key not configured", { status: 500 });
  if (!supabaseUrl) return new Response("Server misconfigured", { status: 500 });

  const cors = corsHeaders(req);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return new Response("Unauthorized", { status: 401, headers: cors });

  if (!(await verifyJWT(token, supabaseUrl)))
    return new Response("Unauthorized", { status: 401, headers: cors });

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
