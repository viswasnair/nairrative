// ── normalizeBook ─────────────────────────────────────────────────────────
// Flattens the Supabase nested book_authors join into a clean book object.
export function normalizeBook(b) {
  const sortedAuthors = (b.book_authors || [])
    .sort((x, y) => x.author_order - y.author_order)
    .map(ba => ba.authors);
  return {
    ...b,
    authors: sortedAuthors,
    author: sortedAuthors.map(a => a.name).join(" & "),
    country: sortedAuthors[0]?.country || "",
    year: b.year_read_end,
    genre: Array.isArray(b.genre) ? b.genre : (b.genre ? [b.genre] : []),
  };
}

// ── buildBookContext ──────────────────────────────────────────────────────
// Builds a compact text summary of the reading database for AI prompts.
export function buildBookContext(books) {
  const byYear = {}, byGenre = {}, byAuthor = {}, byCountry = {};
  books.forEach(b => {
    const yr = b.year_read_end || b.year;
    byYear[yr] = (byYear[yr] || 0) + 1;
    (b.genre || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
    byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
    if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
  });
  const topAuthors = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([a, c]) => `${a}(${c})`).join(", ");
  const genres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]).map(([g, c]) => `${g}(${c})`).join(", ");
  const years = Object.entries(byYear).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([y, c]) => `${y}:${c}`).join(", ");
  const countries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, n]) => `${c}(${n})`).join(", ");
  const seriesList = [...new Set(books.filter(b => b.series?.trim()).map(b => b.series))].join(", ");
  const minYear = Math.min(...books.map(b => b.year_read_start || b.year).filter(Boolean));
  const maxYear = Math.max(...books.map(b => b.year_read_end || b.year).filter(Boolean));
  const fictionCount = books.filter(b => b.fiction).length;
  return `READING DATABASE: ${books.length} books, ${minYear}–${maxYear}.
NOTE: Year 2010 is a collective entry representing all books read from 1998–2010. Not a single-year anomaly.
BOOKS BY YEAR: ${years}
TOP AUTHORS (name, count): ${topAuthors}
GENRES (name, count): ${genres}
COUNTRIES: ${countries}
SERIES READ: ${seriesList}
FICTION: ${fictionCount} (${Math.round(fictionCount / books.length * 100)}%) | NON-FICTION: ${books.length - fictionCount}`;
}

// ── Download helpers ──────────────────────────────────────────────────────
export function downloadCSV(books) {
  const rows = [
    ["ID", "Title", "Author", "Year Read Start", "Year Read End", "Genre", "Country", "Format", "Pages", "Series", "Notes"],
    ...books.map(b => [
      b.id, `"${b.title}"`, `"${b.author}"`,
      b.year_read_start, b.year_read_end,
      `"${(b.genre || []).join("/")}"`,
      b.country || "", b.format || "", b.pages || "",
      `"${b.series || ""}"`, `"${b.notes || ""}"`
    ]),
  ];
  const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my_reading_list.csv" });
  a.click();
}

export function downloadJSON(books) {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my_reading_list.json" });
  a.click();
}
