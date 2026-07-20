// ── AI provider adapter ───────────────────────────────────────────────────────
// All client-side AI calls flow through this file.
// To swap Claude for another LLM provider, replace only the internals here.

import { LLM_URL, claudeHeaders } from "./api";

export const AI_MODELS = {
  fast:     "claude-haiku-4-5-20251001",
  standard: "claude-sonnet-4-6",
  quality:  "claude-opus-4-6",
};

/**
 * Sends a request to the AI proxy and returns parsed JSON.
 * Throws on non-2xx HTTP or network failure.
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ model?: string, maxTokens?: number, system?: string, tools?: object[], signal?: AbortSignal }} [options]
 * @param {object} [session]
 * @returns {Promise<object>}
 */
export async function callAI(messages, { model = AI_MODELS.fast, maxTokens = 1000, system, tools, signal } = {}, session) {
  const body = { model, max_tokens: maxTokens, messages };
  if (system) body.system = system;
  if (tools)  body.tools  = tools;

  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: claudeHeaders(session),
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  return res.json();
}
