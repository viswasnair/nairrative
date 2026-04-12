import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, Legend, LabelList,
  PieChart, Pie, LineChart, Line
} from "recharts";
import G from "./constants/theme";
import { READING_CONTEXT, TABS, INPUT_DEFAULTS } from "./constants/config";
import { buildBookContext, downloadCSV, downloadJSON } from "./lib/bookUtils";
import MultiSelect from "./components/MultiSelect";
import RangeFilter from "./components/RangeFilter";
import DarkTooltip from "./components/DarkTooltip";
import { useBooks } from "./hooks/useBooks";
import { useAnalysis } from "./hooks/useAnalysis";
import { useRecs } from "./hooks/useRecs";
import BookModal from "./components/BookModal";
import AnalysisTab from "./components/AnalysisTab";
import RecsTab from "./components/RecsTab";

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
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
    openAddModal,
    openEditModal,
    chatFillBook,
    applyPending,
    addGenre,
    saveBook,
    deleteBook,
    lastAddedAt,
  } = useBooks({ session });

  const {
    analysisAI,
    analysisAILoading,
    panelPrompts,
    editingPanel, setEditingPanel,
    viewingPanel, setViewingPanel,
    panelLoading,
    fetchAnalysisAI,
    updatePanelPrompt,
    savePanelPromptsToSupabase,
    regeneratePanel,
  } = useAnalysis({ books, booksFingerprint, activeTab, lastAddedAt });

  const {
    intentInputs, setIntentInputs,
    intentResults, setIntentResults,
    intentLoading,
    fetchIntentRecs,
  } = useRecs({ books, booksFingerprint, activeTab, readTitlesString });

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
  const [analysisChat, setAnalysisChat] = useState([]);
  const [analysisChatInput, setAnalysisChatInput] = useState("");
  const [analysisChatLoading, setAnalysisChatLoading] = useState(false);
  const apiKey = true; // key lives server-side via Netlify function
  const [seriesRecap, setSeriesRecap] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState("Wheel of Time");
  const chatEndRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:wght@300;400;600&family=Lora:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Fraunces:ital,wght@0,300;1,300&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

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




  // ── COMPUTED DATA ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byYear = {}, byYearTracked = {}, byGenre = {}, byAuthor = {}, byCountry = {};
    books.forEach(b => {
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
    const minYearStart = books.length ? Math.min(...books.map(b => b.year_read_start)) : 1998;
    const maxYearEnd = books.length ? Math.max(...books.map(b => b.year_read_end)) : new Date().getFullYear();
    const readingSpan = maxYearEnd - minYearStart + 1;
    return { total: books.length, byYear, byYearTracked, byGenre, byAuthor, byCountry, sortedAuthors, sortedGenres, sortedYears, readingSpan };
  }, [books]);


  const analysisInsights = useMemo(() => {
    // Temporal
    const years = Object.keys(stats.byYearTracked).map(Number).sort();
    const fullRange = Array.from({length: years[years.length-1] - years[0] + 1}, (_, i) => years[0] + i);
    const trackedBooks = books.filter(b => b.year_read_start === b.year_read_end);
    const avgPerActive = Math.round(trackedBooks.length / years.length);
    let maxGap = 0, curGap = 0, gapStart = null, longestGapStart = null;
    for (const y of fullRange) {
      if (!stats.byYear[y]) { if (!curGap) gapStart = y; curGap++; if (curGap > maxGap) { maxGap = curGap; longestGapStart = gapStart; } }
      else curGap = 0;
    }

    // Genre & Form
    const fictionCount = books.filter(b => b.fiction === true).length;
    const fictionPct = Math.round(fictionCount / books.length * 100);
    const graphicNovels = books.filter(b => (b.genre || []).includes("Graphic Novel")).length;
    const genreCount = Object.keys(stats.byGenre).length;
    const era = (s, e) => books.filter(b => b.year >= s && b.year <= e);
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
    const indiaPct = Math.round((stats.byCountry["India"]||0) / books.length * 100);

    // Author behavior
    const authorEntries = Object.entries(stats.byAuthor);
    const loyal = authorEntries.filter(([,c])=>c>=5).sort((a,b)=>b[1]-a[1]);
    const sampledCount = authorEntries.filter(([,c])=>c===1).length;
    const booksFromLoyal = loyal.reduce((s,[,c])=>s+c,0);
    const loyaltyRatio = Math.round(booksFromLoyal / books.length * 100);

    // Complexity — derived from genre tags only, no hardcoded authors
    const challengingCount = books.filter(b => (b.genre||[]).some(g => ["Classic","Philosophy","Literary Fiction"].includes(g))).length;
    const challengePct = Math.round(challengingCount / books.length * 100);
    const challengingAuthorsFromData = [...new Set(books.filter(b => (b.genre||[]).some(g => ["Classic","Philosophy"].includes(g))).map(b => b.author))].slice(0, 8);

    // Series — derived from books with a series field set
    const seriesBooks = books.filter(b => b.series && b.series.trim() !== "");
    const seriesCount = seriesBooks.length;
    const seriesPct = Math.round(seriesCount / books.length * 100);

    // Mood mapping by era — derived from genre groupings
    const MOOD_GENRES = {
      "Dark & Tense":  ["Thriller", "Legal Thriller", "Medical Thriller", "Mystery", "Horror", "Dystopian", "Politics"],
      "Imaginative":   ["Fantasy", "Romantasy", "Science Fiction", "Historical Fiction", "Graphic Novel", "Mythology"],
      "Reflective":    ["Literary Fiction", "Classic", "Philosophy", "Spirituality", "Memoir", "Essays", "Poetry"],
      "Informative":   ["Biography", "Popular Science", "History", "Non-Fiction", "Economics", "Self-Help", "Environment", "Systems", "Sociology", "Psychology", "Business"],
    };
    const MOOD_COLORS = { "Dark & Tense": "#e06c75", "Imaginative": "#4a9eff", "Reflective": "#c3a6ff", "Informative": "#ffd166" };
    const bookMood = b => { const g = b.genre || []; for (const [m, tags] of Object.entries(MOOD_GENRES)) { if (g.some(t => tags.includes(t))) return m; } return null; };
    const allBookYears = [...new Set(books.map(b => b.year))].sort((a,b) => a-b);
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
    const fictionByEra = moodByEra; const peakFictionEra = null; const lowFictionEra = null;

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
      fictionCount, nonFictionCount: books.length - fictionCount, fictionPct, graphicNovels, genreCount, genreEra,
      uniqueCountries, topCountries, indiaPct,
      loyal, sampledCount, booksFromLoyal, loyaltyRatio,
      challengingCount, challengePct, challengingAuthorsFromData,
      seriesCount, seriesPct,
      fictionByEra: moodByEra, peakFictionEra: null, lowFictionEra: null,
      notableYears, topAuthorChannels,
    };
  }, [books, stats]);

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
      return 0;
    }), [books, search, libGenres, libYears, libAuthors, libSort]);

  const allGenres = genreList;
  const allYears = useMemo(() => Object.keys(stats.byYear).sort().reverse(), [stats]);
  const allAuthors = useMemo(() => [...new Set(books.flatMap(b => (b.authors || []).map(a => a.name)))].sort(), [books]);
  const allYearsList = useMemo(() => Object.keys(stats.byYearTracked).sort().map(Number), [stats]);

  const allYearsListFull = useMemo(() => Object.keys(stats.byYear).sort().map(Number), [stats]);

  const readTitlesString = useMemo(() =>
    books.slice(-200).map(b => b.title.toLowerCase().replace(/^(the|a|an) /i, "")).join("; "),
  [books]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const aiHeaders = () => ({
    "Content-Type": "application/json",
  });
  const CLAUDE_URL = "/api/claude";

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
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1200,
          system: `You are an insightful personal reading assistant with full access to the user's reading database. Use the data below to answer questions accurately and specifically.

IMPORTANT CONTEXT: Year 2010 is a collective placeholder for all books read between 1998 and 2010 — not a single-year anomaly. Do not treat it as unusual.

--- DATABASE SUMMARY ---
${summary}

--- FULL BOOK LIST (${books.length} books) ---
${fullList}

Answer with specific references to books, authors, years, and patterns from the data. Be conversational, direct, and accurate. Never invent books or facts not present in the database.`,
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
        method: "POST", headers: aiHeaders(),
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
    .tab-btn { cursor: pointer; padding: 8px 18px; border-radius: 6px; border: 1px solid ${G.goldDim}; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; transition: all 0.2s; white-space: nowrap; color: ${G.goldDim}; background: transparent; }
    .tab-btn:hover { color: ${G.gold}; border-color: ${G.gold}; }
    .tab-btn.active { background: ${G.gold}; border-color: ${G.gold}; color: #ffffff; font-weight: 600; }
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
    .lib-row { display: grid; grid-template-columns: 2fr 150px 110px 90px 90px 50px 56px 56px 32px; gap: 10px; padding: 9px 14px; border-bottom: 1px solid ${G.border}; align-items: center; transition: background 0.15s; }
    .cell-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lib-row:hover { background: ${G.card2}; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .modal-box { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 16px; width: 100%; max-width: 540px; max-height: 88vh; overflow-y: auto; padding: 28px; position: relative; }
    .modal-box::-webkit-scrollbar { width: 4px; } .modal-box::-webkit-scrollbar-track { background: transparent; } .modal-box::-webkit-scrollbar-thumb { background: ${G.dimmed}; border-radius: 4px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse { animation: pulse 1.5s infinite; }
    .burger-btn { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 4px; }
    @media (max-width: 640px) {
      .tab-nav { display: none !important; }
      .burger-btn { display: flex !important; }
      .page-header { padding: 16px 16px 0 !important; }
      .page-content { padding: 16px !important; }
      .header-logo { width: 250px !important; height: auto !important; }
      .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
      .chart-grid { grid-template-columns: 1fr !important; }
      .rec-grid { grid-template-columns: 1fr !important; }
      .analysis-grid { grid-template-columns: 1fr !important; }
      .lib-scroll-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .lib-inner { min-width: 860px; }
      .lib-row { grid-template-columns: 160px 140px 100px 80px 80px 48px 50px 50px 32px; }
    }
  `;


  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* HEADER */}
      <div className="page-header" style={{ padding: "28px 28px 0", background: G.bg }}>
        {/* Logo row */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16, position: "relative" }}>
          <img src="/nairrative.png" alt="Nairrative" className="header-logo" style={{ width: 398, height: 113, mixBlendMode: "multiply" }} />
          <div style={{ position: "absolute", right: 0, top: 0, display: "flex", alignItems: "center", gap: 8 }}>
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
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 1, color: session ? G.gold : G.dimmed }}>
              {session
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Desktop tab bar */}
        <div className="tab-nav" style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 4, width: "fit-content", margin: "0 auto" }}>
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}>
                <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, background: G.card, borderBottom: `1px solid ${G.border}`, padding: "8px 16px 12px", marginTop: 8 }}>
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => { setActiveTab(t.id); setMobileMenuOpen(false); }}>
                <span style={{ marginRight: 8 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="fade-in page-content" style={{ padding: "24px 28px" }}>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (() => {
          const cb = id => { const r = getChartRange(id); return books.filter(b => b.year >= r.from && b.year <= r.to); };

          const ycBooks = cb("yc");
          const ycData = Object.entries(ycBooks.reduce((a,b)=>{a[b.year]=(a[b.year]||0)+1;return a;},{})).sort((a,b)=>Number(a[0])-Number(b[0])).map(([year,count])=>({year,count}));
          const ycMax = Math.max(...ycData.map(d=>d.count),1);

          const gcBooks = cb("gc");
          const gcData = Object.entries(gcBooks.reduce((a,b)=>{(b.genre||[]).forEach(g=>{a[g]=(a[g]||0)+1;});return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([genre,count])=>({genre,count}));

          const fnBooks = cb("fn");
          const fnYrs = [...new Set(fnBooks.map(b=>b.year))].sort();
          const fnData = fnYrs.map(year=>{const yb=fnBooks.filter(b=>b.year===year);return{year,Fiction:yb.filter(b=>b.fiction).length,"Non-Fiction":yb.filter(b=>b.fiction===false).length};});

          const geBooks = cb("ge");
          const geYrs = [...new Set(geBooks.map(b=>b.year))].sort();
          const geCount = geBooks.reduce((a,b)=>{(b.genre||[]).forEach(g=>{a[g]=(a[g]||0)+1;});return a;},{});
          const geTop5 = Object.entries(geCount).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([g])=>g);
          const geData = geYrs.map(year=>{const e={year};geTop5.forEach(g=>{e[g]=geBooks.filter(b=>b.year===year&&(b.genre||[]).includes(g)).length;});return e;});

          const acBooks = cb("ac");
          const acData = Object.entries(acBooks.reduce((a,b)=>{a[b.author]=(a[b.author]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([author,count])=>({author,count}));

          const coBooks = cb("co");
          const coData = Object.entries(coBooks.filter(b=>b.country).reduce((a,b)=>{a[b.country]=(a[b.country]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([country,count])=>({country,count}));

          const alBooks = cb("al");
          const alYrs = [...new Set(alBooks.filter(b=>b.pages&&b.year>2010).map(b=>b.year))].sort();
          const alData = alYrs.map(year => { const yb = alBooks.filter(b=>b.year===year&&b.pages); return yb.length ? { year, avg: Math.round(yb.reduce((s,b)=>s+b.pages,0)/yb.length) } : null; }).filter(Boolean);

          const fmBooks = cb("fm");
          const fmCounts = fmBooks.reduce((a,b)=>{ const f=b.format||"Unknown"; a[f]=(a[f]||0)+1; return a; },{});
          const FORMAT_COLORS = { "Novel": "#2d6a4f", "Graphic Novel": "#06d6a0", "Non-Fiction": "#4a9eff", "Novella": "#c9a84c", "Short Stories": "#e06c75", "Play": "#c3a6ff", "Unknown": "#b2bec3" };
          const fmData = Object.entries(fmCounts).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value,color:FORMAT_COLORS[name]||G.muted}));

          const truncTick = (maxChars) => ({ x, y, payload, index }) => {
            if (index % 2 !== 0) return null;
            const full = String(payload.value);
            const label = full.length > maxChars ? full.slice(0, maxChars - 2) + '..' : full;
            return (
              <g>
                {label !== full && <title>{full}</title>}
                <text x={x} y={y} dy={4} textAnchor="end" fill={G.text} fontSize={10}>{label}</text>
              </g>
            );
          };

          const timeChartIds = new Set(["yc", "fn", "ge", "al"]);
          const chartCard = (title, id, children) => (
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "18px 20px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text }}>{title}</div>
                <RangeFilter chartId={id} allYears={timeChartIds.has(id) ? allYearsList : allYearsListFull} ranges={chartRanges} onSet={setChartRange} />
              </div>
              {children}
            </div>
          );

          return (
          <div>
            {/* Stat Cards */}
            <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Books Read", value: stats.total, color: "#d97706" },
                { label: "Authors Read", value: new Set(books.map(b => b.author)).size, color: "#db2777" },
                { label: "Books / Year", value: (() => { const activeYears = Object.keys(stats.byYearTracked).filter(y => Number(y) > 2010).length; return activeYears ? Math.round(books.filter(b => b.year > 2010).length / activeYears) : "—"; })(), color: "#0e9488" },
                { label: "Pages / Book", value: (() => { const withPages = books.filter(b => b.pages); return withPages.length ? Math.round(withPages.reduce((s,b) => s + b.pages, 0) / withPages.length).toLocaleString() : "—"; })(), color: "#f59e0b" },
                { label: "Countries", value: Object.keys(stats.byCountry).length, color: "#06b6d4" },
                { label: "Years Reading", value: stats.readingSpan, color: G.blue },
                { label: "Peak Year", value: `${stats.sortedYears[0]?.[0]} (${stats.sortedYears[0]?.[1]})`, color: "#0284c7" },
                { label: "#1 Author", value: stats.sortedAuthors[0]?.[0], color: G.purple },
                { label: "Top Genre", value: stats.sortedGenres[0]?.[0], color: "#ff9f7f" },
              ].map((s, i) => (
                <div key={i} className="stat-card" style={{ padding: "12px 14px" }}>
                  <div style={{ color: G.muted, fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 18, fontFamily: "'Playfair Display', serif", fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                  {s.sub && <div style={{ color: G.muted, fontSize: 10, marginTop: 3 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            <div className="chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Books Per Year */}
              {chartCard("Reading Activity by Year", "yc",
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ycData} barSize={18}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {ycData.map((e, i) => <Cell key={i} fill={e.count === ycMax ? G.gold : G.goldDim} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Genre Breakdown */}
              {chartCard("Genre Breakdown", "gc",
                <div style={{ overflow: "visible" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={gcData} layout="vertical" barSize={13} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="genre" axisLine={false} tickLine={false} width={110} interval={0} tick={truncTick(17)} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {gcData.map((e, i) => <Cell key={i} fill={genreMap[e.genre] || G.muted} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Authors */}
              {chartCard("Top Authors", "ac",
                <div style={{ overflow: "visible" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={acData} layout="vertical" barSize={11} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="author" axisLine={false} tickLine={false} width={130} interval={0} tick={truncTick(20)} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {acData.map((_, i) => <Cell key={i} fill={`rgba(74, 158, 255, ${Math.max(0.25, 1 - i * 0.07)})`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Author Origins */}
              {chartCard("Author Origins", "co",
                <div style={{ overflow: "visible" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={coData} layout="vertical" barSize={11} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="country" axisLine={false} tickLine={false} width={90} interval={0} tick={truncTick(14)} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {coData.map((_, i) => <Cell key={i} fill={`rgba(20, 184, 166, ${Math.max(0.25, 1 - i * 0.08)})`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Fiction vs Non-Fiction */}
              {chartCard("Fiction vs Non-Fiction Over Time", "fn",
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={fnData}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ color: G.muted, fontSize: 11 }} />
                    <Area type="monotone" dataKey="Fiction" stackId="1" stroke={G.gold} fill={G.gold} fillOpacity={0.35} />
                    <Area type="monotone" dataKey="Non-Fiction" stackId="1" stroke={G.blue} fill={G.blue} fillOpacity={0.35} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Genre Evolution */}
              {chartCard("Genre Evolution", "ge",
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={geData} margin={{ bottom: 10 }}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend content={({ payload }) => (
                      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: "4px 16px" }}>
                          {payload.map(entry => (
                            <div key={entry.value} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: G.muted, whiteSpace: "nowrap" }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )} />
                    {geTop5.map(g => <Area key={g} type="monotone" dataKey={g} stackId="1" stroke={genreMap[g]} fill={genreMap[g]} fillOpacity={0.5} />)}
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Avg Book Length Over Time */}
              {chartCard("Avg Book Length Over Time", "al",
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={alData}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} unit=" pp" />
                    <Tooltip content={<DarkTooltip />} formatter={v => [`${v} pages`, "Avg length"]} />
                    <Line type="monotone" dataKey="avg" stroke={G.gold} strokeWidth={2} dot={{ fill: G.gold, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Format Breakdown */}
              {chartCard("Format Breakdown", "fm",
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={fmData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {fmData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 8 }}>
                    {fmData.slice(0, 5).map(e => (
                      <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: G.muted }}>{e.name}</span>
                        <span style={{ fontSize: 10, color: G.dimmed }}>{e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })()}

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
            savePanelPromptsToSupabase={savePanelPromptsToSupabase}
            regeneratePanel={regeneratePanel}
          />
        )}

        {/* ── LIBRARY ────────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div>
            {/* Filter row */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <input className="input-dark" style={{ width: 190, flex: "0 0 auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              <MultiSelect options={allGenres} selected={libGenres} onChange={setLibGenres} placeholder="Genre" style={{ width: 130, flex: "0 0 auto" }} />
              <MultiSelect options={allYears} selected={libYears} onChange={setLibYears} placeholder="Year" style={{ width: 100, flex: "0 0 auto" }} />
              <MultiSelect options={allAuthors} selected={libAuthors} onChange={setLibAuthors} placeholder="Author" style={{ width: 160, flex: "0 0 auto" }} />
              <select className="input-dark" style={{ width: 120, flex: "0 0 auto" }} value={libSort} onChange={e => setLibSort(e.target.value)}>
                <option value="year">Sort: Year</option>
                <option value="title">Sort: Title</option>
                <option value="author">Sort: Author</option>
              </select>
              <span style={{ color: G.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filteredBooks.length} books</span>
              <div style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={() => downloadCSV(books)}>↓ CSV</button>
              <button className="btn-ghost" onClick={() => downloadJSON(books)}>↓ JSON</button>
              <button className="btn-gold" style={{ padding: "7px 16px", fontSize: 12, opacity: session ? 1 : 0.35, cursor: session ? "pointer" : "not-allowed" }} onClick={() => session && openAddModal()}>+ Add Book</button>
            </div>

            {/* Scrollable table wrapper (header + rows scroll together on mobile) */}
            <div className="lib-scroll-wrap" style={{ borderRadius: 8, border: `1px solid ${G.border}` }}>
            <div className="lib-inner">

            {/* Table Header */}
            <div className="lib-row" style={{ background: G.card2, borderRadius: "8px 8px 0 0", borderBottom: `1px solid ${G.border}` }}>
              {["Title", "Author", "Genre", "Format", "Type", "Pages", "Start", "End", ""].map(h => (
                <div key={h} style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="lib-table-wrap" style={{ background: G.card, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 520, overflowY: "auto" }}>
              {filteredBooks.map(b => (
                <div key={b.id} className="lib-row">
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <a href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(b.title + " " + b.author)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: G.text, textDecoration: "none" }} onMouseOver={e=>e.target.style.color=G.gold} onMouseOut={e=>e.target.style.color=G.text}>{b.title}</a>
                  </div>
                  <div title={b.author} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: G.muted }}>
                    {(b.authors?.length ? b.authors : [{ name: b.author }]).map((a, i) => (
                      <span key={i}>
                        {i > 0 && <span style={{ color: G.dimmed }}>, </span>}
                        <a href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(a.name)}`} target="_blank" rel="noopener noreferrer" style={{ color: G.muted, textDecoration: "none" }} onMouseOver={e=>e.target.style.color=G.gold} onMouseOut={e=>e.target.style.color=G.muted}>{a.name}</a>
                      </span>
                    ))}
                  </div>
                  <div title={(b.genre||[]).join(", ")} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: G.muted }}>
                    {(b.genre||[]).map((g, i) => (
                      <span key={g}>{i > 0 && <span style={{ color: G.dimmed }}>, </span>}<span style={{ color: genreMap[g]||G.muted }}>{g}</span></span>
                    ))}
                  </div>
                  <div className="cell-clip" title={b.format || "—"} style={{ fontSize: 11, color: G.muted }}>{b.format || "—"}</div>
                  <div className="cell-clip" title={b.fiction !== undefined ? (b.fiction ? "Fiction" : "Non-Fiction") : "—"} style={{ fontSize: 11, color: b.fiction ? G.blue : G.copper }}>{b.fiction !== undefined ? (b.fiction ? "Fiction" : "Non-Fiction") : "—"}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.pages || "—"}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.year_read_start || "—"}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.year_read_end || "—"}</div>
                  <button onClick={() => session && openEditModal(b)} style={{ background: "none", border: "none", color: session ? G.muted : G.dimmed, cursor: session ? "pointer" : "not-allowed", fontSize: 13, padding: 0 }} title={session ? "Edit" : "Sign in to edit"}>✎</button>
                </div>
              ))}
              {filteredBooks.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: G.muted }}>No books match your filters.</div>
              )}
            </div>
            </div>{/* end lib-inner */}
            </div>{/* end lib-scroll-wrap */}
          </div>
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
        {activeTab === "series" && (() => {
          const allSeries = [...new Set(books.filter(b => b.series).map(b => b.series))].sort();
          const seriesCounts = allSeries.map(s => ({ name: s, count: books.filter(b => b.series === s).length }))
            .sort((a, b) => b.count - a.count);

          return (
            <div>
              <div style={{ marginBottom: 20, textAlign: "center" }}>
                <div style={{ color: G.muted, fontSize: 13 }}>Pick a series to get an AI catch-up before continuing — key characters, plot beats, and what to remember.</div>
              </div>

              {/* Series picker */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                {seriesCounts.slice(0, 20).map(({ name, count }) => (
                  <button key={name} onClick={() => { setSelectedSeries(name); setSeriesRecap(null); }}
                    style={{ background: selectedSeries === name ? `${G.gold}15` : G.card, border: `1px solid ${selectedSeries === name ? G.goldDim : G.border}`, borderRadius: 20, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: selectedSeries === name ? G.gold : G.text }}>{name}</span>
                    <span style={{ fontSize: 10, color: G.muted, background: G.card2, borderRadius: 10, padding: "1px 6px" }}>{count}</span>
                  </button>
                ))}
              </div>

              {selectedSeries && (
                <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
                  {/* Series header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text, marginBottom: 4 }}>{selectedSeries}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {books.filter(b => b.series === selectedSeries).sort((a, b) => a.id - b.id).map(b => (
                          <span key={b.id} style={{ fontSize: 11, color: G.muted, background: G.card2, border: `1px solid ${G.border}`, borderRadius: 4, padding: "2px 8px" }}>{b.title}</span>
                        ))}
                      </div>
                    </div>
                    <button className="btn-gold" style={{ flexShrink: 0, marginLeft: 12, opacity: session ? 1 : 0.35, cursor: session ? "pointer" : "not-allowed" }} disabled={seriesLoading || !session}
                      onClick={() => session && generateSeriesRecap(selectedSeries)}
                      title={session ? "" : "Sign in to generate recaps"}>
                      {seriesLoading ? "Generating…" : "✦ Generate Recap"}
                    </button>
                  </div>

                  {seriesLoading && (
                    <div className="pulse" style={{ color: G.gold, fontSize: 13, fontFamily: "'Playfair Display', serif", paddingTop: 8 }}>
                      Recapping your journey through {selectedSeries}…
                    </div>
                  )}

                  {seriesRecap && !seriesLoading && (
                    <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 16 }}>
                      <div style={{ fontSize: 13, color: G.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{seriesRecap.text}</div>
                    </div>
                  )}
                </div>
              )}

              {!selectedSeries && (
                <div style={{ textAlign: "center", padding: "40px 0", color: G.muted }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⊙</div>
                  <div style={{ fontSize: 13 }}>Select a series above to generate your catch-up recap.</div>
                  <div style={{ fontSize: 12, color: G.dimmed, marginTop: 6 }}>Works best when you want to continue a series after a gap or before a new release.</div>
                </div>
              )}

              {allSeries.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: G.muted }}>
                  <div style={{ fontSize: 13 }}>No series data found. Make sure books have a series name in the Series field.</div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── CHAT ──────────────────────────────────────────────────────── */}
        {activeTab === "chat" && !session && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: G.muted }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: G.text, marginBottom: 8 }}>Sign in to use AI Chat</div>
            <div style={{ fontSize: 13 }}>This feature is only available to the library owner.</div>
          </div>
        )}
        {activeTab === "chat" && session && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
            <div style={{ color: G.muted, fontSize: 12, marginBottom: 16, textAlign: "center" }}>Ask anything — patterns, recommendations, deep dives, what you've forgotten you read…</div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "82%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: m.role === "user" ? `${G.gold}18` : G.card2,
                    border: `1px solid ${m.role === "user" ? G.goldDim : G.border}`,
                    color: G.text, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap"
                  }}>
                    {m.role === "assistant" && <div style={{ color: G.gold, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>◈ Reading AI</div>}
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ padding: "12px 16px", background: G.card2, border: `1px solid ${G.border}`, borderRadius: "12px 12px 12px 2px" }}>
                    <div className="pulse" style={{ color: G.gold, fontSize: 13 }}>Thinking…</div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-wrap" style={{ borderTop: `1px solid ${G.border}`, paddingTop: 14 }}>
              <input className="input-dark" placeholder="Ask about your reading history, patterns, recommendations…"
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} />
              <button className="btn-gold" onClick={sendChat} disabled={chatLoading} style={{ whiteSpace: "nowrap" }}>Send</button>
            </div>

            {/* Suggestion chips */}
            {messages.length === 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {["What were my peak reading years?", "Which authors have I read the most?", "Analyze my genre evolution", "What's my fiction vs non-fiction ratio?", "What books did I read in 2021?", "Suggest what to read next"].map(s => (
                  <button key={s} className="btn-ghost" style={{ fontSize: 11 }} onClick={() => { setChatInput(s); }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowLoginModal(false); setLoginError(""); } }}>
          <div className="modal-box" style={{ maxWidth: 360 }}>
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
      )}

      {/* FOOTER */}
      <div style={{ padding: "16px 28px", marginTop: 24, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: G.dimmed }}>© {new Date().getFullYear()} Viswas Nair · All rights reserved</div>
      </div>
    </div>
  );
}