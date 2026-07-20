import { vi, describe, it, expect, beforeEach } from "vitest";
import { fetchAuthorCountry, resolveAuthorLinks } from "../../src/lib/authorUtils";

vi.mock("../../src/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));
vi.mock("../../src/lib/api", () => ({
  LLM_URL: "https://mock/claude",
  claudeHeaders: vi.fn(() => ({})),
}));
vi.mock("../../src/lib/textUtils", () => ({
  sanitizeShortInput: vi.fn(s => s),
}));

import { supabase } from "../../src/lib/supabase";

const SESSION = { user: { id: "user-1" } };

describe("fetchAuthorCountry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the country text from the API response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: "United Kingdom" }] }),
    }));
    const result = await fetchAuthorCountry("Kazuo Ishiguro", SESSION);
    expect(result).toBe("United Kingdom");
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await fetchAuthorCountry("Unknown Author", SESSION);
    expect(result).toBeNull();
  });

  it("returns null when content is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));
    const result = await fetchAuthorCountry("Author", SESSION);
    expect(result).toBeNull();
  });
});

describe("resolveAuthorLinks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips authors with empty names", async () => {
    supabase.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }), insert: vi.fn(), update: vi.fn() });
    const result = await resolveAuthorLinks([{ name: "" }], 1, SESSION);
    expect(result).toHaveLength(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns existing author without inserting", async () => {
    const existingAuthor = { id: 10, name: "Frank Herbert", country: "United States" };
    const maybeSingle = vi.fn().mockResolvedValue({ data: existingAuthor });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const insert = vi.fn().mockResolvedValue({ error: null });
    supabase.from.mockImplementation(table => {
      if (table === "authors") return { select, insert, update: vi.fn().mockResolvedValue({}) };
      if (table === "book_authors") return { insert };
      return {};
    });

    const result = await resolveAuthorLinks([{ name: "Frank Herbert" }], 5, SESSION);
    expect(result).toHaveLength(1);
    expect(result[0].authors).toEqual(existingAuthor);
    expect(result[0].author_order).toBe(1);
  });

  it("inserts a new author when not found", async () => {
    const newAuthor = { id: 99, name: "New Author", country: null };
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const selectChain = vi.fn().mockReturnValue({ eq });
    const authorInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: newAuthor, error: null }) }) });
    const bookAuthorInsert = vi.fn().mockResolvedValue({ error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve({ content: [{ text: "Canada" }] }) }));
    supabase.from.mockImplementation(table => {
      const updateEq = vi.fn().mockResolvedValue({});
      const update = vi.fn().mockReturnValue({ eq: updateEq });
      if (table === "authors") return { select: selectChain, insert: authorInsert, update };
      if (table === "book_authors") return { insert: bookAuthorInsert };
      return {};
    });

    const result = await resolveAuthorLinks([{ name: "New Author" }], 7, SESSION);
    expect(authorInsert).toHaveBeenCalledWith([{ name: "New Author" }]);
    expect(result).toHaveLength(1);
  });

  it("throws when author insert fails", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const selectChain = vi.fn().mockReturnValue({ eq });
    const authorInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: new Error("db error") }) }) });
    supabase.from.mockImplementation(table => {
      if (table === "authors") return { select: selectChain, insert: authorInsert };
      return {};
    });

    await expect(resolveAuthorLinks([{ name: "Bad Author" }], 1, SESSION))
      .rejects.toThrow("Could not create author: Bad Author");
  });
});
