import { supabase } from "./supabase";
import { CLAUDE_URL, claudeHeaders } from "./api";
import { sanitizeShortInput } from "./textUtils";

export async function fetchAuthorCountry(authorName, session) {
  try {
    const res = await fetch(CLAUDE_URL, {
      method: "POST", headers: claudeHeaders(session),
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", max_tokens: 20,
        messages: [{ role: "user", content: `What country is the author "${sanitizeShortInput(authorName)}" from? Reply with only the ISO 3166-1 short country name (e.g. "United Kingdom" not "UK", "United States" not "USA", "Czechia" not "Czech Republic"). If unknown, reply "Unknown".` }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

// Resolves each author (SELECT or INSERT), backfills country, links to bookId via book_authors.
// Returns the resolved rows in the shape expected by normalizeBook.
export async function resolveAuthorLinks(authors, bookId, session) {
  const resolved = [];
  for (let i = 0; i < authors.length; i++) {
    const aName = authors[i].name.trim();
    if (!aName) continue;
    let { data: au } = await supabase.from("authors").select().eq("name", aName).maybeSingle();
    if (!au) {
      const { data: newAu, error } = await supabase.from("authors").insert([{ name: aName }]).select().single();
      if (error || !newAu) throw new Error(`Could not create author: ${aName}`);
      au = newAu;
    }
    if (!au.country) {
      const country = await fetchAuthorCountry(aName, session);
      if (country) {
        await supabase.from("authors").update({ country }).eq("id", au.id);
        au.country = country;
      }
    }
    await supabase.from("book_authors").insert([{ book_id: bookId, author_id: au.id, author_order: i + 1 }]);
    resolved.push({ author_order: i + 1, authors: au });
  }
  return resolved;
}
