// ── AI provider adapter ───────────────────────────────────────────────────────
// All client-side AI calls flow through this file.
// To swap Claude for another LLM provider, replace only the internals here.

import { LLM_URL, claudeHeaders } from "./api";

export const AI_MODELS = {
  fast:     "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-6",
  smart:    "claude-opus-4-6",
};

// Sends a request to the AI proxy and returns parsed JSON.
// Throws on non-2xx HTTP or network failure.
export async function callAI(messages, { model = AI_MODELS.fast, maxTokens = 1000, system, tools } = {}, session) {
  const body = { model, max_tokens: maxTokens, messages };
  if (system) body.system = system;
  if (tools)  body.tools  = tools;

  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: claudeHeaders(session),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  return res.json();
}
