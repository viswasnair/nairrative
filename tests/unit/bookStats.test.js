import { vi, describe, it, expect } from "vitest";
import { computeStats, computeAnalysisInsights } from "../../src/lib/bookStats";

vi.mock("../../src/constants/theme", () => ({ default: { gold: "#f0c040" } }));

const book = (overrides) => ({
  id: 1, title: "Test Book", author: "Author A", year: 2022,
  year_read_start: 2022, year_read_end: 2022,
  genre: ["Sci-Fi"], fiction: true, pages: 300,
  country: "United States", series: "", rating: null,
  ...overrides,
});

const BOOKS = [
  book({ id: 1, title: "Dune",       author: "Herbert", year: 2020, year_read_start: 2020, year_read_end: 2020, genre: ["Sci-Fi"],           country: "United States" }),
  book({ id: 2, title: "Foundation", author: "Asimov",  year: 2021, year_read_start: 2021, year_read_end: 2021, genre: ["Sci-Fi"],           country: "United States" }),
  book({ id: 3, title: "Meditations",author: "Aurelius", year: 2022, year_read_start: 2022, year_read_end: 2022, genre: ["Classic", "Philosophy"], country: "Italy", fiction: false }),
  book({ id: 4, title: "Dune 2",     author: "Herbert", year: 2022, year_read_start: 2022, year_read_end: 2022, genre: ["Sci-Fi"],           country: "United States" }),
  book({ id: 5, title: "Dune 3",     author: "Herbert", year: 2023, year_read_start: 2023, year_read_end: 2023, genre: ["Sci-Fi"],           country: "United States", series: "Dune" }),
];

describe("computeStats", () => {
  it("counts total books correctly", () => {
    expect(computeStats(BOOKS).total).toBe(5);
  });

  it("counts books per year", () => {
    const { byYear } = computeStats(BOOKS);
    expect(byYear[2020]).toBe(1);
    expect(byYear[2022]).toBe(2);
  });

  it("only counts single-year reads in byYearTracked", () => {
    const mixedBooks = [
      book({ year: 2020, year_read_start: 2020, year_read_end: 2020 }),
      book({ year: 2021, year_read_start: 2020, year_read_end: 2021 }), // spans years
    ];
    const { byYearTracked } = computeStats(mixedBooks);
    expect(byYearTracked[2020]).toBe(1);
    expect(byYearTracked[2021]).toBeUndefined();
  });

  it("aggregates genre counts", () => {
    const { byGenre } = computeStats(BOOKS);
    expect(byGenre["Sci-Fi"]).toBe(4);
    expect(byGenre["Classic"]).toBe(1);
  });

  it("aggregates author counts", () => {
    const { byAuthor } = computeStats(BOOKS);
    expect(byAuthor["Herbert"]).toBe(3);
    expect(byAuthor["Asimov"]).toBe(1);
  });

  it("aggregates country counts", () => {
    const { byCountry } = computeStats(BOOKS);
    expect(byCountry["United States"]).toBe(4);
    expect(byCountry["Italy"]).toBe(1);
  });

  it("omits books with no country from byCountry", () => {
    const b = [book({ country: null }), book({ country: "India" })];
    expect(computeStats(b).byCountry["null"]).toBeUndefined();
    expect(computeStats(b).byCountry["India"]).toBe(1);
  });

  it("sorts authors, genres, years descending by count", () => {
    const { sortedAuthors, sortedGenres } = computeStats(BOOKS);
    expect(sortedAuthors[0][0]).toBe("Herbert");
    expect(sortedGenres[0][0]).toBe("Sci-Fi");
  });

  it("computes readingSpan correctly", () => {
    expect(computeStats(BOOKS).readingSpan).toBe(4); // 2020–2023
  });

  it("returns zero total for empty array", () => {
    expect(computeStats([]).total).toBe(0);
  });
});

describe("computeAnalysisInsights", () => {
  const stats = computeStats(BOOKS);

  it("returns null for empty books array", () => {
    expect(computeAnalysisInsights([], computeStats([]))).toBeNull();
  });

  it("counts fiction and non-fiction books", () => {
    const r = computeAnalysisInsights(BOOKS, stats);
    expect(r.fictionCount).toBe(4);
    expect(r.nonFictionCount).toBe(1);
  });

  it("computes fiction percentage", () => {
    const r = computeAnalysisInsights(BOOKS, stats);
    expect(r.fictionPct).toBe(80);
  });

  it("counts unique countries", () => {
    const r = computeAnalysisInsights(BOOKS, stats);
    expect(r.uniqueCountries).toBe(2);
  });

  it("identifies loyal authors (5+ books) from data", () => {
    const manyBooks = Array.from({ length: 6 }, (_, i) =>
      book({ id: i + 10, author: "Prolific Author", year: 2020 + i, year_read_start: 2020 + i, year_read_end: 2020 + i })
    );
    const s2 = computeStats([...BOOKS, ...manyBooks]);
    const r = computeAnalysisInsights([...BOOKS, ...manyBooks], s2);
    expect(r.loyal.some(([a]) => a === "Prolific Author")).toBe(true);
  });

  it("identifies challenging books from Classic/Philosophy genres", () => {
    const r = computeAnalysisInsights(BOOKS, stats);
    expect(r.challengingCount).toBe(1);
    expect(r.challengingAuthorsFromData).toContain("Aurelius");
  });

  it("counts series books", () => {
    const r = computeAnalysisInsights(BOOKS, stats);
    expect(r.seriesCount).toBe(1);
  });

  it("computes average books per active year", () => {
    const r = computeAnalysisInsights(BOOKS, stats);
    expect(typeof r.avgPerActive).toBe("number");
    expect(r.avgPerActive).toBeGreaterThan(0);
  });

  it("topAuthorChannels includes loyal authors with book count", () => {
    const manyBooks = Array.from({ length: 6 }, (_, i) =>
      book({ id: i + 20, author: "Super Fan", year: 2020 + i, year_read_start: 2020 + i, year_read_end: 2020 + i })
    );
    const s2 = computeStats([...BOOKS, ...manyBooks]);
    const r = computeAnalysisInsights([...BOOKS, ...manyBooks], s2);
    expect(r.topAuthorChannels.some(c => c.channel === "Super Fan")).toBe(true);
  });

  it("produces genreEra with four era buckets", () => {
    const r = computeAnalysisInsights(BOOKS, stats);
    expect(r.genreEra).toHaveLength(4);
    r.genreEra.forEach(e => expect(e).toHaveProperty("era"));
  });
});
