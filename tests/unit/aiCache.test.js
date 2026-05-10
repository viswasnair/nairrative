import { vi, describe, it, expect, beforeEach } from "vitest";
import { loadCachedData, saveCachedData } from "../../src/lib/aiCache";

vi.mock("../../src/lib/db", () => ({
  loadCacheRow: vi.fn(),
  saveCacheRow: vi.fn(),
}));

import { loadCacheRow, saveCacheRow } from "../../src/lib/db";

const SESSION = { user: { id: "user-1" } };
const OPTS = { table: "analysis_cache", lsDataKey: "ai_data", lsFpKey: "ai_fp", fingerprint: "fp-123" };

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

describe("loadCachedData", () => {
  it("returns parsed localStorage data when fingerprint matches", async () => {
    const cached = { temporal: { insight: "test" } };
    localStorage.setItem("ai_fp", "fp-123");
    localStorage.setItem("ai_data", JSON.stringify(cached));

    const result = await loadCachedData({ ...OPTS, session: SESSION });
    expect(result).toEqual(cached);
    expect(loadCacheRow).not.toHaveBeenCalled();
  });

  it("falls through to db when fingerprint does not match", async () => {
    localStorage.setItem("ai_fp", "fp-old");
    localStorage.setItem("ai_data", JSON.stringify({ old: true }));
    loadCacheRow.mockResolvedValue({ data: { data: { temporal: { insight: "fresh" } } } });

    const result = await loadCachedData({ ...OPTS, session: SESSION });
    expect(result).toEqual({ temporal: { insight: "fresh" } });
    expect(loadCacheRow).toHaveBeenCalledWith("analysis_cache", "user-1");
  });

  it("passes user id to loadCacheRow when session is present", async () => {
    loadCacheRow.mockResolvedValue({ data: null });
    await loadCachedData({ ...OPTS, session: SESSION });
    expect(loadCacheRow).toHaveBeenCalledWith("analysis_cache", "user-1");
  });

  it("passes null user id to loadCacheRow when session is null", async () => {
    loadCacheRow.mockResolvedValue({ data: null });
    await loadCachedData({ ...OPTS, session: null });
    expect(loadCacheRow).toHaveBeenCalledWith("analysis_cache", null);
  });

  it("returns null when db has no data", async () => {
    loadCacheRow.mockResolvedValue({ data: null });
    const result = await loadCachedData({ ...OPTS, session: SESSION });
    expect(result).toBeNull();
  });

  it("returns null when localStorage has malformed JSON", async () => {
    localStorage.setItem("ai_fp", "fp-123");
    localStorage.setItem("ai_data", "not-json{{{");
    loadCacheRow.mockResolvedValue({ data: null });
    const result = await loadCachedData({ ...OPTS, session: SESSION });
    expect(result).toBeNull();
  });

  it("populates localStorage from db on cache miss", async () => {
    loadCacheRow.mockResolvedValue({ data: { data: { genre: { insight: "hi" } } } });
    await loadCachedData({ ...OPTS, session: SESSION });
    expect(localStorage.getItem("ai_data")).toBe(JSON.stringify({ genre: { insight: "hi" } }));
    expect(localStorage.getItem("ai_fp")).toBe("fp-123");
  });
});

describe("saveCachedData", () => {
  it("writes data and fingerprint to localStorage", async () => {
    saveCacheRow.mockResolvedValue({});
    const data = { temporal: { insight: "saved" } };
    await saveCachedData({ ...OPTS, data, session: SESSION });
    expect(localStorage.getItem("ai_data")).toBe(JSON.stringify(data));
    expect(localStorage.getItem("ai_fp")).toBe("fp-123");
  });

  it("calls saveCacheRow with table, user_id, fingerprint, data", async () => {
    saveCacheRow.mockResolvedValue({});
    const data = { temporal: { insight: "saved" } };
    await saveCachedData({ ...OPTS, data, session: SESSION });
    expect(saveCacheRow).toHaveBeenCalledWith("analysis_cache", "user-1", "fp-123", data);
  });

  it("skips saveCacheRow when session is null", async () => {
    await saveCachedData({ ...OPTS, data: {}, session: null });
    expect(saveCacheRow).not.toHaveBeenCalled();
  });
});
