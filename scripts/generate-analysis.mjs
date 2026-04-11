import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nhcmtjmqpahlrvbcyksl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_cCmmWZJrBU2Voi9VehZJUg_o895iWyC";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: rawBooks } = await supabase
  .from("books")
  .select("*, book_authors(author_order, authors(id, name, country))")
  .order("year_read_end", { ascending: true });

const books = rawBooks.map(b => ({
  ...b,
  author: b.book_authors?.sort((a,z) => a.author_order - z.author_order)[0]?.authors?.name || "",
  country: b.book_authors?.[0]?.authors?.country || "",
  year: b.year_read_end || b.year_read_start,
}));

console.error(`Loaded ${books.length} books`);

const buildContext = () => {
  const byYear = {}, byGenre = {}, byAuthor = {}, byCountry = {};
  books.forEach(b => {
    const yr = b.year_read_end || b.year_read_start;
    byYear[yr] = (byYear[yr] || 0) + 1;
    (b.genre || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
    byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
    if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
  });
  const topAuthors = Object.entries(byAuthor).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([a,c])=>`${a}(${c})`).join(", ");
  const genres = Object.entries(byGenre).sort((a,b)=>b[1]-a[1]).map(([g,c])=>`${g}(${c})`).join(", ");
  const years = Object.entries(byYear).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([y,c])=>`${y}:${c}`).join(", ");
  const countries = Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([c,n])=>`${c}(${n})`).join(", ");
  const seriesList = [...new Set(books.filter(b=>b.series?.trim()).map(b=>b.series))].join(", ");
  const fictionCount = books.filter(b=>b.fiction).length;
  return `READING DATABASE: ${books.length} books.
NOTE: Year 2010 is a collective entry representing all books read from 1998–2010. Not a single-year anomaly.
BOOKS BY YEAR: ${years}
TOP AUTHORS: ${topAuthors}
GENRES: ${genres}
COUNTRIES: ${countries}
SERIES READ: ${seriesList}
FICTION: ${fictionCount} (${Math.round(fictionCount/books.length*100)}%) | NON-FICTION: ${books.length-fictionCount}`;
};

const fullList = books
  .map(b => `[${b.year_read_end || b.year_read_start}] "${b.title}" by ${b.author} | ${(b.genre||[]).join("/")}${b.pages ? " | " + b.pages + "pp" : ""}${b.series ? " | series: " + b.series : ""}${b.fiction !== undefined ? " | " + (b.fiction ? "fiction" : "non-fiction") : ""}${b.notes ? " | notes: " + b.notes : ""}`)
  .join("\n");

const ctx = buildContext();
const dimensions = ["temporal", "genre", "geographic", "author", "thematic", "contextual", "complexity", "emotional", "discovery"];
const result = {};

for (const dimension of dimensions) {
  console.error(`Generating: ${dimension}...`);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-6",
      max_tokens: 800,
      system: `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly one key: "${dimension}". Write a deeply insightful, specific paragraph naming individual books and authors — surface non-obvious patterns and connections. Do not invent facts.\n\nCRITICAL: Year 2010 is a placeholder for all books read 1998–2010. Never describe it as a peak or anomaly.`,
      messages: [{ role: "user", content: `${ctx}\n\n--- FULL BOOK LIST (${books.length} books) ---\n${fullList}\n\nGenerate insight for the "${dimension}" dimension only.` }]
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    const parsed = JSON.parse(match[0]);
    if (parsed[dimension]) result[dimension] = parsed[dimension];
  }
  console.error(`  ✓ ${dimension}`);
}

console.log(JSON.stringify(result, null, 2));
