import { useState, useMemo, useRef, useEffect, useTransition, useDeferredValue } from "react";
import { supabase } from "./lib/supabase";
import G from "./constants/theme";
import { TABS } from "./constants/config";
import { buildBookContext } from "./lib/bookUtils";
import { useBooks } from "./hooks/useBooks";
import { useAnalysis } from "./hooks/useAnalysis";
import { useRecs } from "./hooks/useRecs";
import BookModal from "./components/BookModal";
import AnalysisTab from "./components/AnalysisTab";
import RecsTab from "./components/RecsTab";
import OverviewTab from "./components/OverviewTab";
import SeriesTab from "./components/SeriesTab";
import ChatTab from "./components/ChatTab";
import LibraryTab from "./components/LibraryTab";
import BookshelfTab from "./components/BookshelfTab";
import RatingFlashcard from "./components/RatingFlashcard";
import { CLAUDE_URL, AI_HEADERS } from "./lib/api";

const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${G.bg}; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: ${G.bg}; }
    ::-webkit-scrollbar-thumb { background: ${G.dimmed}; border-radius: 4px; }
    .tab-btn { cursor: pointer; padding: 6px 14px; border: none; border-radius: 0; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400; transition: color 0.15s; white-space: nowrap; color: #a0a8b4; background: transparent; letter-spacing: 0.2px; }
    .tab-btn:hover { color: ${G.text}; }
    .tab-btn.active { color: ${G.gold}; font-weight: 600; }
    .stat-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 20px 24px; transition: border-color 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .stat-card:hover { border-color: ${G.goldDim}; }
    .genre-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }
    .recharts-wrapper svg { overflow: visible !important; }
    .input-dark { background: ${G.card2}; border: 1px solid ${G.border}; border-radius: 8px; color: ${G.text}; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%; outline: none; transition: border-color 0.2s; }
    .input-dark:focus { border-color: ${G.goldDim}; }
    .btn-gold { background: ${G.gold}; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-gold:hover { background: ${G.goldLight}; }
    .btn-ghost { background: transparent; color: ${G.muted}; border: 1px solid ${G.border}; border-radius: 8px; padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .btn-ghost:hover { color: ${G.text}; border-color: ${G.dimmed}; }
    .rec-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 18px; transition: all 0.2s; }
    .rec-card:hover { border-color: ${G.goldDim}; transform: translateY(-1px); }
    .chat-input-wrap { display: flex; gap: 10px; }
    .lib-row { display: grid; grid-template-columns: 44px 2fr 150px 110px 90px 90px 50px 56px 56px 90px 32px; gap: 10px; padding: 9px 14px; border-bottom: 1px solid ${G.border}; align-items: center; transition: background 0.15s; }
    .cell-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lib-row:hover { background: ${G.card2}; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .modal-box { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 16px; width: 100%; max-width: 540px; max-height: 88vh; overflow: hidden; position: relative; }
    .modal-scroll { overflow-y: auto; max-height: 88vh; padding: 28px; }
    .modal-scroll::-webkit-scrollbar { width: 4px; } .modal-scroll::-webkit-scrollbar-track { background: transparent; } .modal-scroll::-webkit-scrollbar-thumb { background: ${G.dimmed}; border-radius: 4px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse { animation: pulse 1.5s infinite; }
    .burger-btn { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 4px; }
    .mini-brand { cursor: pointer; padding: 0; }
    .logo-collapse { overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease; }
    @media (max-width: 640px) {
      .tab-nav { display: none !important; }
      .burger-btn { display: flex !important; }
      .mini-brand { display: none !important; }
      .page-content { padding: 16px !important; }
      .header-logo { width: 250px !important; height: auto !important; }
      .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
      .chart-grid { grid-template-columns: 1fr !important; }
      .rec-grid { grid-template-columns: 1fr !important; }
      .analysis-grid { grid-template-columns: 1fr !important; }
      .lib-scroll-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .lib-inner { min-width: 1010px; }
      .lib-row { grid-template-columns: 44px 160px 140px 100px 80px 80px 48px 50px 50px 80px 32px; }
    }
  `;

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [, startTabTransition] = useTransition();
  const switchTab = (id) => startTabTransition(() => setActiveTab(id));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    books,
    genreList, genreMap,
    booksFingerprint,
    showBookModal, setShowBookModal,
    editingBook,
    bookDraft, setBookDraft,
    bookChatLoading,
    bookChatPending, setBookChatPending,
    bookSaving,
    bookMsg,
    newGenreInput, setNewGenreInput,
    newGenreOpen, setNewGenreOpen,
    newGenreSaving,
    bookChatInputRef,
    authorSuggestions,
    genreSuggestion,
    openAddModal,
    openEditModal,
    chatFillBook,
    applyPending,
    checkAuthorSuggestion,
    acceptAuthorSuggestion,
    dismissAuthorSuggestion,
    acceptGenreSuggestion,
    dismissGenreSuggestion,
    addGenre,
    saveBook,
    updateBookRating,
    deleteBook,
    lastAddedAt,
  } = useBooks({ session });

  const [showRatingMode, setShowRatingMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 70);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const {
    analysisAI,
    analysisAILoading,
    panelPrompts,
    editingPanel, setEditingPanel,
    viewingPanel, setViewingPanel,
    panelLoading,
    updatePanelPrompt,
    resetPanelPrompt,
    savePanelPromptsToSupabase,
    regeneratePanel,
  } = useAnalysis({ books, booksFingerprint, activeTab, lastAddedAt });

  const readTitlesString = useMemo(() =>
    books.slice(-200).map(b => b.title.toLowerCase().replace(/^(the|a|an) /i, "")).join("; "),
  [books]);

  const {
    intentInputs, setIntentInputs,
    intentResults, setIntentResults,
    intentLoading,
    fetchIntentRecs,
  } = useRecs({ books, booksFingerprint, activeTab, readTitlesString });

  const deferredBooks = useDeferredValue(books);

  const [search, setSearch] = useState("");
  const [libGenres, setLibGenres] = useState([]);
  const [libYears, setLibYears] = useState([]);
  const [libAuthors, setLibAuthors] = useState([]);
  const [libSort, setLibSort] = useState("title");
  const [chartRanges, setChartRanges] = useState({});
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I know your complete reading history. Ask me anything: your patterns, what to read next, your top authors, surprising stats, or anything else!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [seriesRecap, setSeriesRecap] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState("Wheel of Time");
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const login = async () => {
    setLoginLoading(true); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message);
    else { setShowLoginModal(false); setLoginEmail(""); setLoginPassword(""); }
    setLoginLoading(false);
  };

  const logout = async () => { await supabase.auth.signOut(); };

  useEffect(() => {
    if (!showLoginModal) return;
    const handler = (e) => { if (e.key === "Escape") { setShowLoginModal(false); setLoginError(""); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showLoginModal]);




  // ── COMPUTED DATA ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byYear = {}, byYearTracked = {}, byGenre = {}, byAuthor = {}, byCountry = {};
    deferredBooks.forEach(b => {
      byYear[b.year] = (byYear[b.year] || 0) + 1;
      if (b.year_read_start === b.year_read_end)
        byYearTracked[b.year] = (byYearTracked[b.year] || 0) + 1;
      (b.genre || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
      byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
      if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
    });
    const sortedAuthors = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]);
    const sortedGenres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]);
    const sortedYears = Object.entries(byYearTracked).sort((a, b) => b[1] - a[1]);
    const minYearStart = deferredBooks.length ? Math.min(...deferredBooks.map(b => b.year_read_start)) : 1998;
    const maxYearEnd = deferredBooks.length ? Math.max(...deferredBooks.map(b => b.year_read_end)) : new Date().getFullYear();
    const readingSpan = maxYearEnd - minYearStart + 1;
    return { total: deferredBooks.length, byYear, byYearTracked, byGenre, byAuthor, byCountry, sortedAuthors, sortedGenres, sortedYears, readingSpan };
  }, [deferredBooks]);


  const analysisInsights = useMemo(() => {
    // Temporal
    const years = Object.keys(stats.byYearTracked).map(Number).sort();
    const fullRange = Array.from({length: years[years.length-1] - years[0] + 1}, (_, i) => years[0] + i);
    const trackedBooks = deferredBooks.filter(b => b.year_read_start === b.year_read_end);
    const avgPerActive = Math.round(trackedBooks.length / years.length);
    let maxGap = 0, curGap = 0, gapStart = null, longestGapStart = null;
    for (const y of fullRange) {
      if (!stats.byYear[y]) { if (!curGap) gapStart = y; curGap++; if (curGap > maxGap) { maxGap = curGap; longestGapStart = gapStart; } }
      else curGap = 0;
    }

    // Genre & Form
    const fictionCount = deferredBooks.filter(b => b.fiction === true).length;
    const fictionPct = Math.round(fictionCount / deferredBooks.length * 100);
    const graphicNovels = deferredBooks.filter(b => (b.genre || []).includes("Graphic Novel")).length;
    const genreCount = Object.keys(stats.byGenre).length;
    const era = (s, e) => deferredBooks.filter(b => b.year >= s && b.year <= e);
    const topGenreIn = sub => Object.entries(sub.reduce((a, b) => { (b.genre||[]).forEach(g=>{a[g]=(a[g]||0)+1;}); return a; }, {})).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";
    const genreEra = [
      { era: "2010–14", top: topGenreIn(era(2010,2014)) },
      { era: "2015–19", top: topGenreIn(era(2015,2019)) },
      { era: "2020–24", top: topGenreIn(era(2020,2024)) },
      { era: "2025–26", top: topGenreIn(era(2025,2026)) },
    ];

    // Geographic
    const uniqueCountries = Object.keys(stats.byCountry).length;
    const topCountries = Object.entries(stats.byCountry).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const indiaPct = Math.round((stats.byCountry["India"]||0) / deferredBooks.length * 100);

    // Author behavior
    const authorEntries = Object.entries(stats.byAuthor);
    const loyal = authorEntries.filter(([,c])=>c>=5).sort((a,b)=>b[1]-a[1]);
    const sampledCount = authorEntries.filter(([,c])=>c===1).length;
    const booksFromLoyal = loyal.reduce((s,[,c])=>s+c,0);
    const loyaltyRatio = Math.round(booksFromLoyal / deferredBooks.length * 100);

    // Complexity — derived from genre tags only, no hardcoded authors
    const challengingCount = deferredBooks.filter(b => (b.genre||[]).some(g => ["Classic","Philosophy","Literary Fiction"].includes(g))).length;
    const challengePct = Math.round(challengingCount / deferredBooks.length * 100);
    const challengingAuthorsFromData = [...new Set(deferredBooks.filter(b => (b.genre||[]).some(g => ["Classic","Philosophy"].includes(g))).map(b => b.author))].slice(0, 8);

    // Series — derived from books with a series field set
    const seriesBooks = deferredBooks.filter(b => b.series && b.series.trim() !== "");
    const seriesCount = seriesBooks.length;
    const seriesPct = Math.round(seriesCount / deferredBooks.length * 100);

    // Mood mapping by era — derived from genre groupings
    const MOOD_GENRES = {
      "Dark & Tense":  ["Thriller", "Legal Thriller", "Medical Thriller", "Mystery", "Horror", "Dystopian", "Politics"],
      "Imaginative":   ["Fantasy", "Romantasy", "Science Fiction", "Historical Fiction", "Graphic Novel", "Mythology"],
      "Reflective":    ["Literary Fiction", "Classic", "Philosophy", "Spirituality", "Memoir", "Essays", "Poetry"],
      "Informative":   ["Biography", "Popular Science", "History", "Non-Fiction", "Economics", "Self-Help", "Environment", "Systems", "Sociology", "Psychology", "Business"],
    };
    const bookMood = b => { const g = b.genre || []; for (const [m, tags] of Object.entries(MOOD_GENRES)) { if (g.some(t => tags.includes(t))) return m; } return null; };
    const allBookYears = [...new Set(deferredBooks.map(b => b.year))].sort((a,b) => a-b);
    const minY = allBookYears[0] ?? 2011;
    const maxY = allBookYears[allBookYears.length - 1] ?? new Date().getFullYear();
    const span = maxY - minY;
    const eraBuckets = [
      { era: `${minY}–${minY + Math.floor(span*0.25)}`, s: minY, e: minY + Math.floor(span*0.25) },
      { era: `${minY + Math.floor(span*0.25)+1}–${minY + Math.floor(span*0.5)}`, s: minY + Math.floor(span*0.25)+1, e: minY + Math.floor(span*0.5) },
      { era: `${minY + Math.floor(span*0.5)+1}–${minY + Math.floor(span*0.75)}`, s: minY + Math.floor(span*0.5)+1, e: minY + Math.floor(span*0.75) },
      { era: `${minY + Math.floor(span*0.75)+1}–${maxY}`, s: minY + Math.floor(span*0.75)+1, e: maxY },
    ];
    const moodByEra = eraBuckets.map(({ era: e, s, e: end }) => {
      const sub = era(s, end).filter(b => bookMood(b));
      if (!sub.length) return null;
      const counts = {};
      sub.forEach(b => { const m = bookMood(b); counts[m] = (counts[m] || 0) + 1; });
      const dominant = Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];
      return { era: e, dominant, counts, total: sub.length };
    }).filter(Boolean);
    // Notable years — computed from actual volume, no hardcoded life events
    const yearCounts = Object.entries(stats.byYear).map(([y,c]) => ({ year: parseInt(y), count: c })).filter(y => y.year >= 2011).sort((a,b) => a.year - b.year);
    const yearAvg = yearCounts.reduce((s,y) => s+y.count, 0) / yearCounts.length;
    const notableYears = yearCounts.map(y => ({
      year: String(y.year),
      books: y.count,
      label: y.count >= yearAvg * 2 ? "Peak year" : y.count <= 3 ? "Low activity" : y.count > yearAvg * 1.3 ? "Active year" : y.count < yearAvg * 0.5 ? "Quiet year" : null,
    })).filter(y => y.label).sort((a,b) => b.books - a.books).slice(0, 5).sort((a,b) => a.year - b.year);

    // Discovery: top author concentrations from actual data
    const topAuthorChannels = loyal.slice(0, 4).map(([author, count]) => ({
      channel: author,
      example: `${count} books read`,
      color: G.gold,
    }));

    return {
      peakYear: stats.sortedYears[0], avgPerActive, maxGap, longestGapStart,
      fictionCount, nonFictionCount: deferredBooks.length - fictionCount, fictionPct, graphicNovels, genreCount, genreEra,
      uniqueCountries, topCountries, indiaPct,
      loyal, sampledCount, booksFromLoyal, loyaltyRatio,
      challengingCount, challengePct, challengingAuthorsFromData,
      seriesCount, seriesPct,
      fictionByEra: moodByEra, peakFictionEra: null, lowFictionEra: null,
      notableYears, topAuthorChannels,
    };
  }, [deferredBooks, stats]);

  const filteredBooks = useMemo(() =>
    books.filter(b => {
      if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false;
      if (libGenres.length > 0 && !(b.genre || []).some(g => libGenres.includes(g))) return false;
      if (libYears.length > 0 && !libYears.includes(String(b.year))) return false;
      if (libAuthors.length > 0 && !(b.authors || []).some(a => libAuthors.includes(a.name))) return false;
      return true;
    }).sort((a, b) => {
      if (libSort === "year") return b.year - a.year;
      if (libSort === "title") return a.title.localeCompare(b.title);
      if (libSort === "author") return a.author.localeCompare(b.author);
      if (libSort === "rating") {
        const order = ["transformative", "loved", "enjoyed", "meh", "dont_remember", "dropped", "didnt_like"];
        const ai = a.rating ? order.indexOf(a.rating) : 99;
        const bi = b.rating ? order.indexOf(b.rating) : 99;
        return ai !== bi ? ai - bi : a.title.localeCompare(b.title);
      }
      return 0;
    }), [books, search, libGenres, libYears, libAuthors, libSort]);

  const allGenres = genreList;
  const allYears = useMemo(() => Object.keys(stats.byYear).sort().reverse(), [stats]);
  const allAuthors = useMemo(() => [...new Set(books.flatMap(b => (b.authors || []).map(a => a.name)))].sort(), [books]);
  const allYearsList = useMemo(() => Object.keys(stats.byYearTracked).sort().map(Number), [stats]);

  const allYearsListFull = useMemo(() => Object.keys(stats.byYear).sort().map(Number), [stats]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const summary = buildBookContext(books);
      const fullList = books
        .map(b => `[${b.year}] "${b.title}" by ${b.author} | ${(b.genre||[]).join("/")}${b.pages ? " | " + b.pages + "pp" : ""}${b.series ? " | series: " + b.series : ""}${b.fiction !== undefined ? " | " + (b.fiction ? "fiction" : "non-fiction") : ""}${b.notes ? " | " + b.notes : ""}`)
        .join("\n");
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: AI_HEADERS,
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1200,
          system: `You are an insightful personal reading assistant with full access to the user's reading database. Use the data below to answer questions accurately and specifically.

IMPORTANT CONTEXT: Year 2010 is a collective placeholder for all books read between 1998 and 2010 — not a single-year anomaly. Do not treat it as unusual.

--- DATABASE SUMMARY ---
${summary}

--- FULL BOOK LIST (${books.length} books) ---
${fullList}

Answer primarily from the data, with specific references to books, authors, years, and patterns. For general knowledge questions about books or authors not requiring personal library data, you may use your broader knowledge — but never invent books the user has read.`,
          messages: updated.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || data.error?.message || "Sorry, try again." }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]); }
    finally { setChatLoading(false); }
  };


  const getChartRange = (id) => {
    const timeCharts = new Set(["yc", "fn", "ge"]);
    const defaultFrom = timeCharts.has(id) ? (allYearsList[0] ?? 2011) : (allYearsListFull[0] ?? 2010);
    const defaultTo = timeCharts.has(id) ? (allYearsList[allYearsList.length - 1] ?? 2026) : (allYearsListFull[allYearsListFull.length - 1] ?? 2026);
    return {
      from: chartRanges[id]?.from ?? defaultFrom,
      to: chartRanges[id]?.to ?? defaultTo,
    };
  };
  const setChartRange = (id, from, to) => setChartRanges(p => ({ ...p, [id]: { from, to } }));


  const generateSeriesRecap = async (seriesName) => {
    if (!seriesName || seriesLoading) return;
    setSeriesLoading(true);
    setSeriesRecap(null);
    const seriesBooks = books.filter(b => b.series === seriesName).sort((a, b) => (a.id - b.id));
    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: AI_HEADERS,
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 800,
          system: `You are a literary companion helping a reader catch up on a book series. Write engaging recaps — key characters, major plot turns, how each book ends. Keep each book recap to 2–3 sentences. Be concise.`,
          messages: [{ role: "user", content: `Please recap the "${seriesName}" series. The reader has read these books (in order): ${seriesBooks.map((b, i) => `${i+1}. ${b.title} (${b.year_read_end})`).join(", ")}. Give a short recap of each book and a "What to remember" section with the 3–5 most important things going into the next installment.` }]
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSeriesRecap({ series: seriesName, books: seriesBooks, text: data.content?.[0]?.text || data.error?.message || "Could not generate recap." });
    } catch (e) {
      console.error("generateSeriesRecap error:", e);
      setSeriesRecap({ series: seriesName, books: seriesBooks, text: `Error: ${e?.message || "Unknown error"}` });
    }
    finally { setSeriesLoading(false); }
  };





  // ── STYLES ────────────────────────────────────────────────────────────────
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${G.bg}; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: ${G.bg}; }
    ::-webkit-scrollbar-thumb { background: ${G.dimmed}; border-radius: 4px; }
    .tab-btn { cursor: pointer; padding: 6px 14px; border: none; border-radius: 0; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400; transition: color 0.15s; white-space: nowrap; color: #a0a8b4; background: transparent; letter-spacing: 0.2px; }
    .tab-btn:hover { color: ${G.text}; }
    .tab-btn.active { color: ${G.gold}; font-weight: 600; }
    .stat-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 20px 24px; transition: border-color 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .stat-card:hover { border-color: ${G.goldDim}; }
    .genre-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }
    .recharts-wrapper svg { overflow: visible !important; }
    .input-dark { background: ${G.card2}; border: 1px solid ${G.border}; border-radius: 8px; color: ${G.text}; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%; outline: none; transition: border-color 0.2s; }
    .input-dark:focus { border-color: ${G.goldDim}; }
    .btn-gold { background: ${G.gold}; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-gold:hover { background: ${G.goldLight}; }
    .btn-ghost { background: transparent; color: ${G.muted}; border: 1px solid ${G.border}; border-radius: 8px; padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .btn-ghost:hover { color: ${G.text}; border-color: ${G.dimmed}; }
    .rec-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 18px; transition: all 0.2s; }
    .rec-card:hover { border-color: ${G.goldDim}; transform: translateY(-1px); }
    .chat-input-wrap { display: flex; gap: 10px; }
    .lib-row { display: grid; grid-template-columns: 44px 2fr 150px 110px 90px 90px 50px 56px 56px 90px 32px; gap: 10px; padding: 9px 14px; border-bottom: 1px solid ${G.border}; align-items: center; transition: background 0.15s; }
    .cell-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lib-row:hover { background: ${G.card2}; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .modal-box { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 16px; width: 100%; max-width: 540px; max-height: 88vh; overflow: hidden; position: relative; }
    .modal-scroll { overflow-y: auto; max-height: 88vh; padding: 28px; }
    .modal-scroll::-webkit-scrollbar { width: 4px; } .modal-scroll::-webkit-scrollbar-track { background: transparent; } .modal-scroll::-webkit-scrollbar-thumb { background: ${G.dimmed}; border-radius: 4px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse { animation: pulse 1.5s infinite; }
    .burger-btn { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 4px; }
    .mini-brand { cursor: pointer; padding: 0; }
    .logo-collapse { overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease; }
    @media (max-width: 640px) {
      .tab-nav { display: none !important; }
      .burger-btn { display: flex !important; }
      .mini-brand { display: none !important; }
      .page-content { padding: 16px !important; }
      .header-logo { width: 250px !important; height: auto !important; }
      .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
      .chart-grid { grid-template-columns: 1fr !important; }
      .rec-grid { grid-template-columns: 1fr !important; }
      .analysis-grid { grid-template-columns: 1fr !important; }
      .lib-scroll-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .lib-inner { min-width: 1010px; }
      .lib-row { grid-template-columns: 44px 160px 140px 100px 80px 80px 48px 50px 50px 80px 32px; }
    }
  `;


  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* HEADER */}
      <div className="page-header" style={{
        position: "sticky", top: 0, zIndex: 100,
        background: G.bg,
        padding: "0 28px",
        borderBottom: `1px solid ${G.border}`,
      }}>
        {/* Nav bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
          {/* Logo */}
          <img src="/nairrative_transparent.svg" alt="Nairrative" className="mini-brand" onClick={() => switchTab("overview")} style={{ height: 36, width: "auto", flexShrink: 0 }} />

          {/* Tabs */}
          <div className="tab-nav" style={{ flex: 1, overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 4, width: "fit-content", margin: "0 auto" }}>
              {TABS.map(t => (
                <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => switchTab(t.id)}>
                  <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Burger — mobile only */}
          <button className="burger-btn" onClick={() => setMobileMenuOpen(o => !o)}
            title="Menu" style={{ color: G.muted }}>
            <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
            <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
            <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
          </button>

          {/* Lock */}
          <button onClick={() => session ? logout() : setShowLoginModal(true)}
            title={session ? "Sign out" : "Sign in"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 1, color: session ? G.gold : G.dimmed, flexShrink: 0 }}>
            {session
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            }
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, background: G.card, borderBottom: `1px solid ${G.border}`, padding: "8px 16px 12px" }}>
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => { switchTab(t.id); setMobileMenuOpen(false); }}>
                <span style={{ marginRight: 8 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="fade-in page-content" style={{ padding: "24px 28px" }}>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <OverviewTab
            books={books}
            stats={stats}
            genreMap={genreMap}
            allYearsList={allYearsList}
            allYearsListFull={allYearsListFull}
            chartRanges={chartRanges}
            getChartRange={getChartRange}
            setChartRange={setChartRange}
            openEditModal={openEditModal}
            session={session}
          />
        )}

        {/* ── ANALYSIS ─────────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <AnalysisTab
            books={books}
            stats={stats}
            analysisInsights={analysisInsights}
            genreMap={genreMap}
            session={session}
            analysisAI={analysisAI}
            analysisAILoading={analysisAILoading}
            panelPrompts={panelPrompts}
            editingPanel={editingPanel}
            setEditingPanel={setEditingPanel}
            viewingPanel={viewingPanel}
            setViewingPanel={setViewingPanel}
            panelLoading={panelLoading}
            updatePanelPrompt={updatePanelPrompt}
            resetPanelPrompt={resetPanelPrompt}
            savePanelPromptsToSupabase={savePanelPromptsToSupabase}
            regeneratePanel={regeneratePanel}
          />
        )}

        {/* ── LIBRARY ────────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <LibraryTab
            books={books}
            session={session}
            genreMap={genreMap}
            filteredBooks={filteredBooks}
            search={search} setSearch={setSearch}
            libGenres={libGenres} setLibGenres={setLibGenres}
            libYears={libYears} setLibYears={setLibYears}
            libAuthors={libAuthors} setLibAuthors={setLibAuthors}
            libSort={libSort} setLibSort={setLibSort}
            allGenres={allGenres} allYears={allYears} allAuthors={allAuthors}
            openAddModal={openAddModal}
            openEditModal={openEditModal}
            openRatingMode={() => setShowRatingMode(true)}
          />
        )}

        {/* ── RATING FLASHCARD ──────────────────────────────────────────── */}
        {showRatingMode && (
          <RatingFlashcard
            books={books}
            updateBookRating={updateBookRating}
            onClose={() => setShowRatingMode(false)}
          />
        )}

        {/* ── BOOK MODAL (Add / Edit) ─────────────────────────────────────── */}
        {showBookModal && (
          <BookModal
            editingBook={editingBook}
            bookDraft={bookDraft}
            setBookDraft={setBookDraft}
            bookChatInputRef={bookChatInputRef}
            bookChatLoading={bookChatLoading}
            bookChatPending={bookChatPending}
            bookSaving={bookSaving}
            bookMsg={bookMsg}
            newGenreInput={newGenreInput}
            setNewGenreInput={setNewGenreInput}
            newGenreOpen={newGenreOpen}
            setNewGenreOpen={setNewGenreOpen}
            newGenreSaving={newGenreSaving}
            genreList={genreList}
            chatFillBook={chatFillBook}
            applyPending={applyPending}
            setBookChatPending={setBookChatPending}
            addGenre={addGenre}
            saveBook={saveBook}
            deleteBook={deleteBook}
            onClose={() => setShowBookModal(false)}
            authorSuggestions={authorSuggestions}
            checkAuthorSuggestion={checkAuthorSuggestion}
            acceptAuthorSuggestion={acceptAuthorSuggestion}
            dismissAuthorSuggestion={dismissAuthorSuggestion}
            genreSuggestion={genreSuggestion}
            acceptGenreSuggestion={acceptGenreSuggestion}
            dismissGenreSuggestion={dismissGenreSuggestion}
          />
        )}

        {/* ── BOOKSHELF ─────────────────────────────────────────────────── */}
        {activeTab === "bookshelf" && (
          <BookshelfTab
            books={books}
            genreMap={genreMap}
            openEditModal={openEditModal}
            session={session}
          />
        )}

        {/* ── RECOMMENDATIONS ────────────────────────────────────────────── */}
        {activeTab === "recs" && (
          <RecsTab
            books={books}
            genreList={genreList}
            session={session}
            intentInputs={intentInputs}
            setIntentInputs={setIntentInputs}
            intentResults={intentResults}
            setIntentResults={setIntentResults}
            intentLoading={intentLoading}
            fetchIntentRecs={fetchIntentRecs}
          />
        )}

        {/* ── SERIES RECAP ──────────────────────────────────────────────── */}
        {activeTab === "series" && (
          <SeriesTab
            books={books}
            session={session}
            selectedSeries={selectedSeries}
            setSelectedSeries={setSelectedSeries}
            seriesRecap={seriesRecap}
            setSeriesRecap={setSeriesRecap}
            seriesLoading={seriesLoading}
            generateSeriesRecap={generateSeriesRecap}
          />
        )}

        {/* ── CHAT ──────────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <ChatTab
            session={session}
            messages={messages}
            chatLoading={chatLoading}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatEndRef={chatEndRef}
            sendChat={sendChat}
          />
        )}
      </div>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowLoginModal(false); setLoginError(""); } }}>
          <div className="modal-box" style={{ maxWidth: 360 }}>
          <div className="modal-scroll">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text }}>Sign In</div>
              <button onClick={() => { setShowLoginModal(false); setLoginError(""); }} style={{ background: "none", border: "none", color: G.muted, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <form style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={e => { e.preventDefault(); login(); }}>
              <input className="input-dark" type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} autoFocus autoComplete="email" />
              <input className="input-dark" type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} autoComplete="current-password" />
              {loginError && <div style={{ color: G.red, fontSize: 12 }}>{loginError}</div>}
              <button type="submit" className="btn-gold" disabled={loginLoading}>{loginLoading ? "Signing in…" : "Sign In"}</button>
            </form>
          </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ padding: "16px 28px", marginTop: 24, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: G.dimmed }}>© {new Date().getFullYear()} Viswas Nair · All rights reserved</div>
      </div>
    </div>
  );
}