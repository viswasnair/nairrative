import * as db from "./db";
import { LLM_URL, claudeHeaders } from "./api";
import { AI_MODELS } from "./aiClient";
import { sanitizeShortInput } from "./textUtils";

/**
 * @param {string} authorName
 * @param {object|null} session - Active Supabase session (for AI call auth)
 * @returns {Promise<string|null>} ISO 3166-1 country name, or null on failure/unknown
 */
export async function fetchAuthorCountry(authorName, session) {
  try {
    const res = await fetch(LLM_URL, {
      method: "POST", headers: claudeHeaders(session),
      body: JSON.stringify({
        model: AI_MODELS.fast, max_tokens: 20,
        messages: [{ role: "user", content: `What country is the author "${sanitizeShortInput(authorName)}" from? Reply with only the ISO 3166-1 short country name (e.g. "United Kingdom" not "UK", "United States" not "USA", "Czechia" not "Czech Republic"). If unknown, reply "Unknown".` }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

/**
 * Resolves each author (SELECT or INSERT), backfills country, links to bookId via book_authors.
 * @param {{ name: string }[]} authors
 * @param {string} bookId
 * @param {object|null} session
 * @returns {Promise<{ author_order: number, authors: object }[]>}
 */
export async function resolveAuthorLinks(authors, bookId, session) {
  const resolved = [];
  for (let i = 0; i < authors.length; i++) {
    const aName = authors[i].name.trim();
    if (!aName) continue;
    let { data: au } = await db.findAuthorByName(aName);
    if (!au) {
      const { data: newAu, error } = await db.createAuthor(aName);
      if (error || !newAu) throw new Error(`Could not create author: ${aName}`);
      au = newAu;
    }
    if (!au.country) {
      const country = await fetchAuthorCountry(aName, session);
      if (country) {
        await db.updateAuthorCountry(au.id, country);
        au.country = country;
      }
    }
    await db.linkBookAuthor(bookId, au.id, i + 1);
    resolved.push({ author_order: i + 1, authors: au });
  }
  return resolved;
}
