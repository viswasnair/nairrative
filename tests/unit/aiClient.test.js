import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("../../src/lib/api", () => ({
  LLM_URL: "https://test-proxy/api/claude",
  claudeHeaders: vi.fn((session) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token ?? "anon"}`,
  })),
}));

import { AI_MODELS, callAI } from "../../src/lib/aiClient";
import { claudeHeaders } from "../../src/lib/api";

const SESSION = { access_token: "tok-abc" };
const MESSAGES = [{ role: "user", content: "Hello" }];

beforeEach(() => { vi.clearAllMocks(); });

afterEach(() => { vi.unstubAllGlobals(); });

describe("AI_MODELS", () => {
  it("exports non-empty strings for fast, standard, quality", () => {
    expect(typeof AI_MODELS.fast).toBe("string");
    expect(AI_MODELS.fast.length).toBeGreaterThan(0);
    expect(typeof AI_MODELS.standard).toBe("string");
    expect(AI_MODELS.standard.length).toBeGreaterThan(0);
    expect(typeof AI_MODELS.quality).toBe("string");
    expect(AI_MODELS.quality.length).toBeGreaterThan(0);
  });

  it("exports distinct model strings", () => {
    const values = Object.values(AI_MODELS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("callAI", () => {
  it("calls fetch with POST, correct URL, headers, and serialized body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: "Hi" }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await callAI(MESSAGES, { model: AI_MODELS.fast, maxTokens: 500 }, SESSION);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://test-proxy/api/claude");
    expect(opts.method).toBe("POST");
    expect(claudeHeaders).toHaveBeenCalledWith(SESSION);

    const body = JSON.parse(opts.body);
    expect(body.model).toBe(AI_MODELS.fast);
    expect(body.max_tokens).toBe(500);
    expect(body.messages).toEqual(MESSAGES);
  });

  it("includes system in body when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await callAI(MESSAGES, { system: "Be helpful" }, SESSION);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system).toBe("Be helpful");
  });

  it("omits system when not provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await callAI(MESSAGES, {}, SESSION);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("system");
  });

  it("returns parsed JSON on success", async () => {
    const payload = { content: [{ text: "response" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    }));

    const result = await callAI(MESSAGES, {}, SESSION);
    expect(result).toEqual(payload);
  });

  it("throws on non-2xx HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }));

    await expect(callAI(MESSAGES, {}, SESSION)).rejects.toThrow("429");
  });

  it("uses AI_MODELS.fast as default model", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    await callAI(MESSAGES, {}, SESSION);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe(AI_MODELS.fast);
  });
});
