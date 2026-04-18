// Assigns default covers to all books that don't have one yet.
// Queries Open Library by title + author and stores the first cover found.
// Usage: node scripts/assign_covers.mjs
//
// Rate limit: 300ms between requests (~2 min for 345 books).

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchCoverId(title, author) {
  const params = new URLSearchParams({ fields: "cover_i", limit: 5 });
  params.set("title", title);
  if (author) params.set("author", author);
  try {
    const res = await fetch(`https://openlibrary.org/search.json?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const hit = (data.docs || []).find((d) => d.cover_i);
    return hit?.cover_i ?? null;
  } catch {
    return null;
  }
}

const { data: rows, error: fetchErr } = await supabase
  .from("books")
  .select("id, title, book_authors(author_order, authors(name))")
  .is("cover_url", null)
  .order("id");

if (fetchErr) { console.error("Fetch error:", fetchErr.message); process.exit(1); }

console.log(`${rows.length} books without covers. Starting…\n`);

let assigned = 0;
let skipped = 0;

for (let i = 0; i < rows.length; i++) {
  const b = rows[i];
  const author = (b.book_authors || [])
    .sort((a, z) => a.author_order - z.author_order)[0]
    ?.authors?.name ?? "";

  process.stdout.write(`[${i + 1}/${rows.length}] "${b.title}"… `);

  const coverId = await fetchCoverId(b.title, author);

  if (coverId) {
    const url = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    const { error: updateErr } = await supabase
      .from("books")
      .update({ cover_url: url })
      .eq("id", b.id);
    if (updateErr) {
      console.log(`ERROR: ${updateErr.message}`);
    } else {
      console.log(`✓ cover ${coverId}`);
      assigned++;
    }
  } else {
    console.log("no cover found");
    skipped++;
  }

  await delay(300);
}

console.log(`\nDone. ${assigned} covers assigned, ${skipped} not found.`);
