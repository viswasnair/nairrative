import { describe, it, expect } from "vitest";
import { buildLensPrompts } from "../../src/lib/recsPrompts";

const BASE = {
  lastBook: { title: "Dune" },
  lastAuthor: "Frank Herbert",
  randomSeries: "Wheel of Time",
  today: "2026-05-08",
  input: "God's Debris",
  variationNote: "",
};

describe("buildLensPrompts", () => {
  it("returns an object with all 15 lens keys", () => {
    const prompts = buildLensPrompts(BASE);
    const keys = ["more-like", "more-by-last", "similar-author", "trending", "challenge", "quick", "gaps", "surprise", "finish", "loved", "authors-like", "mood", "genre-pick", "topic", "pair"];
    expect(Object.keys(prompts)).toEqual(expect.arrayContaining(keys));
    expect(Object.keys(prompts)).toHaveLength(15);
  });

  it("embeds the last book title in the more-like prompt", () => {
    const prompts = buildLensPrompts(BASE);
    expect(prompts["more-like"]).toContain("Dune");
  });

  it("embeds the last author in the more-by-last prompt", () => {
    const prompts = buildLensPrompts(BASE);
    expect(prompts["more-by-last"]).toContain("Frank Herbert");
  });

  it("embeds randomSeries in the finish prompt", () => {
    const prompts = buildLensPrompts(BASE);
    expect(prompts["finish"]).toContain("Wheel of Time");
  });

  it("embeds today in the trending prompt", () => {
    const prompts = buildLensPrompts(BASE);
    expect(prompts["trending"]).toContain("2026-05-08");
  });

  it("embeds the input in the loved prompt", () => {
    const prompts = buildLensPrompts(BASE);
    expect(prompts["loved"]).toContain("God's Debris");
  });

  it("appends variationNote when provided", () => {
    const prompts = buildLensPrompts({ ...BASE, variationNote: " Pick something different." });
    expect(prompts["more-like"]).toContain("Pick something different.");
  });

  it("handles null lastBook gracefully", () => {
    const prompts = buildLensPrompts({ ...BASE, lastBook: null });
    expect(prompts["more-like"]).toContain("undefined");
  });
});
