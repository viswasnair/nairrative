import { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { normalizeBook } from "../lib/bookUtils";
import { sanitizeCoverUrl, fuzzyMatches } from "../lib/textUtils";
import { resolveAuthorLinks } from "../lib/authorUtils";
import { useGenres } from "./useGenres";
import { useBookAiFill } from "./useBookAiFill";

const makeDraft = () => ({
  title: "",
  authors: [{ name: "" }],
  genres: [],
  yearStart: new Date().getFullYear(),
  yearEnd: new Date().getFullYear(),
  format: "Novel",
  fiction: true,
  series: "",
  pages: "",
  notes: "",
  cover_url: "",
  rating: "",
  description: "",
  mood: "",
  narrative_style: "",
  setting_era: "",
  archetype: "",
  theme: [],
});

export function useBooks({ session }) {
  const [books, setBooks] = useState([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookDraft, setBookDraft] = useState(makeDraft);
  const [bookSaving, setBookSaving] = useState(false);
  const [bookMsg, setBookMsg] = useState("");
  const [lastAddedAt, setLastAddedAt] = useState(null);
  const [authorList, setAuthorList] = useState([]);
  const [authorSuggestions, setAuthorSuggestions] = useState([]);

  const genres = useGenres({ session });
  const aiFill = useBookAiFill({ session, setBookDraft });

  // Fetch authors for fuzzy matching
  useEffect(() => {
    supabase.from("authors").select("name").order("name").then(({ data }) => {
      if (data) setAuthorList(data.map(a => a.name));
    });
  }, []);

  // Fetch books — depends on session so we re-fetch once auth is established
  useEffect(() => {
    if (session === undefined) return;
    const PUBLIC_COLS = "id, user_id, title, year_read_start, year_read_end, genre, format, fiction, series, series_number, pages, user_added, created_at, updated_at, cover_url, rating, description";
    const cols = session ? "*" : PUBLIC_COLS;
    let query = supabase
      .from("books")
      .select(`${cols}, book_authors(author_order, authors(id, name, country))`);
    if (session) query = query.eq("user_id", session.user.id);
    query.order("id")
      .then(({ data, error }) => {
        if (error) { console.error("Supabase fetch error:", error); return; }
        if (data) {
          try { setBooks(data.map(normalizeBook)); }
          catch (e) { console.error("normalizeBook error:", e, data[0]); }
        }
      })
      .catch(e => { console.error("Supabase connection error:", e); });
  }, [session]);

  const booksFingerprint = useMemo(() =>
    books.map(b => `${b.id}|${b.title}|${b.year}|${(b.genre || []).join("")}`).join(","),
  [books]);

  const resetModal = () => {
    if (aiFill.bookChatInputRef.current) aiFill.bookChatInputRef.current.value = "";
    aiFill.setBookChatPending(null);
    setBookMsg("");
    setAuthorSuggestions([]);
    genres.dismissGenreSuggestion();
  };

  const openAddModal = () => {
    setEditingBook(null);
    setBookDraft(makeDraft());
    resetModal();
    setShowBookModal(true);
  };

  const openEditModal = (b) => {
    setEditingBook(b);
    setBookDraft({
      title: b.title || "",
      authors: b.authors?.length ? b.authors.map(a => ({ name: a.name || "" })) : [{ name: b.author || "" }],
      genres: b.genre || [],
      yearStart: b.year_read_start || b.year || new Date().getFullYear(),
      yearEnd: b.year_read_end || b.year || new Date().getFullYear(),
      format: b.format || "Novel",
      fiction: b.fiction !== false,
      series: b.series || "",
      pages: b.pages ? String(b.pages) : "",
      notes: b.notes || "",
      cover_url: b.cover_url || "",
      rating: b.rating || "",
      description: b.description || "",
      mood: b.mood || "",
      narrative_style: b.narrative_style || "",
      setting_era: b.setting_era || "",
      archetype: b.archetype || "",
      theme: b.theme || [],
    });
    resetModal();
    setShowBookModal(true);
  };

  const checkAuthorSuggestion = (i, name) => {
    const trimmed = name.trim();
    if (!trimmed || authorList.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setAuthorSuggestions(prev => { const next = [...prev]; next[i] = null; return next; });
      return;
    }
    const matches = fuzzyMatches(trimmed, authorList);
    setAuthorSuggestions(prev => { const next = [...prev]; next[i] = matches.length ? matches : null; return next; });
  };

  const acceptAuthorSuggestion = (i, suggestion) => {
    setBookDraft(p => {
      const au = [...p.authors];
      au[i] = { ...au[i], name: suggestion };
      return { ...p, authors: au };
    });
    setAuthorSuggestions(prev => { const next = [...prev]; next[i] = null; return next; });
  };

  const dismissAuthorSuggestion = (i) => {
    setAuthorSuggestions(prev => { const next = [...prev]; next[i] = null; return next; });
  };

  // Wraps useGenres.addGenre with draft genre update
  const addGenre = async (force = false) => {
    const result = await genres.addGenre(genres.newGenreInput, bookDraft.genres, force);
    if (result.type === "existing" || result.type === "new") {
      const genre = result.genre;
      if (!bookDraft.genres.includes(genre))
        setBookDraft(p => ({ ...p, genres: [...p.genres, genre] }));
    }
  };

  // Wraps useGenres.acceptGenreSuggestion with draft genre update
  const acceptGenreSuggestion = (suggestion) => {
    genres.acceptGenreSuggestion(suggestion);
    if (!bookDraft.genres.includes(suggestion))
      setBookDraft(p => ({ ...p, genres: [...p.genres, suggestion] }));
  };

  const saveBook = async () => {
    const { title, authors, genres: draftGenres, yearStart, yearEnd, format, fiction, series, pages, notes, cover_url, rating, description, mood, narrative_style, setting_era, archetype, theme } = bookDraft;
    if (!title.trim() || !authors[0]?.name?.trim()) { setBookMsg("Title and at least one author are required."); return; }

    const saveSuggestions = authors.map(a => {
      const trimmed = a.name.trim();
      if (!trimmed || authorList.some(n => n.toLowerCase() === trimmed.toLowerCase())) return null;
      const matches = fuzzyMatches(trimmed, authorList);
      return matches.length ? matches : null;
    });
    if (saveSuggestions.some(s => s !== null)) {
      setAuthorSuggestions(saveSuggestions);
      setBookMsg("Check the author name suggestion below — or dismiss it to save as typed.");
      return;
    }

    setBookSaving(true);
    try {
      const ys = parseInt(yearStart);
      const ye = parseInt(yearEnd);
      if (isNaN(ys) || isNaN(ye) || ys > ye) { setBookMsg("Year Start must be ≤ Year End."); setBookSaving(false); return; }
      if (editingBook) {
        const { error } = await supabase.from("books").update({
          title: title.trim(), year_read_start: ys, year_read_end: ye,
          genre: draftGenres, format, fiction, series: series || "",
          pages: pages ? parseInt(pages) : null, notes: notes || "",
          cover_url: sanitizeCoverUrl(cover_url),
          rating: rating || null, description: description || "",
          mood: mood || null, narrative_style: narrative_style || null,
          setting_era: setting_era || null, archetype: archetype || null,
          theme: theme?.length ? theme : null,
        }).eq("id", editingBook.id);
        if (error) throw error;
        await supabase.from("book_authors").delete().eq("book_id", editingBook.id);
        const updatedAuthors = await resolveAuthorLinks(authors, editingBook.id, session);
        const normalized = normalizeBook({ ...editingBook, title: title.trim(), year_read_start: ys, year_read_end: ye, genre: draftGenres, format, fiction, series, pages: pages ? parseInt(pages) : null, notes, cover_url: sanitizeCoverUrl(cover_url), rating: rating || null, description: description || "", book_authors: updatedAuthors });
        setBooks(prev => prev.map(b => b.id === editingBook.id ? normalized : b));
        const updatedNames = authors.map(a => a.name.trim()).filter(n => n && !authorList.includes(n));
        if (updatedNames.length) setAuthorList(prev => [...new Set([...prev, ...updatedNames])].sort());
        setBookMsg("✓ Book updated!");
      } else {
        const { data: book, error: bookErr } = await supabase.from("books").insert([{
          user_id: session.user.id,
          title: title.trim(), year_read_start: ys, year_read_end: ye,
          genre: draftGenres, format, fiction, series: series || "",
          pages: pages ? parseInt(pages) : null, notes: notes || "",
          cover_url: sanitizeCoverUrl(cover_url),
          rating: rating || null, description: description || "",
          mood: mood || null, narrative_style: narrative_style || null,
          setting_era: setting_era || null, archetype: archetype || null,
          theme: theme?.length ? theme : null,
          user_added: true,
        }]).select().single();
        if (bookErr) throw bookErr;
        const bookAuthors = await resolveAuthorLinks(authors, book.id, session);
        setBooks(prev => [...prev, normalizeBook({ ...book, book_authors: bookAuthors })]);
        const addedNames = authors.map(a => a.name.trim()).filter(n => n && !authorList.includes(n));
        if (addedNames.length) setAuthorList(prev => [...new Set([...prev, ...addedNames])].sort());
        setBookMsg("✓ Book added!");
        setLastAddedAt(Date.now());
      }
      setTimeout(() => { setShowBookModal(false); setBookMsg(""); }, 1200);
    } catch (e) { console.error("saveBook error:", e); setBookMsg("Something went wrong. Please try again."); }
    setBookSaving(false);
  };

  const updateBookRating = async (bookId, rating) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, rating } : b));
    await supabase.from("books").update({ rating: rating || null }).eq("id", bookId);
  };

  const deleteBook = async () => {
    if (!editingBook) return;
    setBookSaving(true);
    try {
      const { data: junctionRows } = await supabase
        .from("book_authors")
        .select("author_id, authors(name)")
        .eq("book_id", editingBook.id);

      await supabase.from("book_authors").delete().eq("book_id", editingBook.id);
      const { error } = await supabase.from("books").delete().eq("id", editingBook.id);
      if (error) throw error;

      if (junctionRows?.length) {
        const orphanedNames = [];
        for (const row of junctionRows) {
          const { count } = await supabase
            .from("book_authors")
            .select("*", { count: "exact", head: true })
            .eq("author_id", row.author_id);
          if (count === 0) {
            await supabase.from("authors").delete().eq("id", row.author_id);
            if (row.authors?.name) orphanedNames.push(row.authors.name);
          }
        }
        if (orphanedNames.length)
          setAuthorList(prev => prev.filter(n => !orphanedNames.includes(n)));
      }

      setBooks(prev => prev.filter(b => b.id !== editingBook.id));
      setShowBookModal(false);
    } catch (e) { console.error("deleteBook error:", e); setBookMsg("Something went wrong. Please try again."); }
    setBookSaving(false);
  };

  return {
    books,
    booksFingerprint,
    showBookModal, setShowBookModal,
    editingBook,
    bookDraft, setBookDraft,
    bookSaving,
    bookMsg, setBookMsg,
    lastAddedAt,
    authorSuggestions,
    openAddModal,
    openEditModal,
    checkAuthorSuggestion,
    acceptAuthorSuggestion,
    dismissAuthorSuggestion,
    addGenre,
    acceptGenreSuggestion,
    saveBook,
    updateBookRating,
    deleteBook,
    // from useGenres
    genreList: genres.genreList,
    genreMap: genres.genreMap,
    newGenreInput: genres.newGenreInput,
    setNewGenreInput: genres.setNewGenreInput,
    newGenreOpen: genres.newGenreOpen,
    setNewGenreOpen: genres.setNewGenreOpen,
    newGenreSaving: genres.newGenreSaving,
    genreSuggestion: genres.genreSuggestion,
    dismissGenreSuggestion: genres.dismissGenreSuggestion,
    // from useBookAiFill
    bookChatLoading: aiFill.bookChatLoading,
    bookChatPending: aiFill.bookChatPending,
    setBookChatPending: aiFill.setBookChatPending,
    bookChatInputRef: aiFill.bookChatInputRef,
    chatFillBook: aiFill.chatFillBook,
    applyPending: aiFill.applyPending,
  };
}
