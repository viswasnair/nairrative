import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { buildBookContext, toRow } from "../lib/bookUtils";
import { SEED_RECS } from "../constants/seeds";
import { AUTO_RECS, DEFAULT_MODELS } from "../constants/config";
import { LLM_URL, claudeHeaders, INTER_REQUEST_DELAY_MS } from "../lib/api";
import { loadCachedData, saveCachedData } from "../lib/aiCache";
import { buildLensPrompts } from "../lib/recsPrompts";

const LS_DATA = "nairrative_recs";
const LS_FP   = "nairrative_recs_fp";
const TABLE   = "recs_cache";

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
  const allocatedTitlesRef = useRef({});

  // Load recs from cache on tab switch or when books first load
  useEffect(() => {
    if (activeTab !== "recs") return;
    if (!books.length) { setIntentResults(SEED_RECS); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const cached = await loadCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, session });
      setIntentResults(cached ? { ...SEED_RECS, ...cached } : SEED_RECS);
    });
  }, [activeTab, booksFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveRecs = async (data) => {
    const { data: { session } } = await supabase.auth.getSession();
    await saveCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, data, session });
  };

  const fetchIntentRecs = async (intentId, input = "") => {
    if (intentLoading[intentId]) return;
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
        model: DEFAULT_MODELS.fast, max_tokens: 400,
        system: `You are a precise book recommendation engine. Today is ${today}. Reader history:\n${buildBookContext(books)}\n\nFULL BOOK LIST (${books.length} books):\n${fullList}\n\nDo NOT recommend any of these already-read titles: ${readTitlesString}.${crossPanelNote}\nOnly recommend unread books published up to ${today}.\n\n${prompts[intentId] || input}\n\nReturn ONLY a JSON array — no markdown, no explanation. Exactly 1 item. Format: [{"title": "...", "author": "...", "year": 2024, "reason": "1-2 sentences why it fits this reader"}].`,
        messages: [{ role: "user", content: "JSON array only." }],
      };
      if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }];
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(LLM_URL, { method: "POST", headers: claudeHeaders(session), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) { console.error("claude api error:", data.error); throw new Error("api_error"); }
      const txt = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      const m = txt.match(/\[[\s\S]*?\]/);
      return m ? JSON.parse(m[0]) : JSON.parse(txt.replace(/```json|```/g, "").trim());
    };

    const isAlreadyRead = (title) =>
      !!title && books.some(b => b.title?.toLowerCase() === title.toLowerCase());

    const isAllocatedElsewhere = (title) =>
      !!title && Object.entries(allocatedTitlesRef.current)
        .some(([id, { title: t }]) => id !== intentId && t?.toLowerCase() === title.toLowerCase());

    try {
      let parsed = await attemptFetch();
      const pick = parsed[0];
      if (pick?.title && (isAlreadyRead(pick.title) || isAllocatedElsewhere(pick.title))) {
        parsed = await attemptFetch([`"${pick.title}" by ${pick.author}`]);
      }
      if (parsed[0]?.title) {
        allocatedTitlesRef.current[intentId] = { title: parsed[0].title, author: parsed[0].author || "" };
      }
      setIntentResults(prev => {
        const updated = { ...prev, [intentId]: Array.isArray(parsed) ? parsed.slice(0, 1) : [] };
        saveRecs(updated);
        return updated;
      });
    } catch (e) {
      console.error("fetchIntentRecs error:", e);
      setIntentResults(p => ({ ...p, [intentId]: [{ title: "Could not load", author: "", reason: "Recommendation unavailable. Please try again." }] }));
    }
    setIntentLoading(p => { const n = { ...p }; delete n[intentId]; return n; });
  };

  // Regenerate auto recs when books change (skip initial load)
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
  }, [booksFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    intentInputs, setIntentInputs,
    intentResults, setIntentResults,
    intentLoading,
    fetchIntentRecs,
  };
}
