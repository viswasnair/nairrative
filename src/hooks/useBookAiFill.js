import { useState, useRef, useEffect } from "react";
import { LLM_URL, claudeHeaders } from "../lib/api";
import { sanitizePromptInput } from "../lib/textUtils";

export function useBookAiFill({ session, setBookDraft }) {
  const [bookChatLoading, setBookChatLoading] = useState(false);
  const [bookChatPending, setBookChatPending] = useState(null);
  const bookChatInputRef = useRef(null);
  const fillAbortRef = useRef(null);

  useEffect(() => () => fillAbortRef.current?.abort(), []);

  const chatFillBook = async () => {
    const bookChatValue = sanitizePromptInput(bookChatInputRef.current?.value?.trim() || "");
    if (!bookChatValue || bookChatLoading) return;
    fillAbortRef.current?.abort();
    const controller = new AbortController();
    fillAbortRef.current = controller;
    setBookChatLoading(true);
    try {
      const res = await fetch(LLM_URL, {
        method: "POST", headers: claudeHeaders(session),
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 600,
          system: `You are a book database assistant. Given a natural language description of a book, use your knowledge to identify the exact book (correct title, author spelling, publication year) and return ONLY valid JSON (no markdown) with these fields: title (string), authors (array of {name, country}), genres (array, pick from: Fantasy, Sci-Fi, Thriller, Mystery, Literary Fiction, Historical Fiction, Non-Fiction, Graphic Novel, Memoir, Biography, Classic, Philosophy, Popular Science, Self-Help, Travel, Horror, History, Politics, Economics, Psychology, Business), fiction (boolean), format (MUST be exactly one of these values, no others allowed: "Novel", "Novella", "Short Stories", "Graphic Novel", "Non-Fiction", "Play"), series (string or ""), pages (number or null), year (original publication year as number), description (2-3 sentence spoiler-free summary of what the book is about and why it is notable), mood (single word or short phrase for the dominant emotional register, e.g. "tense", "contemplative", "epic", "witty"), narrative_style (how the story is told, e.g. "linear third-person", "omniscient third-person", "first-person", "expository", "multiple perspectives"), setting_era (time and place context, e.g. "contemporary", "far future", "WWII Britain", "ancient Rome", "fantasy world"), archetype (dominant story structure — one of: "Hero's Journey", "Overcoming the Monster", "Quest", "Voyage and Return", "Rebirth", "Rags to Riches", "Tragedy", "Comedy", "Ensemble Drama"), theme (array of 2-5 short lowercase strings for the main intellectual/emotional themes, e.g. ["survival", "identity", "power"]).`,
          messages: [{ role: "user", content: bookChatValue }]
        })
      });
      if (!res.ok) throw new Error("api_unavailable");
      const data = await res.json();
      const txt = data.content?.[0]?.text || "";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setBookChatPending(parsed);
    } catch (e) {
      if (e.name === "AbortError") return null;
      return e?.message === "api_unavailable"
        ? "AI fill only works on the deployed site, not locally."
        : "Could not parse. Try: 'Dune by Frank Herbert, sci-fi novel'.";
    } finally {
      if (!controller.signal.aborted) setBookChatLoading(false);
    }
    return null;
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
      description: bookChatPending.description || p.description,
      mood: bookChatPending.mood || p.mood,
      narrative_style: bookChatPending.narrative_style || p.narrative_style,
      setting_era: bookChatPending.setting_era || p.setting_era,
      archetype: bookChatPending.archetype || p.archetype,
      theme: bookChatPending.theme?.length ? bookChatPending.theme : p.theme,
    }));
    setBookChatPending(null);
    if (bookChatInputRef.current) bookChatInputRef.current.value = "";
  };

  return {
    bookChatLoading,
    bookChatPending, setBookChatPending,
    bookChatInputRef,
    chatFillBook,
    applyPending,
  };
}
