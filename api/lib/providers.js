export const PROVIDERS = {
  anthropic: {
    apiUrl: "https://api.anthropic.com/v1/messages",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    allowedModels: new Set([
      "claude-haiku-4-5-20251001",
      "claude-sonnet-4-6",
      "claude-opus-4-6",
    ]),
    requestHeaders: (key) => ({
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
    // Anthropic is the canonical request/response format — no transformation needed
    buildRequest: (body) => body,
    normalizeResponse: (data) => data,
    supportsTools: true,
  },
  openai: {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    allowedModels: new Set(["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]),
    requestHeaders: (key) => ({
      "content-type": "application/json",
      Authorization: `Bearer ${key}`,
    }),
    buildRequest: (body) => {
      // Move Anthropic's top-level `system` into the messages array, strip unsupported fields
      const messages = [...(body.messages || [])];
      if (body.system) messages.unshift({ role: "system", content: body.system });
      const { system: _system, tools: _tools, ...rest } = body;
      return { ...rest, messages };
    },
    normalizeResponse: (data) => ({
      content: [{ type: "text", text: data.choices?.[0]?.message?.content ?? "" }],
    }),
    supportsTools: false,
  },
};

// Derive provider from model name prefix; default to anthropic
export function resolveProvider(model) {
  if (typeof model === "string") {
    if (model.startsWith("claude")) return "anthropic";
    if (model.startsWith("gpt")) return "openai";
  }
  return "anthropic";
}

// Returns true if the model is whitelisted in any registered provider
export function isAllowedModel(model) {
  return Object.values(PROVIDERS).some((p) => p.allowedModels.has(model));
}
