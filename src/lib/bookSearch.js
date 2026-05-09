// ── Book cover search adapter ──────────────────────────────────────────────
// Wraps the OpenLibrary cover search API.
// To swap for another book data source, replace only the internals here.

const OPENLIBRARY_SEARCH = "https://openlibrary.org/search.json";
const OPENLIBRARY_COVERS = "https://covers.openlibrary.org/b/id";

// Searches for book covers by title and optional author.
// Returns an array of up to 9 unique OpenLibrary cover IDs.
export async function searchBookCovers(title, author) {
  const params = new URLSearchParams({ fields: "cover_i,title", limit: 20 });
  params.set("title", title);
  if (author) params.set("author", author);
  const res = await fetch(`${OPENLIBRARY_SEARCH}?${params}`);
  const data = await res.json();
  return [...new Set(
    (data.docs || []).filter(d => d.cover_i).map(d => d.cover_i)
  )].slice(0, 9);
}

// Returns the image URL for a given cover ID and size ("S", "M", "L").
export function coverUrl(id, size = "M") {
  return `${OPENLIBRARY_COVERS}/${id}-${size}.jpg`;
}
