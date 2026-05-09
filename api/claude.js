export const config = { runtime: "edge" };

import { corsHeaders, checkRateLimit, verifyJWT } from "./lib/apiUtils.js";
import { PROVIDERS, resolveProvider, isAllowedModel } from "./lib/providers.js";

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

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
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

  if (!Array.isArray(body.messages) || body.messages.length === 0)
    return new Response("Invalid request: messages must be a non-empty array", { status: 400, headers: cors });
  if (body.max_tokens !== undefined) {
    if (!Number.isInteger(body.max_tokens) || body.max_tokens <= 0)
      return new Response("Invalid request: max_tokens must be a positive integer", { status: 400, headers: cors });
  }
  if (body.model !== undefined && typeof body.model !== "string")
    return new Response("Invalid request: model must be a string", { status: 400, headers: cors });
  if (body.model && !isAllowedModel(body.model))
    return new Response("Model not allowed", { status: 400, headers: cors });
  if (body.max_tokens > MAX_TOKENS_HARD_LIMIT)
    body.max_tokens = MAX_TOKENS_HARD_LIMIT;

  const providerKey = resolveProvider(body.model);
  const provider = PROVIDERS[providerKey];
  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) return new Response("AI service temporarily unavailable", { status: 500, headers: cors });

  try {
    const providerBody = provider.buildRequest(body);
    const upstream = await fetch(provider.apiUrl, {
      method: "POST",
      headers: provider.requestHeaders(apiKey),
      body: JSON.stringify(providerBody),
    });
    const data = await upstream.json();
    const normalized = provider.normalizeResponse(data);
    return new Response(JSON.stringify(normalized), {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("llm proxy error:", err);
    return new Response("AI service temporarily unavailable", {
      status: 500,
      headers: cors,
    });
  }
}
