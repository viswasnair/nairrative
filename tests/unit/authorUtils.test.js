import { vi, describe, it, expect, beforeEach } from "vitest";
import { fetchAuthorCountry, resolveAuthorLinks } from "../../src/lib/authorUtils";

vi.mock("../../src/lib/db", () => ({
  findAuthorByName:    vi.fn(),
  createAuthor:        vi.fn(),
  updateAuthorCountry: vi.fn(),
  linkBookAuthor:      vi.fn(),
}));
vi.mock("../../src/lib/api", () => ({
  LLM_URL: "https://mock/claude",
  claudeHeaders: vi.fn(() => ({})),
}));
vi.mock("../../src/lib/textUtils", () => ({
  sanitizeShortInput: vi.fn(s => s),
}));

import * as db from "../../src/lib/db";

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
  beforeEach(() => {
    vi.clearAllMocks();
    db.linkBookAuthor.mockResolvedValue({});
    db.updateAuthorCountry.mockResolvedValue({});
  });

  it("skips authors with empty names", async () => {
    const result = await resolveAuthorLinks([{ name: "" }], 1, SESSION);
    expect(result).toHaveLength(0);
    expect(db.findAuthorByName).not.toHaveBeenCalled();
  });

  it("returns existing author without inserting", async () => {
    const existingAuthor = { id: 10, name: "Frank Herbert", country: "United States" };
    db.findAuthorByName.mockResolvedValue({ data: existingAuthor });

    const result = await resolveAuthorLinks([{ name: "Frank Herbert" }], 5, SESSION);
    expect(result).toHaveLength(1);
    expect(result[0].authors).toEqual(existingAuthor);
    expect(result[0].author_order).toBe(1);
    expect(db.createAuthor).not.toHaveBeenCalled();
  });

  it("inserts a new author when not found", async () => {
    const newAuthor = { id: 99, name: "New Author", country: null };
    db.findAuthorByName.mockResolvedValue({ data: null });
    db.createAuthor.mockResolvedValue({ data: newAuthor, error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: "Canada" }] }),
    }));

    const result = await resolveAuthorLinks([{ name: "New Author" }], 7, SESSION);
    expect(db.createAuthor).toHaveBeenCalledWith("New Author");
    expect(result).toHaveLength(1);
  });

  it("backfills country for author without one", async () => {
    const author = { id: 5, name: "Haruki Murakami", country: null };
    db.findAuthorByName.mockResolvedValue({ data: author });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: "Japan" }] }),
    }));

    await resolveAuthorLinks([{ name: "Haruki Murakami" }], 1, SESSION);
    expect(db.updateAuthorCountry).toHaveBeenCalledWith(5, "Japan");
  });

  it("throws when author insert fails", async () => {
    db.findAuthorByName.mockResolvedValue({ data: null });
    db.createAuthor.mockResolvedValue({ data: null, error: new Error("db error") });

    await expect(resolveAuthorLinks([{ name: "Bad Author" }], 1, SESSION))
      .rejects.toThrow("Could not create author: Bad Author");
  });
});
