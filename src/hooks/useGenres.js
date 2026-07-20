import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { LLM_URL, claudeHeaders } from "../lib/api";
import { sanitizeShortInput, fuzzyMatches } from "../lib/textUtils";

export function useGenres({ session }) {
  const [genreList, setGenreList] = useState([]);
  const [genreMap, setGenreMap] = useState({});
  const [newGenreInput, setNewGenreInput] = useState("");
  const [newGenreOpen, setNewGenreOpen] = useState(false);
  const [newGenreSaving, setNewGenreSaving] = useState(false);
  const [genreSuggestion, setGenreSuggestion] = useState(null);

  useEffect(() => {
    db.getGenres().then(({ data }) => {
      if (data) {
        setGenreList(data.map(g => g.name));
        setGenreMap(Object.fromEntries(data.map(g => [g.name, g.color])));
      }
    });
  }, []);

  const acceptGenreSuggestion = (suggestion) => {
    if (!suggestion) return;
    setNewGenreInput(""); setNewGenreOpen(false); setGenreSuggestion(null);
    return suggestion;
  };

  const dismissGenreSuggestion = () => setGenreSuggestion(null);

  const addGenre = async (name, currentGenres, force = false) => {
    const sanitized = sanitizeShortInput(name.trim());
    if (!sanitized) return { type: "noop" };

    const exactMatch = genreList.find(g => g.toLowerCase() === sanitized.toLowerCase());
    if (exactMatch) {
      setNewGenreInput(""); setNewGenreOpen(false); setGenreSuggestion(null);
      return { type: "existing", genre: exactMatch };
    }

    if (!force) {
      const matches = fuzzyMatches(sanitized, genreList);
      if (matches.length) { setGenreSuggestion(matches); return { type: "suggestion", matches }; }
    }

    setGenreSuggestion(null);
    setNewGenreSaving(true);
    let color = "#a0a0a0";
    try {
      const res = await fetch(LLM_URL, {
        method: "POST", headers: claudeHeaders(session),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 16,
          messages: [{ role: "user", content: `Pick a single hex color code that visually represents the "${sanitized}" book genre. Consider the mood and tone of the genre. Reply with only the hex code (e.g. #a29bfe), nothing else. Avoid colors already used for similar genres: ${Object.entries(genreMap).map(([g, c]) => g + ":" + c).join(", ")}` }]
        })
      });
      const data = await res.json();
      const hex = data.content?.[0]?.text?.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) color = hex;
    } catch { /* fallback to default */ }

    const sortOrder = genreList.length + 1;
    const { data, error } = await db.insertGenre({ name: sanitized, color, sort_order: sortOrder });
    if (!error && data) {
      setGenreList(prev => [...prev, sanitized].sort());
      setGenreMap(prev => ({ ...prev, [sanitized]: color }));
    }
    setNewGenreInput(""); setNewGenreOpen(false); setNewGenreSaving(false);
    return error ? { type: "error" } : { type: "new", genre: sanitized };
  };

  return {
    genreList, genreMap,
    newGenreInput, setNewGenreInput,
    newGenreOpen, setNewGenreOpen,
    newGenreSaving,
    genreSuggestion,
    addGenre,
    acceptGenreSuggestion,
    dismissGenreSuggestion,
  };
}
