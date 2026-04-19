import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_BOOKS = "https://www.googleapis.com/books/v1/volumes";
const MAX_RESULTS = 20;
const YEARS_BACK = 2;
const TOP_GENRES = 3;
const TOP_AUTHORS = 15;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: rows } = await supabase
    .from("books")
    .select("title, genre, year_read_end, book_authors(authors(name))");

  if (!rows?.length) return json({ found: 0 });

  const cutoffYear = new Date().getFullYear() - YEARS_BACK;

  // Tally genre and author frequencies
  const genreCount = new Map<string, number>();
  const authorBookCount = new Map<string, number>();
  const authorGenres = new Map<string, Set<string>>();
  const authorLastYear = new Map<string, number>();
  const existingTitles = new Set<string>();

  for (const book of rows) {
    if (book.title) existingTitles.add(book.title.toLowerCase());
    const bookGenres: string[] = book.genre || [];
    for (const g of bookGenres) genreCount.set(g, (genreCount.get(g) || 0) + 1);

    for (const ba of (book.book_authors as any[]) || []) {
      const name: string = ba.authors?.name;
      if (!name) continue;
      authorBookCount.set(name, (authorBookCount.get(name) || 0) + 1);
      const yr = book.year_read_end ?? 0;
      if (!authorLastYear.has(name) || yr > authorLastYear.get(name)!) authorLastYear.set(name, yr);
      if (!authorGenres.has(name)) authorGenres.set(name, new Set());
      for (const g of bookGenres) authorGenres.get(name)!.add(g);
    }
  }

  // Top genres by read count
  const topGenreSet = new Set(
    [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_GENRES).map(([g]) => g)
  );

  // Top authors: must have books in top genres, sorted by read count, capped
  const eligibleAuthors = [...authorBookCount.entries()]
    .filter(([name]) => [...(authorGenres.get(name) || [])].some(g => topGenreSet.has(g)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_AUTHORS)
    .map(([name]) => name);

  // Known IDs to avoid re-inserting
  const { data: existing } = await supabase.from("new_releases").select("google_books_id");
  const knownIds = new Set((existing || []).map((r: any) => r.google_books_id));

  const toInsert: object[] = [];

  for (const author of eligibleAuthors) {
    if (toInsert.length >= MAX_RESULTS) break;
    try {
      const url = `${GOOGLE_BOOKS}?q=inauthor:"${encodeURIComponent(author)}"&orderBy=newest&maxResults=5`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      for (const item of data.items ?? []) {
        if (toInsert.length >= MAX_RESULTS) break;
        const info = item.volumeInfo ?? {};
        const pubYear = parseInt((info.publishedDate ?? "0").slice(0, 4));
        if (!pubYear || pubYear < cutoffYear) continue;

        const title: string = info.title ?? "";
        if (!title || existingTitles.has(title.toLowerCase())) continue;
        if (knownIds.has(item.id)) continue;

        toInsert.push({
          title,
          author,
          published_date: info.publishedDate ?? null,
          description: info.description ? info.description.slice(0, 500) : null,
          cover_url: info.imageLinks?.thumbnail ?? null,
          google_books_id: item.id,
        });
        knownIds.add(item.id);
      }
    } catch {
      // skip authors that fail
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("new_releases").upsert(toInsert, { onConflict: "google_books_id" });
  }

  // Clean up dismissed entries and entries older than cutoff year
  await supabase.from("new_releases")
    .delete()
    .or(`dismissed.eq.true,published_date.lt.${cutoffYear}-01-01`);

  return json({ found: toInsert.length, topGenres: [...topGenreSet], authorsChecked: eligibleAuthors.length });
});

function json(body: object) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}
