import { useState, useMemo, useEffect } from "react";
import * as db from "../lib/db";
import { normalizeBook } from "../lib/bookUtils";
import { useGenres } from "./useGenres";
import { useBookAiFill } from "./useBookAiFill";
import { useBookCRUD, makeDraft } from "./useBookCRUD";

export function useBooks({ session }) {
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [authorList, setAuthorList] = useState([]);
  const [bookDraft, setBookDraft] = useState(makeDraft);

  const genres = useGenres({ session });
  const aiFill = useBookAiFill({ session, setBookDraft });

  // Fetch authors for fuzzy matching
  useEffect(() => {
    db.getAuthorNames().then(({ data }) => {
      if (data) setAuthorList(data.map(a => a.name));
    });
  }, []);

  // Fetch books — re-fetches once auth is established
  useEffect(() => {
    if (session === undefined) return;
    setBooksLoading(true);
    db.getBooks(session?.user?.id)
      .then(({ data, error }) => {
        if (error) { console.error("Supabase fetch error:", error); return; }
        if (data) {
          try { setBooks(data.map(normalizeBook)); }
          catch (e) { console.error("normalizeBook error:", e, data[0]); }
        }
      })
      .catch(e => { console.error("Supabase connection error:", e); })
      .finally(() => setBooksLoading(false));
  }, [session]);

  const booksFingerprint = useMemo(() =>
    books.map(b => `${b.id}|${b.title}|${b.year}|${(b.genre || []).join("")}`).join(","),
  [books]);

  const crud = useBookCRUD({
    session, books, setBooks, bookDraft, setBookDraft,
    authorList, setAuthorList,
    onReset: () => {
      if (aiFill.bookChatInputRef.current) aiFill.bookChatInputRef.current.value = "";
      aiFill.setBookChatPending(null);
      genres.dismissGenreSuggestion();
    },
  });

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

  return {
    books,
    booksLoading,
    booksFingerprint,
    bookDraft, setBookDraft,
    ...crud,
    addGenre,
    acceptGenreSuggestion,
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
