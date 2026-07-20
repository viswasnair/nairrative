// ── Database adapter ───────────────────────────────────────────────────────
// All Supabase data access flows through this file.
// To swap Supabase for another backend, replace only the internals here.

import { supabase } from "./supabase";

const PUBLIC_COLS = "id, user_id, title, year_read_start, year_read_end, genre, format, fiction, series, series_number, pages, user_added, created_at, updated_at, cover_url, rating, description, mood, archetype, theme, narrative_style, setting_era";
const BOOK_AUTHORS_JOIN = "book_authors(author_order, authors(id, name, country))";

// ── Books ─────────────────────────────────────────────────────────────────────

// userId null/undefined → returns public (limited) columns with no user filter.
export function getBooks(userId) {
  const cols = userId ? "*" : PUBLIC_COLS;
  let q = supabase.from("books").select(`${cols}, ${BOOK_AUTHORS_JOIN}`);
  if (userId) q = q.eq("user_id", userId);
  return q.order("id");
}

export function insertBook(fields) {
  return supabase.from("books").insert([fields]).select().single();
}

export function updateBook(id, fields) {
  return supabase.from("books").update(fields).eq("id", id);
}

export function deleteBook(id) {
  return supabase.from("books").delete().eq("id", id);
}

export function updateBookRating(id, rating) {
  return supabase.from("books").update({ rating: rating || null }).eq("id", id);
}

// ── Authors ───────────────────────────────────────────────────────────────────

export function getAuthorNames() {
  return supabase.from("authors").select("name").order("name");
}

export function findAuthorByName(name) {
  return supabase.from("authors").select().eq("name", name).maybeSingle();
}

export function createAuthor(name) {
  return supabase.from("authors").insert([{ name }]).select().single();
}

export function updateAuthorCountry(id, country) {
  return supabase.from("authors").update({ country }).eq("id", id);
}

export function deleteAuthor(id) {
  return supabase.from("authors").delete().eq("id", id);
}

// ── Book–Author links ─────────────────────────────────────────────────────────

export function linkBookAuthor(bookId, authorId, order) {
  return supabase.from("book_authors").insert([{ book_id: bookId, author_id: authorId, author_order: order }]);
}

export function deleteBookAuthors(bookId) {
  return supabase.from("book_authors").delete().eq("book_id", bookId);
}

export function getBookAuthorLinks(bookId) {
  return supabase.from("book_authors").select("author_id, authors(name)").eq("book_id", bookId);
}

export function getAuthorBookCount(authorId) {
  return supabase.from("book_authors").select("*", { count: "exact", head: true }).eq("author_id", authorId);
}

// ── Genres ────────────────────────────────────────────────────────────────────

export function getGenres() {
  return supabase.from("genres").select("name, color, sort_order").order("sort_order");
}

export function insertGenre(fields) {
  return supabase.from("genres").insert([fields]).select().single();
}

// ── Panel prompts ─────────────────────────────────────────────────────────────

export function getPanelPrompts(userId) {
  return supabase.from("panel_prompts").select("data").eq("user_id", userId).maybeSingle();
}

export function savePanelPrompts(userId, data) {
  return supabase.from("panel_prompts").upsert(
    { user_id: userId, data },
    { onConflict: "user_id" }
  );
}

// ── Generic cache helpers (used by aiCache.js) ────────────────────────────────

export function loadCacheRow(table, userId) {
  const q = supabase.from(table).select("data");
  return (userId ? q.eq("user_id", userId) : q).maybeSingle();
}

export function saveCacheRow(table, userId, fingerprint, data) {
  return supabase.from(table).upsert(
    { user_id: userId, fingerprint, data },
    { onConflict: "user_id" }
  );
}

// ── New releases ──────────────────────────────────────────────────────────────

export function getNewReleases({ cols = "*", yearsBack = 2, limit = 20 } = {}) {
  return supabase
    .from("new_releases")
    .select(cols)
    .gte("published_date", `${new Date().getFullYear() - yearsBack}-01-01`)
    .order("published_date", { ascending: false })
    .limit(limit);
}

export function triggerReleasesCheck() {
  return supabase.functions.invoke("check-releases");
}
