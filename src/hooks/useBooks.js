import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { normalizeBook } from "../lib/bookUtils";

const CLAUDE_URL = "/api/claude";
const aiHeaders = () => ({ "Content-Type": "application/json" });

const EMPTY_DRAFT = {
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
};

export function useBooks({ session }) {
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [genreList, setGenreList] = useState([]);
  const [genreMap, setGenreMap] = useState({});

  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookDraft, setBookDraft] = useState(EMPTY_DRAFT);

  const [bookChatLoading, setBookChatLoading] = useState(false);
  const [bookChatPending, setBookChatPending] = useState(null);
  const [bookSaving, setBookSaving] = useState(false);
  const [bookMsg, setBookMsg] = useState("");

  const [newGenreInput, setNewGenreInput] = useState("");
  const [newGenreOpen, setNewGenreOpen] = useState(false);
  const [newGenreSaving, setNewGenreSaving] = useState(false);
  const [lastAddedAt, setLastAddedAt] = useState(null);

  const bookChatInputRef = useRef(null);

  // Fetch genres
  useEffect(() => {
    supabase.from("genres").select("name, color, sort_order").order("sort_order").then(({ data }) => {
      if (data) {
        setGenreList(data.map(g => g.name));
        setGenreMap(Object.fromEntries(data.map(g => [g.name, g.color])));
      }
    });
  }, []);

  // Fetch books
  useEffect(() => {
    supabase
      .from("books")
      .select("*, book_authors(author_order, authors(id, name, country))")
      .order("id")
      .then(({ data, error }) => {
        if (error) { console.error("Supabase fetch error:", error); setBooksLoading(false); return; }
        if (data) {
          try { setBooks(data.map(normalizeBook)); }
          catch (e) { console.error("normalizeBook error:", e, data[0]); }
        }
        setBooksLoading(false);
      })
      .catch(e => { console.error("Supabase connection error:", e); setBooksLoading(false); });
  }, []);

  const booksFingerprint = useMemo(() =>
    books.map(b => `${b.id}|${b.title}|${b.year}|${(b.genre || []).join("")}`).join(","),
  [books]);

  const openAddModal = () => {
    setEditingBook(null);
    setBookDraft(EMPTY_DRAFT);
    if (bookChatInputRef.current) bookChatInputRef.current.value = "";
    setBookChatPending(null);
    setBookMsg("");
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
    });
    if (bookChatInputRef.current) bookChatInputRef.current.value = "";
    setBookChatPending(null);
    setBookMsg("");
    setShowBookModal(true);
  };

  const chatFillBook = async () => {
    const bookChatValue = bookChatInputRef.current?.value?.trim() || "";
    if (!bookChatValue || bookChatLoading) return;
    setBookChatLoading(true);
    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 400,
          system: `You are a book database assistant. Given a natural language description of a book, extract and return ONLY valid JSON (no markdown) with these fields: title (string), authors (array of {name, country}), genres (array, pick from: Fantasy, Sci-Fi, Thriller, Mystery, Literary Fiction, Historical Fiction, Non-Fiction, Graphic Novel, Memoir, Biography, Classic, Philosophy, Popular Science, Self-Help, Travel, Horror, History, Politics, Economics, Psychology, Business), fiction (boolean), format (MUST be exactly one of these values, no others allowed: "Novel", "Novella", "Short Stories", "Graphic Novel", "Non-Fiction", "Play"), series (string or ""), pages (number or null), year (original publication year as number).`,
          messages: [{ role: "user", content: bookChatValue }]
        })
      });
      if (!res.ok) throw new Error("api_unavailable");
      const data = await res.json();
      const txt = data.content?.[0]?.text || "";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setBookChatPending(parsed);
    } catch (e) {
      setBookMsg(e?.message === "api_unavailable"
        ? "AI fill only works on the deployed site, not locally."
        : "Could not parse. Try: 'Dune by Frank Herbert, sci-fi novel'.");
    }
    setBookChatLoading(false);
  };

  const applyPending = () => {
    if (!bookChatPending) return;
    setBookDraft(p => ({
      ...p,
      title: bookChatPending.title || p.title,
      authors: bookChatPending.authors?.length ? bookChatPending.authors : p.authors,
      genres: bookChatPending.genres?.length ? bookChatPending.genres : p.genres,
      fiction: bookChatPending.fiction !== undefined ? bookChatPending.fiction : p.fiction,
      format: bookChatPending.format || p.format,
      series: bookChatPending.series || p.series,
      pages: bookChatPending.pages ? String(bookChatPending.pages) : p.pages,
      yearStart: bookChatPending.year || p.yearStart,
      yearEnd: bookChatPending.year || p.yearEnd,
    }));
    setBookChatPending(null);
    if (bookChatInputRef.current) bookChatInputRef.current.value = "";
  };

  const lookupAuthorCountry = async (authorName) => {
    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 20,
          messages: [{ role: "user", content: `What country is the author "${authorName}" from? Reply with only the ISO 3166-1 short country name (e.g. "United Kingdom" not "UK", "United States" not "USA", "Czechia" not "Czech Republic"). If unknown, reply "Unknown".` }]
        })
      });
      const data = await res.json();
      return data.content?.[0]?.text?.trim() || null;
    } catch { return null; }
  };

  const addGenre = async () => {
    const name = newGenreInput.trim();
    if (!name) return;
    if (genreList.includes(name)) { setNewGenreInput(""); setNewGenreOpen(false); return; }
    setNewGenreSaving(true);
    let color = "#a0a0a0";
    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 16,
          messages: [{ role: "user", content: `Pick a single hex color code that visually represents the "${name}" book genre. Consider the mood and tone of the genre. Reply with only the hex code (e.g. #a29bfe), nothing else. Avoid colors already used for similar genres: ${Object.entries(genreMap).map(([g, c]) => g + ":" + c).join(", ")}` }]
        })
      });
      const data = await res.json();
      const hex = data.content?.[0]?.text?.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) color = hex;
    } catch { /* fallback to default */ }
    const sortOrder = genreList.length + 1;
    const { data, error } = await supabase.from("genres").insert([{ name, color, sort_order: sortOrder }]).select().single();
    if (!error && data) {
      setGenreList(prev => [...prev, name].sort());
      setGenreMap(prev => ({ ...prev, [name]: color }));
      setBookDraft(p => ({ ...p, genres: [...p.genres, name] }));
    }
    setNewGenreInput(""); setNewGenreOpen(false); setNewGenreSaving(false);
  };

  const saveBook = async () => {
    const { title, authors, genres, yearStart, yearEnd, format, fiction, series, pages, notes } = bookDraft;
    if (!title.trim() || !authors[0]?.name?.trim()) { setBookMsg("Title and at least one author are required."); return; }
    setBookSaving(true);
    try {
      const ys = parseInt(yearStart);
      const ye = parseInt(yearEnd);
      if (isNaN(ys) || isNaN(ye) || ys > ye) { setBookMsg("Year Start must be ≤ Year End."); setBookSaving(false); return; }
      if (editingBook) {
        // UPDATE
        const { error } = await supabase.from("books").update({
          title: title.trim(), year_read_start: ys, year_read_end: ye,
          genre: genres, format, fiction, series: series || "",
          pages: pages ? parseInt(pages) : null, notes: notes || "",
        }).eq("id", editingBook.id);
        if (error) throw error;
        await supabase.from("book_authors").delete().eq("book_id", editingBook.id);
        for (let i = 0; i < authors.length; i++) {
          const aName = authors[i].name.trim(); if (!aName) continue;
          const { data: au, error: auErr } = await supabase.from("authors").upsert([{ name: aName }], { onConflict: "name", ignoreDuplicates: false }).select().single();
          if (auErr || !au) throw new Error(`Could not resolve author: ${aName}`);
          if (!au.country) {
            const country = await lookupAuthorCountry(aName);
            if (country) await supabase.from("authors").update({ country }).eq("id", au.id);
          }
          await supabase.from("book_authors").insert([{ book_id: editingBook.id, author_id: au.id, author_order: i + 1 }]);
        }
        const updatedAuthors = authors.filter(a => a.name.trim()).map((a, i) => ({ author_order: i + 1, authors: { id: 0, name: a.name, country: a.country } }));
        const normalized = normalizeBook({ ...editingBook, title: title.trim(), year_read_start: ys, year_read_end: ye, genre: genres, format, fiction, series, pages: pages ? parseInt(pages) : null, notes, book_authors: updatedAuthors });
        setBooks(prev => prev.map(b => b.id === editingBook.id ? normalized : b));
        setBookMsg("✓ Book updated!");
      } else {
        // INSERT
        const { data: book, error: bookErr } = await supabase.from("books").insert([{
          user_id: session.user.id,
          title: title.trim(), year_read_start: ys, year_read_end: ye,
          genre: genres, format, fiction, series: series || "",
          pages: pages ? parseInt(pages) : null, notes: notes || "",
          user_added: true,
        }]).select().single();
        if (bookErr) throw bookErr;
        const bookAuthors = [];
        for (let i = 0; i < authors.length; i++) {
          const aName = authors[i].name.trim(); if (!aName) continue;
          const { data: au, error: auErr } = await supabase.from("authors").upsert([{ name: aName }], { onConflict: "name", ignoreDuplicates: false }).select().single();
          if (auErr || !au) throw new Error(`Could not resolve author: ${aName}`);
          if (!au.country) {
            const country = await lookupAuthorCountry(aName);
            if (country) { await supabase.from("authors").update({ country }).eq("id", au.id); au.country = country; }
          }
          await supabase.from("book_authors").insert([{ book_id: book.id, author_id: au.id, author_order: i + 1 }]);
          bookAuthors.push({ author_order: i + 1, authors: au });
        }
        setBooks(prev => [...prev, normalizeBook({ ...book, book_authors: bookAuthors })]);
        setBookMsg("✓ Book added!");
        setLastAddedAt(Date.now());
      }
      setTimeout(() => { setShowBookModal(false); setBookMsg(""); }, 1200);
    } catch (e) { console.error("saveBook error:", e); setBookMsg(`Error: ${e?.message || JSON.stringify(e)}`); }
    setBookSaving(false);
  };

  const deleteBook = async () => {
    if (!editingBook) return;
    setBookSaving(true);
    try {
      await supabase.from("book_authors").delete().eq("book_id", editingBook.id);
      const { error } = await supabase.from("books").delete().eq("id", editingBook.id);
      if (error) throw error;
      setBooks(prev => prev.filter(b => b.id !== editingBook.id));
      setShowBookModal(false);
    } catch (e) { console.error("deleteBook error:", e); setBookMsg(`Error: ${e?.message || JSON.stringify(e)}`); }
    setBookSaving(false);
  };

  return {
    // State
    books, setBooks,
    booksLoading,
    genreList, genreMap,
    booksFingerprint,
    showBookModal, setShowBookModal,
    editingBook,
    bookDraft, setBookDraft,
    bookChatLoading,
    bookChatPending, setBookChatPending,
    bookSaving,
    bookMsg, setBookMsg,
    newGenreInput, setNewGenreInput,
    newGenreOpen, setNewGenreOpen,
    newGenreSaving,
    bookChatInputRef,
    lastAddedAt,
    // Functions
    openAddModal,
    openEditModal,
    chatFillBook,
    applyPending,
    addGenre,
    saveBook,
    deleteBook,
  };
}
