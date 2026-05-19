import { sanitizeShortInput, sanitizePromptInput } from "./textUtils";

/**
 * @typedef {{ id: string|number, title: string, author: string, year?: number,
 *   year_read_start?: number, year_read_end?: number, genre?: string[],
 *   pages?: number, fiction?: boolean, format?: string, series?: string,
 *   country?: string, rating?: string, description?: string,
 *   mood?: string, narrative_style?: string, setting_era?: string,
 *   archetype?: string, theme?: string[], cover_url?: string,
 *   authors?: Array<{name: string, country?: string}>,
 *   book_authors?: Array<{authors: {name: string, country?: string}, author_order: number}>
 * }} Book
 */

export const RATING_ORDER = ["transformative", "loved", "enjoyed", "meh", "dont_remember", "dropped", "didnt_like"];

/**
 * Strips markdown formatting symbols from a string.
 * @param {string} str
 * @returns {string}
 */
export const stripMd = str => str
  .replace(/\*\*(.+?)\*\*/gs, '$1')
  .replace(/\*(.+?)\*/gs, '$1')
  .replace(/_{1,2}(.+?)_{1,2}/gs, '$1')
  .replace(/#{1,6} /g, '')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/^\s*[-*+] /gm, '');

/**
 * Flattens the Supabase nested book_authors join into a clean book object.
 * @param {object} b - raw Supabase row with book_authors join
 * @returns {Book}
 */
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

/**
 * Serialises a single book into a compact pipe-delimited string for AI prompts.
 * String fields are sanitized to strip control characters before insertion.
 * @param {Book} b
 * @returns {string}
 */
export const toRow = b => {
  const title  = sanitizeShortInput(b.title  || "");
  const author = sanitizeShortInput(b.author || "");
  const series    = b.series         ? sanitizeShortInput(b.series)         : null;
  const mood      = b.mood           ? sanitizeShortInput(b.mood)           : null;
  const style     = b.narrative_style? sanitizeShortInput(b.narrative_style): null;
  const era       = b.setting_era    ? sanitizeShortInput(b.setting_era)    : null;
  const archetype = b.archetype      ? sanitizeShortInput(b.archetype)      : null;
  const themes    = (b.theme || []).map(t => sanitizeShortInput(t));
  const desc      = b.description    ? sanitizePromptInput(b.description, 300) : null;
  return (
    `[${b.year_read_end || b.year}] "${title}" by ${author} | ${(b.genre || []).join("/")}` +
    `${b.pages ? " | " + b.pages + "pp" : ""}` +
    `${series    ? " | series: "    + series    : ""}` +
    `${b.fiction !== undefined ? " | " + (b.fiction ? "fiction" : "non-fiction") : ""}` +
    `${mood      ? " | mood: "      + mood      : ""}` +
    `${style     ? " | style: "     + style     : ""}` +
    `${era       ? " | era: "       + era       : ""}` +
    `${archetype ? " | archetype: " + archetype : ""}` +
    `${themes.length ? " | themes: " + themes.join(", ") : ""}` +
    `${b.rating  ? " | rating: "    + b.rating  : ""}` +
    `${desc      ? " | desc: "      + desc      : ""}`
  );
};

/**
 * Builds a compact text summary of the reading database for AI prompts.
 * @param {Book[]} books
 * @returns {string}
 */
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
  const topN = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => `${sanitizeShortInput(k)}(${c})`).join(", ");
  const topAuthors = topN(byAuthor, 25);
  const genres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]).map(([g, c]) => `${g}(${c})`).join(", ");
  const years = Object.entries(byYear).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([y, c]) => `${y}:${c}`).join(", ");
  const countries = topN(byCountry, 10);
  const seriesList = [...new Set(books.filter(b => b.series?.trim()).map(b => b.series))].join(", ");
  const yearStarts = books.map(b => b.year_read_start || b.year).filter(Boolean);
  const yearEnds = books.map(b => b.year_read_end || b.year).filter(Boolean);
  const minYear = yearStarts.length ? Math.min(...yearStarts) : new Date().getFullYear();
  const maxYear = yearEnds.length ? Math.max(...yearEnds) : new Date().getFullYear();
  const fictionCount = books.filter(b => b.fiction).length;
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

/** @param {Book[]} books */
export function downloadCSV(books) {
  const rows = [
    ["ID", "Title", "Author", "Year Read Start", "Year Read End", "Genre", "Country", "Format", "Pages", "Series"],
    ...books.map(b => [
      b.id, `"${b.title}"`, `"${b.author}"`,
      b.year_read_start, b.year_read_end,
      `"${(b.genre || []).join("/")}"`,
      b.country || "", b.format || "", b.pages || "",
      `"${b.series || ""}"`,
    ]),
  ];
  const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my_reading_list.csv" });
  a.click();
}

/** @param {Book[]} books */
export function downloadJSON(books) {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my_reading_list.json" });
  a.click();
}
