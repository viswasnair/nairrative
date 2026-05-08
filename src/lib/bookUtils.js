export const stripMd = str => str
  .replace(/\*\*(.+?)\*\*/gs, '$1')
  .replace(/\*(.+?)\*/gs, '$1')
  .replace(/_{1,2}(.+?)_{1,2}/gs, '$1')
  .replace(/#{1,6} /g, '')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/^\s*[-*+] /gm, '');

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
    description: b.description || "",
  };
}

// ── toRow ─────────────────────────────────────────────────────────────────
// Serialises a single book into a compact pipe-delimited string for AI prompts.
export const toRow = b =>
  `[${b.year_read_end || b.year}] "${b.title}" by ${b.author} | ${(b.genre || []).join("/")}` +
  `${b.pages ? " | " + b.pages + "pp" : ""}` +
  `${b.series ? " | series: " + b.series : ""}` +
  `${b.fiction !== undefined ? " | " + (b.fiction ? "fiction" : "non-fiction") : ""}` +
  `${b.mood ? " | mood: " + b.mood : ""}` +
  `${b.narrative_style ? " | style: " + b.narrative_style : ""}` +
  `${b.setting_era ? " | era: " + b.setting_era : ""}` +
  `${b.archetype ? " | archetype: " + b.archetype : ""}` +
  `${(b.theme || []).length ? " | themes: " + b.theme.join(", ") : ""}` +
  `${b.rating ? " | rating: " + b.rating : ""}` +
  `${b.description ? " | desc: " + b.description : ""}` +
  `${b.notes ? " | notes: " + b.notes : ""}`;

// ── buildBookContext ──────────────────────────────────────────────────────
// Builds a compact text summary of the reading database for AI prompts.
export function buildBookContext(books) {
  const byYear = {}, byGenre = {}, byAuthor = {}, byCountry = {};
  const byTheme = {}, byMood = {}, byStyle = {}, byEra = {}, byArchetype = {}, byRating = {};
  books.forEach(b => {
    const yr = b.year_read_end || b.year;
    byYear[yr] = (byYear[yr] || 0) + 1;
    (b.genre || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
    byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
    if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
    (b.theme || []).forEach(t => { byTheme[t] = (byTheme[t] || 0) + 1; });
    if (b.mood) byMood[b.mood] = (byMood[b.mood] || 0) + 1;
    if (b.narrative_style) byStyle[b.narrative_style] = (byStyle[b.narrative_style] || 0) + 1;
    if (b.setting_era) byEra[b.setting_era] = (byEra[b.setting_era] || 0) + 1;
    if (b.archetype) byArchetype[b.archetype] = (byArchetype[b.archetype] || 0) + 1;
    if (b.rating) byRating[b.rating] = (byRating[b.rating] || 0) + 1;
  });
  const topN = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => `${k}(${c})`).join(", ");
  const topAuthors = topN(byAuthor, 25);
  const genres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]).map(([g, c]) => `${g}(${c})`).join(", ");
  const years = Object.entries(byYear).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([y, c]) => `${y}:${c}`).join(", ");
  const countries = topN(byCountry, 10);
  const seriesList = [...new Set(books.filter(b => b.series?.trim()).map(b => b.series))].join(", ");
  const minYear = Math.min(...books.map(b => b.year_read_start || b.year).filter(Boolean));
  const maxYear = Math.max(...books.map(b => b.year_read_end || b.year).filter(Boolean));
  const fictionCount = books.filter(b => b.fiction).length;
  const RATING_ORDER = ["transformative", "loved", "enjoyed", "meh", "dont_remember", "dropped", "didnt_like"];
  const ratingsStr = RATING_ORDER.filter(r => byRating[r]).map(r => `${r}(${byRating[r]})`).join(", ");
  return `READING DATABASE: ${books.length} books, ${minYear}–${maxYear}.
NOTE: Year 2010 is a collective entry representing all books read from 1998–2010. Not a single-year anomaly.
BOOKS BY YEAR: ${years}
TOP AUTHORS (name, count): ${topAuthors}
GENRES (name, count): ${genres}
COUNTRIES: ${countries}
SERIES READ: ${seriesList}
FICTION: ${fictionCount} (${Math.round(fictionCount / books.length * 100)}%) | NON-FICTION: ${books.length - fictionCount}
RATINGS: ${ratingsStr}
TOP THEMES (theme, count): ${topN(byTheme, 15)}
MOODS (mood, count): ${topN(byMood, 15)}
NARRATIVE STYLES (style, count): ${topN(byStyle, 15)}
SETTING ERAS (era, count): ${topN(byEra, 15)}
ARCHETYPES (archetype, count): ${topN(byArchetype, 15)}`;
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
