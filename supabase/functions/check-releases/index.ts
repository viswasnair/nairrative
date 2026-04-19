import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_BOOKS = "https://www.googleapis.com/books/v1/volumes";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch all books with authors joined
  const { data: rows } = await supabase
    .from("books")
    .select("title, series, year_read_end, book_authors(authors(name))");

  if (!rows?.length) return json({ found: 0 });

  // Build author → most recent year_read_end map
  const authorYear = new Map<string, number>();
  const existingTitles = new Set<string>();

  for (const book of rows) {
    if (book.title) existingTitles.add(book.title.toLowerCase());
    for (const ba of (book.book_authors as any[]) || []) {
      const name: string = ba.authors?.name;
      if (!name) continue;
      const yr = book.year_read_end ?? 0;
      if (!authorYear.has(name) || yr > authorYear.get(name)!) {
        authorYear.set(name, yr);
      }
    }
  }

  // Collect already-known Google Books IDs to avoid re-inserting
  const { data: existing } = await supabase.from("new_releases").select("google_books_id");
  const knownIds = new Set((existing || []).map((r: any) => r.google_books_id));

  const toInsert: object[] = [];

  for (const [author, lastYear] of authorYear) {
    try {
      const url = `${GOOGLE_BOOKS}?q=inauthor:"${encodeURIComponent(author)}"&orderBy=newest&maxResults=5`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();

      for (const item of data.items ?? []) {
        const info = item.volumeInfo ?? {};
        const pubYear = parseInt((info.publishedDate ?? "0").slice(0, 4));
        if (!pubYear || pubYear <= lastYear) continue;

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

  return json({ found: toInsert.length });
});

function json(body: object) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}
