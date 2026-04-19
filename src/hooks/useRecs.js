import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { buildBookContext } from "../lib/bookUtils";
import { SEED_RECS, } from "../constants/seeds";
import { AUTO_RECS } from "../constants/config";
import { CLAUDE_URL, claudeHeaders } from "../lib/api";

export function useRecs({ books, booksFingerprint, activeTab, readTitlesString }) {
  const [intentInputs, setIntentInputs] = useState({
    "loved": "God's Debris",
    "authors-like": "Elif Shafak",
    "mood": "fear of fascism",
    "genre-pick": "Science Fiction",
    "topic": "AI",
    "pair": "Dhurandar",
  });
  const [intentResults, setIntentResults] = useState({});
  const [intentLoading, setIntentLoading] = useState({});
  const [refreshCounts, setRefreshCounts] = useState({});
  const prevRecsFingerprint = useRef(null);

  // Load recs from cache on tab switch or when books first load
  useEffect(() => {
    if (activeTab !== "recs") return;
    if (!books.length) { setIntentResults(SEED_RECS); return; }
    const cachedFp = localStorage.getItem("nairrative_recs_fp");
    const cachedResult = localStorage.getItem("nairrative_recs");
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setIntentResults({ ...SEED_RECS, ...JSON.parse(cachedResult) }); return; } catch {}
    }
    supabase.from("recs_cache").select("data").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (data?.data) {
          const merged = { ...SEED_RECS, ...data.data };
          setIntentResults(merged);
          localStorage.setItem("nairrative_recs", JSON.stringify(merged));
          localStorage.setItem("nairrative_recs_fp", booksFingerprint);
        } else {
          setIntentResults(SEED_RECS);
        }
      })
      .catch(() => setIntentResults(SEED_RECS));
  }, [activeTab, booksFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveRecsToSupabase = async (data) => {
    try {
      await supabase.from("recs_cache").upsert({ id: 1, fingerprint: booksFingerprint, data });
    } catch (e) { console.error("Failed to save recs to Supabase:", e); }
  };

  const fetchIntentRecs = async (intentId, input = "") => {
    if (intentLoading[intentId]) return;
    setIntentLoading(p => ({ ...p, [intentId]: true }));
    const rc = (refreshCounts[intentId] || 0) + 1;
    setRefreshCounts(p => ({ ...p, [intentId]: rc }));
    const lastBook = books[books.length - 1];
    const lastAuthor = lastBook?.author || "Brandon Sanderson";
    const seriesList = [...new Set(books.filter(b => b.series?.trim()).map(b => b.series))];
    const randomSeries = seriesList[Math.floor(Math.random() * seriesList.length)] || "Wheel of Time";
    const today = new Date().toISOString().slice(0, 10);
    const variationNote = rc > 1 ? ` This is refresh #${rc} — you MUST pick a completely different book from any prior recommendation for this lens.` : "";
    const prompts = {
      "more-like": `The user's most recent read is "${lastBook?.title}" by ${lastAuthor}. Recommend 1 unread book with the same feel, themes, or writing style that this reader would love.${variationNote}`,
      "more-by-last": `The user's most recent author is ${lastAuthor}. Recommend 1 other book by ${lastAuthor} that the reader hasn't read yet. If all are read, recommend 1 book by an author with very similar style.${variationNote}`,
      "similar-author": `Based on the reader loving ${lastAuthor}, recommend 1 book by an author with a very similar writing style, themes, or storytelling approach.${variationNote}`,
      "trending": `Today is ${today}. Recommend 1 book that is critically acclaimed, culturally buzzy, or award-shortlisted in 2024–2026 that fits this reader's taste profile. Use web search to verify it is actually available and well-reviewed.${variationNote}`,
      "challenge": `This reader favors accessible genre fiction. Recommend 1 genuinely challenging, rewarding read — dense classic, experimental fiction, or demanding long-form non-fiction.${variationNote}`,
      "quick": `Recommend 1 book under 300 pages that is deeply rewarding given this reader's taste (thrillers, literary fiction, fantasy).${variationNote}`,
      "gaps": `This reader's library skews Western/Indian/anglophone. Recommend 1 book from an underrepresented literary tradition — Japanese, African, Latin American, Nordic, Arabic, or Southeast Asian voices.${variationNote}`,
      "surprise": `Give 1 wildly unexpected book recommendation that this reader would never pick for themselves but would secretly love. Bold, surprising, off-pattern pick.${variationNote}`,
      "finish": `This reader has read books from the series "${randomSeries}". Recommend 1 book that is either the next unread entry in this series or a very similar series with satisfying completions.${variationNote}`,
      "loved": `The user loved: "${input}". Recommend 1 book with similar appeal — themes, pacing, emotional tone, or narrative style.${variationNote}`,
      "authors-like": `The user loves authors like ${input}. Recommend 1 book by a different author with very similar style, subject matter, or storytelling sensibility.${variationNote}`,
      "mood": `The user is in the mood for: "${input}". Recommend 1 book that perfectly matches this emotional register or atmosphere.${variationNote}`,
      "genre-pick": `Recommend 1 excellent book in the genre: "${input}". Today is ${today} — consider recent releases as well as classics.${variationNote}`,
      "topic": `Recommend 1 book about: "${input}". Cross genre if needed — fiction, non-fiction, memoir. Today is ${today}.${variationNote}`,
      "occasion": `Recommend 1 book perfect for: "${input}". Match tone, length, and engagement level to the occasion.${variationNote}`,
      "pair": `The user wants to pair a book with: "${input}" (a film, show, event, or experience). Recommend 1 ideal companion read.${variationNote}`,
    };
    try {
      const useWebSearch = intentId === "trending" || intentId === "pair";
      const body = {
        model: "claude-haiku-4-5-20251001", max_tokens: 400,
        system: `You are a precise book recommendation engine. Today is ${today}. Reader history:\n${buildBookContext(books)}\n\nDo NOT recommend any of these already-read titles: ${readTitlesString}.\n\nOnly recommend unread books published up to ${today}.\n\n${prompts[intentId] || input}\n\nReturn ONLY a JSON array — no markdown, no explanation. Exactly 1 item. Format: [{"title": "...", "author": "...", "year": 2024, "reason": "1-2 sentences why it fits this reader"}].`,
        messages: [{ role: "user", content: "JSON array only." }],
      };
      if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }];
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(CLAUDE_URL, { method: "POST", headers: claudeHeaders(session), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || data.error.type || JSON.stringify(data.error));
      const txt = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      const m = txt.match(/\[[\s\S]*?\]/);
      const parsed = m ? JSON.parse(m[0]) : JSON.parse(txt.replace(/```json|```/g, "").trim());
      setIntentResults(prev => {
        const updated = { ...prev, [intentId]: Array.isArray(parsed) ? parsed.slice(0, 1) : [] };
        localStorage.setItem("nairrative_recs", JSON.stringify(updated));
        localStorage.setItem("nairrative_recs_fp", booksFingerprint);
        saveRecsToSupabase(updated);
        return updated;
      });
    } catch (e) {
      console.error("fetchIntentRecs error:", e);
      setIntentResults(p => ({ ...p, [intentId]: [{ title: "Could not load", author: "", reason: e?.message || "Unknown error — check console for details." }] }));
    }
    setIntentLoading(p => { const n = { ...p }; delete n[intentId]; return n; });
  };

  // Regenerate auto recs when books change (skip initial load)
  useEffect(() => {
    if (!booksFingerprint) return;
    if (prevRecsFingerprint.current === null) { prevRecsFingerprint.current = booksFingerprint; return; }
    if (prevRecsFingerprint.current === booksFingerprint) return;
    prevRecsFingerprint.current = booksFingerprint;
    setIntentResults({});
    localStorage.removeItem("nairrative_recs");
    localStorage.removeItem("nairrative_recs_fp");
    (async () => {
      for (const id of AUTO_RECS) {
        await fetchIntentRecs(id);
        await new Promise(r => setTimeout(r, 8000));
      }
    })();
  }, [booksFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    intentInputs, setIntentInputs,
    intentResults, setIntentResults,
    intentLoading,
    fetchIntentRecs,
  };
}
