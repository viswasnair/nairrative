import { vi, describe, it, expect, beforeEach } from "vitest";
import { loadCachedData, saveCachedData } from "../../src/lib/aiCache";

vi.mock("../../src/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../src/lib/supabase";

const SESSION = { user: { id: "user-1" } };
const OPTS = { table: "analysis_cache", lsDataKey: "ai_data", lsFpKey: "ai_fp", fingerprint: "fp-123" };

function makeSupabaseMock(returnData = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: returnData });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ maybeSingle, eq });
  const upsert = vi.fn().mockResolvedValue({ error: null });
  supabase.from.mockReturnValue({ select, upsert });
  return { maybeSingle, eq, select, upsert };
}

describe("loadCachedData", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it("returns parsed localStorage data when fingerprint matches", async () => {
    const cached = { temporal: { insight: "test" } };
    localStorage.setItem("ai_fp", "fp-123");
    localStorage.setItem("ai_data", JSON.stringify(cached));
    makeSupabaseMock();

    const result = await loadCachedData({ ...OPTS, session: SESSION });
    expect(result).toEqual(cached);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("falls through to Supabase when fingerprint does not match", async () => {
    localStorage.setItem("ai_fp", "fp-old");
    localStorage.setItem("ai_data", JSON.stringify({ old: true }));
    const sbData = { data: { temporal: { insight: "fresh" } } };
    makeSupabaseMock(sbData);

    const result = await loadCachedData({ ...OPTS, session: SESSION });
    expect(result).toEqual(sbData.data);
    expect(supabase.from).toHaveBeenCalledWith("analysis_cache");
  });

  it("adds user_id eq filter when session is present", async () => {
    const { eq } = makeSupabaseMock(null);
    await loadCachedData({ ...OPTS, session: SESSION });
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("skips user_id filter when session is null", async () => {
    const { eq, maybeSingle } = makeSupabaseMock(null);
    await loadCachedData({ ...OPTS, session: null });
    expect(eq).not.toHaveBeenCalled();
    expect(maybeSingle).toHaveBeenCalled();
  });

  it("returns null when Supabase has no data", async () => {
    makeSupabaseMock(null);
    const result = await loadCachedData({ ...OPTS, session: SESSION });
    expect(result).toBeNull();
  });

  it("returns null when localStorage has malformed JSON", async () => {
    localStorage.setItem("ai_fp", "fp-123");
    localStorage.setItem("ai_data", "not-json{{{");
    makeSupabaseMock(null);
    const result = await loadCachedData({ ...OPTS, session: SESSION });
    expect(result).toBeNull();
  });

  it("populates localStorage from Supabase on cache miss", async () => {
    const sbData = { data: { genre: { insight: "hi" } } };
    makeSupabaseMock(sbData);
    await loadCachedData({ ...OPTS, session: SESSION });
    expect(localStorage.getItem("ai_data")).toBe(JSON.stringify(sbData.data));
    expect(localStorage.getItem("ai_fp")).toBe("fp-123");
  });
});

describe("saveCachedData", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it("writes data and fingerprint to localStorage", async () => {
    makeSupabaseMock();
    const data = { temporal: { insight: "saved" } };
    await saveCachedData({ ...OPTS, data, session: SESSION });
    expect(localStorage.getItem("ai_data")).toBe(JSON.stringify(data));
    expect(localStorage.getItem("ai_fp")).toBe("fp-123");
  });

  it("upserts to Supabase with user_id and onConflict when session exists", async () => {
    const { upsert } = makeSupabaseMock();
    const data = { temporal: { insight: "saved" } };
    await saveCachedData({ ...OPTS, data, session: SESSION });
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", fingerprint: "fp-123", data },
      { onConflict: "user_id" }
    );
  });

  it("skips Supabase upsert when session is null", async () => {
    const { upsert } = makeSupabaseMock();
    await saveCachedData({ ...OPTS, data: {}, session: null });
    expect(upsert).not.toHaveBeenCalled();
  });
});
