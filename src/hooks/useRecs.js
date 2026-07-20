import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { buildBookContext, toRow } from "../lib/bookUtils";
import { SEED_RECS } from "../constants/seeds";
import { AUTO_RECS } from "../constants/config";
import { AI_MODELS } from "../lib/aiClient";
import { LLM_URL, claudeHeaders, INTER_REQUEST_DELAY_MS } from "../lib/api";
import { loadCachedData, saveCachedData } from "../lib/aiCache";
import { buildLensPrompts } from "../lib/recsPrompts";

const LS_DATA = "nairrative_recs";
const LS_FP   = "nairrative_recs_fp";
const TABLE   = "recs_cache";

// Filters already-read books and deduplicates across panels for cached rec data.
// First panel claiming a title wins; subsequent panels with the same title are dropped.
function normalizeCachedRecs(data, books) {
  const readTitles = new Set(books.map(b => b.title?.toLowerCase()).filter(Boolean));

  const filtered = {};
  for (const [id, arr] of Object.entries(data)) {
    if (!Array.isArray(arr) || !arr.length) continue;
    const clean = arr.filter(r => r?.title && !readTitles.has(r.title.toLowerCase()));
    if (clean.length) filtered[id] = clean;
  }

  const seen = new Set();
  const result = {};
  for (const [id, arr] of Object.entries(filtered)) {
    const key = arr[0]?.title?.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      result[id] = arr;
    }
  }
  return result;
}

export function useRecs({ books, booksFingerprint, activeTab, readTitlesString }) {
  const intentAbortRef = useRef({});
  useEffect(() => {
    const refs = intentAbortRef.current;
    return () => Object.values(refs).forEach(c => c.abort());
  }, []);

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
  const allocatedTitlesRef = useRef({});

  // Load recs from cache on tab switch or when books first load.
  // booksFingerprint already changes whenever books changes, so books is not a dep.
  useEffect(() => {
    if (activeTab !== "recs") return;
    if (!booksFingerprint) { setIntentResults(SEED_RECS); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const cached = await loadCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, session });
      if (cached) {
        const safe = normalizeCachedRecs(cached, books);
        allocatedTitlesRef.current = {};
        for (const [id, arr] of Object.entries(safe)) {
          const r = arr[0];
          if (r?.title) allocatedTitlesRef.current[id] = { title: r.title, author: r.author || "" };
        }
        setIntentResults({ ...SEED_RECS, ...safe });
      } else {
        setIntentResults(SEED_RECS);
      }
    });
  }, [activeTab, booksFingerprint]);

  const saveRecs = async (data) => {
    const { data: { session } } = await supabase.auth.getSession();
    await saveCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, data, session });
  };

  const fetchIntentRecs = async (intentId, input = "") => {
    if (intentLoading[intentId]) return;
    intentAbortRef.current[intentId]?.abort();
    const controller = new AbortController();
    intentAbortRef.current[intentId] = controller;

    setIntentLoading(p => ({ ...p, [intentId]: true }));
    const rc = (refreshCounts[intentId] || 0) + 1;
    setRefreshCounts(p => ({ ...p, [intentId]: rc }));
    delete allocatedTitlesRef.current[intentId];

    const lastBook = books[books.length - 1];
    const lastAuthor = lastBook?.author || "Brandon Sanderson";
    const seriesList = [...new Set(books.filter(b => b.series?.trim()).map(b => b.series))];
    const randomSeries = seriesList[Math.floor(Math.random() * seriesList.length)] || "Wheel of Time";
    const today = new Date().toISOString().slice(0, 10);
    const variationNote = rc > 1 ? ` This is refresh #${rc} — you MUST pick a completely different book from any prior recommendation for this lens.` : "";
    const prompts = buildLensPrompts({ lastBook, lastAuthor, randomSeries, today, input, variationNote });

    const attemptFetch = async (extraExclusions = []) => {
      const otherPanelTitles = Object.entries(allocatedTitlesRef.current)
        .filter(([id]) => id !== intentId)
        .map(([, { title, author }]) => `"${title}" by ${author}`);
      const allExclusions = [...otherPanelTitles, ...extraExclusions];
      const crossPanelNote = allExclusions.length > 0
        ? `\nDo NOT recommend these books (already picked in other panels or previously rejected): ${allExclusions.join("; ")}.\n`
        : "";
      const useWebSearch = intentId === "trending" || intentId === "pair";
      const fullList = books.map(toRow).join("\n");
      const body = {
        model: AI_MODELS.fast, max_tokens: 400,
        system: `You are a precise book recommendation engine. Today is ${today}. Reader history:\n${buildBookContext(books)}\n\nFULL BOOK LIST (${books.length} books):\n${fullList}\n\nDo NOT recommend any of these already-read titles: ${readTitlesString}.${crossPanelNote}\nOnly recommend unread books published up to ${today}.\n\n${prompts[intentId] || input}\n\nReturn ONLY a JSON array — no markdown, no explanation. Exactly 1 item. Format: [{"title": "...", "author": "...", "year": 2024, "reason": "1-2 sentences why it fits this reader"}].`,
        messages: [{ role: "user", content: "JSON array only." }],
      };
      if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }];
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(LLM_URL, { method: "POST", headers: claudeHeaders(session), body: JSON.stringify(body), signal: controller.signal });
      const data = await res.json();
      if (data.error) { console.error("claude api error:", data.error); throw new Error("api_error"); }
      const txt = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      const m = txt.match(/\[[\s\S]*?\]/);
      return m ? JSON.parse(m[0]) : JSON.parse(txt.replace(/```json|```/g, "").trim());
    };

    const readTitles = new Set(books.map(b => b.title?.toLowerCase()).filter(Boolean));
    const isAlreadyRead = (title) => !!title && readTitles.has(title.toLowerCase());

    const isAllocatedElsewhere = (title) =>
      !!title && Object.entries(allocatedTitlesRef.current)
        .some(([id, { title: t }]) => id !== intentId && t?.toLowerCase() === title.toLowerCase());

    try {
      let parsed = await attemptFetch();
      if (controller.signal.aborted) return;
      let pick = parsed[0];
      const extraExclusions = [];

      // Retry up to 3 times if the AI returns a book the user already read or another panel claimed.
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!pick?.title || (!isAlreadyRead(pick.title) && !isAllocatedElsewhere(pick.title))) break;
        extraExclusions.push(`"${pick.title}" by ${pick.author}`);
        parsed = await attemptFetch(extraExclusions);
        if (controller.signal.aborted) return;
        pick = parsed[0];
      }

      // Hard enforcement: never store a book the user has already read.
      if (pick?.title && isAlreadyRead(pick.title)) {
        setIntentResults(p => {
          const updated = { ...p, [intentId]: [{ title: "No unread match found", author: "", reason: "All suggestions were already in your library. Try refreshing for a different pick." }] };
          saveRecs(updated);
          return updated;
        });
        setIntentLoading(p => { const n = { ...p }; delete n[intentId]; return n; });
        return;
      }

      if (pick?.title) {
        allocatedTitlesRef.current[intentId] = { title: pick.title, author: pick.author || "" };
      }
      setIntentResults(prev => {
        const updated = { ...prev, [intentId]: Array.isArray(parsed) ? parsed.slice(0, 1) : [] };
        saveRecs(updated);
        return updated;
      });
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error("fetchIntentRecs error:", e);
      setIntentResults(p => ({ ...p, [intentId]: [{ title: "Could not load", author: "", reason: "Recommendation unavailable. Please try again." }] }));
    }
    setIntentLoading(p => { const n = { ...p }; delete n[intentId]; return n; });
  };

  // Regenerate auto recs when books change (skip initial load).
  // fetchIntentRecs is intentionally excluded: including it would cause this effect
  // to re-register on every render since it's recreated each time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!booksFingerprint) return;
    if (prevRecsFingerprint.current === null) { prevRecsFingerprint.current = booksFingerprint; return; }
    if (prevRecsFingerprint.current === booksFingerprint) return;
    prevRecsFingerprint.current = booksFingerprint;
    allocatedTitlesRef.current = {};
    setIntentResults({});
    localStorage.removeItem(LS_DATA);
    localStorage.removeItem(LS_FP);
    (async () => {
      for (const id of AUTO_RECS) {
        await fetchIntentRecs(id);
        await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
      }
    })();
  }, [booksFingerprint]);

  return {
    intentInputs, setIntentInputs,
    intentResults, setIntentResults,
    intentLoading,
    fetchIntentRecs,
  };
}
