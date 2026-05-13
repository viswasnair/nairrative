import { describe, it, expect } from "vitest";
import { buildAnalysisRequestBody, buildRegenerateRequestBody, parseAnalysisResponse } from "../../src/lib/analysisPrompts";

const BOOKS = [
  { id: 1, title: "Dune", author: "Frank Herbert", year: 2022, year_read_end: 2022, year_read_start: 2022, genre: ["Sci-Fi"], fiction: true, pages: 412 },
  { id: 2, title: "Foundation", author: "Isaac Asimov", year: 2021, year_read_end: 2021, year_read_start: 2021, genre: ["Sci-Fi"], fiction: true, pages: 244 },
];

describe("buildAnalysisRequestBody", () => {
  it("returns a valid request body with correct structure", () => {
    const body = buildAnalysisRequestBody({ dimension: "thematic", books: BOOKS, panelPrompts: {} });
    expect(body).toHaveProperty("model");
    expect(body).toHaveProperty("max_tokens");
    expect(body).toHaveProperty("system");
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages[0].role).toBe("user");
  });

  it("includes the dimension key name in the system prompt", () => {
    const body = buildAnalysisRequestBody({ dimension: "emotional", books: BOOKS, panelPrompts: {} });
    expect(body.system).toContain('"emotional"');
  });

  it("adds noYearsNote for non-temporal dimensions", () => {
    const body = buildAnalysisRequestBody({ dimension: "thematic", books: BOOKS, panelPrompts: {} });
    expect(body.system).toContain("Do not reference or cite any specific years");
  });

  it("omits noYearsNote for temporal dimensions", () => {
    for (const dim of ["temporal", "genre", "contextual"]) {
      const body = buildAnalysisRequestBody({ dimension: dim, books: BOOKS, panelPrompts: {} });
      expect(body.system).not.toContain("Do not reference or cite any specific years");
    }
  });

  it("includes custom focus instruction when panelPrompts has a value", () => {
    const body = buildAnalysisRequestBody({ dimension: "thematic", books: BOOKS, panelPrompts: { thematic: "Focus on philosophy" } });
    expect(body.system).toContain("Focus: Focus on philosophy");
  });

  it("filters to recent books for the 'recent' dimension", () => {
    const currentYear = new Date().getFullYear();
    const recentBook = { id: 3, title: "Recent Book", author: "Author", year: currentYear, year_read_end: currentYear, year_read_start: currentYear, genre: [], fiction: true };
    const oldBook = { id: 4, title: "Old Book", author: "Author", year: 2010, year_read_end: 2010, year_read_start: 2010, genre: [], fiction: true };
    const body = buildAnalysisRequestBody({ dimension: "recent", books: [recentBook, oldBook], panelPrompts: {} });
    expect(body.messages[0].content).toContain("Recent Book");
    expect(body.messages[0].content).not.toContain("Old Book");
  });

  it("uses all books for non-recent dimensions", () => {
    const body = buildAnalysisRequestBody({ dimension: "thematic", books: BOOKS, panelPrompts: {} });
    expect(body.messages[0].content).toContain("Dune");
    expect(body.messages[0].content).toContain("Foundation");
  });

  it("uses claude-sonnet-4-6 as default model", () => {
    const body = buildAnalysisRequestBody({ dimension: "thematic", books: BOOKS, panelPrompts: {} });
    expect(body.model).toBe("claude-sonnet-4-6");
  });
});

describe("buildRegenerateRequestBody", () => {
  it("uses claude-opus-4-6 model", () => {
    const body = buildRegenerateRequestBody({ dimension: "thematic", books: BOOKS, panelPrompts: {} });
    expect(body.model).toBe("claude-opus-4-6");
  });

  it("uses 450 max_tokens", () => {
    const body = buildRegenerateRequestBody({ dimension: "thematic", books: BOOKS, panelPrompts: {} });
    expect(body.max_tokens).toBe(450);
  });
});

describe("parseAnalysisResponse", () => {
  it("parses a valid response with insight and evidence", () => {
    const text = JSON.stringify({ temporal: { insight: "Reading increased.", evidence: ["Dune"] } });
    const result = parseAnalysisResponse(text, "temporal");
    expect(result).toEqual({ insight: "Reading increased.", evidence: ["Dune"] });
  });

  it("handles a string value (legacy format)", () => {
    const text = JSON.stringify({ thematic: "A plain string insight." });
    const result = parseAnalysisResponse(text, "thematic");
    expect(result).toEqual({ insight: "A plain string insight.", evidence: [] });
  });

  it("returns null when dimension key is missing", () => {
    const text = JSON.stringify({ other: { insight: "nope" } });
    const result = parseAnalysisResponse(text, "temporal");
    expect(result).toBeNull();
  });

  it("returns null when no JSON object found", () => {
    const result = parseAnalysisResponse("no json here", "temporal");
    expect(result).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    const result = parseAnalysisResponse("{not valid json{{", "temporal");
    expect(result).toBeNull();
  });

  it("extracts JSON embedded in surrounding text", () => {
    const text = `Here is the result: {"thematic": {"insight": "Great insight.", "evidence": ["Dune"]}} done.`;
    const result = parseAnalysisResponse(text, "thematic");
    expect(result?.insight).toBe("Great insight.");
  });
});
