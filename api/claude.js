export const config = { runtime: "edge" };

import { corsHeaders, checkRateLimit, verifyJWT } from "./lib/apiUtils.js";

const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
]);
const MAX_TOKENS_HARD_LIMIT = 2000;

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
