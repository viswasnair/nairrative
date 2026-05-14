import { useState } from "react";
import * as db from "../lib/db";
import { normalizeBook } from "../lib/bookUtils";
import { sanitizeCoverUrl, fuzzyMatches } from "../lib/textUtils";
import { resolveAuthorLinks } from "../lib/authorUtils";

export const makeDraft = () => ({
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

/**
 * @param {{ session: object, books: object[], setBooks: Function,
 *           bookDraft: object, setBookDraft: Function,
 *           authorList: string[], setAuthorList: Function,
 *           onReset: Function }} params
 */
export function useBookCRUD({ session, books, setBooks, bookDraft, setBookDraft, authorList, setAuthorList, onReset }) {
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookSaving, setBookSaving] = useState(false);
  const [bookMsg, setBookMsg] = useState("");
  const [authorSuggestions, setAuthorSuggestions] = useState([]);
  const [lastAddedAt, setLastAddedAt] = useState(null);

  const resetModal = () => {
    setBookMsg("");
    setAuthorSuggestions([]);
    onReset();
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
        const { error } = await db.updateBook(editingBook.id, {
          title: title.trim(), year_read_start: ys, year_read_end: ye,
          genre: draftGenres, format, fiction, series: series || "",
          pages: pages ? parseInt(pages) : null, notes: notes || "",
          cover_url: sanitizeCoverUrl(cover_url),
          rating: rating || null, description: description || "",
          mood: mood || null, narrative_style: narrative_style || null,
          setting_era: setting_era || null, archetype: archetype || null,
          theme: theme?.length ? theme : null,
        });
        if (error) throw error;
        await db.deleteBookAuthors(editingBook.id);
        const updatedAuthors = await resolveAuthorLinks(authors, editingBook.id, session);
        const normalized = normalizeBook({ ...editingBook, title: title.trim(), year_read_start: ys, year_read_end: ye, genre: draftGenres, format, fiction, series, pages: pages ? parseInt(pages) : null, notes, cover_url: sanitizeCoverUrl(cover_url), rating: rating || null, description: description || "", book_authors: updatedAuthors });
        setBooks(prev => prev.map(b => b.id === editingBook.id ? normalized : b));
        const updatedNames = authors.map(a => a.name.trim()).filter(n => n && !authorList.includes(n));
        if (updatedNames.length) setAuthorList(prev => [...new Set([...prev, ...updatedNames])].sort());
        setBookMsg("✓ Book updated!");
      } else {
        const { data: book, error: bookErr } = await db.insertBook({
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
        });
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
    const snapshot = books;
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, rating } : b));
    const { error } = await db.updateBookRating(bookId, rating);
    if (error) {
      console.error("updateBookRating error:", error);
      setBooks(snapshot);
    }
  };

  const deleteBook = async () => {
    if (!editingBook) return;
    setBookSaving(true);
    try {
      const { data: junctionRows } = await db.getBookAuthorLinks(editingBook.id);
      await db.deleteBookAuthors(editingBook.id);
      const { error } = await db.deleteBook(editingBook.id);
      if (error) throw error;
      if (junctionRows?.length) {
        const orphanedNames = [];
        for (const row of junctionRows) {
          const { count } = await db.getAuthorBookCount(row.author_id);
          if (count === 0) {
            await db.deleteAuthor(row.author_id);
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
    showBookModal, setShowBookModal,
    editingBook,
    bookSaving,
    bookMsg, setBookMsg,
    lastAddedAt,
    authorSuggestions,
    openAddModal,
    openEditModal,
    checkAuthorSuggestion,
    acceptAuthorSuggestion,
    dismissAuthorSuggestion,
    saveBook,
    updateBookRating,
    deleteBook,
  };
}
