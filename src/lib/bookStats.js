import { G } from "../constants/theme";

// Computes raw aggregation counts from a books array.
export function computeStats(books) {
  const byYear = {}, byYearTracked = {}, byGenre = {}, byAuthor = {}, byCountry = {};
  books.forEach(b => {
    byYear[b.year] = (byYear[b.year] || 0) + 1;
    if (b.year_read_start === b.year_read_end)
      byYearTracked[b.year] = (byYearTracked[b.year] || 0) + 1;
    (b.genre || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
    byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
    if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
  });
  const sortedAuthors = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]);
  const sortedGenres  = Object.entries(byGenre).sort((a, b) => b[1] - a[1]);
  const sortedYears   = Object.entries(byYearTracked).sort((a, b) => b[1] - a[1]);
  const minYearStart  = books.length ? Math.min(...books.map(b => b.year_read_start)) : 1998;
  const maxYearEnd    = books.length ? Math.max(...books.map(b => b.year_read_end))   : new Date().getFullYear();
  return {
    total: books.length, byYear, byYearTracked, byGenre, byAuthor, byCountry,
    sortedAuthors, sortedGenres, sortedYears,
    readingSpan: maxYearEnd - minYearStart + 1,
  };
}

const MOOD_GENRES = {
  "Dark & Tense":  ["Thriller", "Legal Thriller", "Medical Thriller", "Mystery", "Horror", "Dystopian", "Politics"],
  "Imaginative":   ["Fantasy", "Romantasy", "Science Fiction", "Historical Fiction", "Graphic Novel", "Mythology"],
  "Reflective":    ["Literary Fiction", "Classic", "Philosophy", "Spirituality", "Memoir", "Essays", "Poetry"],
  "Informative":   ["Biography", "Popular Science", "History", "Non-Fiction", "Economics", "Self-Help",
                    "Environment", "Systems", "Sociology", "Psychology", "Business"],
};

function bookMood(b) {
  const g = b.genre || [];
  for (const [m, tags] of Object.entries(MOOD_GENRES)) {
    if (g.some(t => tags.includes(t))) return m;
  }
  return null;
}

function topGenreIn(books) {
  const counts = books.reduce((a, b) => {
    (b.genre || []).forEach(g => { a[g] = (a[g] || 0) + 1; });
    return a;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
}

// Derives higher-level reading insights from books + stats.
export function computeAnalysisInsights(books, stats) {
  if (!books.length) return null;

  // Temporal
  const years = Object.keys(stats.byYearTracked).map(Number).sort();
  const fullRange = Array.from({ length: years[years.length - 1] - years[0] + 1 }, (_, i) => years[0] + i);
  const trackedBooks = books.filter(b => b.year_read_start === b.year_read_end);
  const avgPerActive = Math.round(trackedBooks.length / years.length);
  let maxGap = 0, curGap = 0, gapStart = null, longestGapStart = null;
  for (const y of fullRange) {
    if (!stats.byYear[y]) { if (!curGap) gapStart = y; curGap++; if (curGap > maxGap) { maxGap = curGap; longestGapStart = gapStart; } }
    else curGap = 0;
  }

  // Genre & Form
  const fictionCount  = books.filter(b => b.fiction === true).length;
  const fictionPct    = Math.round(fictionCount / books.length * 100);
  const graphicNovels = books.filter(b => (b.genre || []).includes("Graphic Novel")).length;
  const genreCount    = Object.keys(stats.byGenre).length;
  const era = (s, e) => books.filter(b => b.year >= s && b.year <= e);
  const genreEra = [
    { era: "2010–14", top: topGenreIn(era(2010, 2014)) },
    { era: "2015–19", top: topGenreIn(era(2015, 2019)) },
    { era: "2020–24", top: topGenreIn(era(2020, 2024)) },
    { era: "2025–26", top: topGenreIn(era(2025, 2026)) },
  ];

  // Geographic
  const uniqueCountries = Object.keys(stats.byCountry).length;
  const topCountries    = Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const indiaPct        = Math.round((stats.byCountry["India"] || 0) / books.length * 100);

  // Author behaviour
  const authorEntries  = Object.entries(stats.byAuthor);
  const loyal          = authorEntries.filter(([, c]) => c >= 5).sort((a, b) => b[1] - a[1]);
  const sampledCount   = authorEntries.filter(([, c]) => c === 1).length;
  const booksFromLoyal = loyal.reduce((s, [, c]) => s + c, 0);
  const loyaltyRatio   = Math.round(booksFromLoyal / books.length * 100);

  // Complexity
  const challengingCount        = books.filter(b => (b.genre || []).some(g => ["Classic", "Philosophy", "Literary Fiction"].includes(g))).length;
  const challengePct            = Math.round(challengingCount / books.length * 100);
  const challengingAuthorsFromData = [...new Set(
    books.filter(b => (b.genre || []).some(g => ["Classic", "Philosophy"].includes(g))).map(b => b.author)
  )].slice(0, 8);

  // Series
  const seriesBooks = books.filter(b => b.series && b.series.trim() !== "");
  const seriesCount = seriesBooks.length;
  const seriesPct   = Math.round(seriesCount / books.length * 100);

  // Mood by era
  const allBookYears = [...new Set(books.map(b => b.year))].sort((a, b) => a - b);
  const minY = allBookYears[0] ?? 2011;
  const maxY = allBookYears[allBookYears.length - 1] ?? new Date().getFullYear();
  const span = maxY - minY;
  const eraBuckets = [
    { era: `${minY}–${minY + Math.floor(span * 0.25)}`,   s: minY,                           e: minY + Math.floor(span * 0.25) },
    { era: `${minY + Math.floor(span * 0.25) + 1}–${minY + Math.floor(span * 0.5)}`,  s: minY + Math.floor(span * 0.25) + 1, e: minY + Math.floor(span * 0.5) },
    { era: `${minY + Math.floor(span * 0.5)  + 1}–${minY + Math.floor(span * 0.75)}`, s: minY + Math.floor(span * 0.5)  + 1, e: minY + Math.floor(span * 0.75) },
    { era: `${minY + Math.floor(span * 0.75) + 1}–${maxY}`, s: minY + Math.floor(span * 0.75) + 1, e: maxY },
  ];
  const moodByEra = eraBuckets.map(({ era: label, s, e: end }) => {
    const sub = era(s, end).filter(b => bookMood(b));
    if (!sub.length) return null;
    const counts = {};
    sub.forEach(b => { const m = bookMood(b); counts[m] = (counts[m] || 0) + 1; });
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { era: label, dominant, counts, total: sub.length };
  }).filter(Boolean);

  // Notable years
  const yearCounts = Object.entries(stats.byYear)
    .map(([y, c]) => ({ year: parseInt(y), count: c }))
    .filter(y => y.year >= 2011)
    .sort((a, b) => a.year - b.year);
  const yearAvg = yearCounts.reduce((s, y) => s + y.count, 0) / yearCounts.length;
  const notableYears = yearCounts.map(y => ({
    year: String(y.year), books: y.count,
    label: y.count >= yearAvg * 2 ? "Peak year"
         : y.count <= 3           ? "Low activity"
         : y.count > yearAvg * 1.3 ? "Active year"
         : y.count < yearAvg * 0.5 ? "Quiet year"
         : null,
  })).filter(y => y.label).sort((a, b) => b.books - a.books).slice(0, 5).sort((a, b) => a.year - b.year);

  const topAuthorChannels = loyal.slice(0, 4).map(([author, count]) => ({
    channel: author, example: `${count} books read`, color: G.gold,
  }));

  return {
    peakYear: stats.sortedYears[0], avgPerActive, maxGap, longestGapStart,
    fictionCount, nonFictionCount: books.length - fictionCount, fictionPct, graphicNovels, genreCount, genreEra,
    uniqueCountries, topCountries, indiaPct,
    loyal, sampledCount, booksFromLoyal, loyaltyRatio,
    challengingCount, challengePct, challengingAuthorsFromData,
    seriesCount, seriesPct,
    fictionByEra: moodByEra, peakFictionEra: null, lowFictionEra: null,
    notableYears, topAuthorChannels,
  };
}
