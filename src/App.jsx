import { useState, useMemo, useRef, useEffect, useTransition, useDeferredValue } from "react";
import { supabase } from "./lib/supabase";
import G from "./constants/theme";
import { TABS } from "./constants/config";
import { buildBookContext, toRow } from "./lib/bookUtils";
import { computeStats, computeAnalysisInsights } from "./lib/bookStats";
import { useAuth } from "./hooks/useAuth";
import { useBooks } from "./hooks/useBooks";
import { useAnalysis } from "./hooks/useAnalysis";
import { useRecs } from "./hooks/useRecs";
import { useLibraryFilters } from "./hooks/useLibraryFilters";
import BookModal from "./components/BookModal";
import AnalysisTab from "./components/AnalysisTab";
import RecsTab from "./components/RecsTab";
import OverviewTab from "./components/OverviewTab";
import ChatTab from "./components/ChatTab";
import LibraryTab from "./components/LibraryTab";
import RatingFlashcard from "./components/RatingFlashcard";
import { CLAUDE_URL, claudeHeaders } from "./lib/api";

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const {
    session,
    showLoginModal, setShowLoginModal,
    loginEmail, setLoginEmail,
    loginPassword, setLoginPassword,
    loginError, loginLoading,
    login, logout, closeLoginModal,
  } = useAuth();

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
  const stats = useMemo(() => computeStats(deferredBooks), [deferredBooks]);
  const analysisInsights = useMemo(() => computeAnalysisInsights(deferredBooks, stats), [deferredBooks, stats]);

  const {
    search, setSearch,
    libGenres, setLibGenres,
    libYears, setLibYears,
    libAuthors, setLibAuthors,
    libCountries, setLibCountries,
    libFormats, setLibFormats,
    libMoods, setLibMoods,
    libArchetypes, setLibArchetypes,
    libThemes, setLibThemes,
    libSort, setLibSort,
    setAllFilters,
    filteredBooks,
    allYears, allAuthors, allCountries, allFormats, allMoods, allArchetypes, allThemes,
    allYearsList, allYearsListFull,
  } = useLibraryFilters(books, stats);

  const allGenres = genreList;
  const onCiteClick = (title) => { setSearch(title); switchTab("library"); };
  const navigateToLibrary = (filters = {}) => { setAllFilters(filters); switchTab("library"); };

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
      const fullList = books.map(toRow).join("\n");
      // Overview KPIs and chart data (mirrors what the Overview tab shows)
      const withPages = books.filter(b => b.pages);
      const totalPages = withPages.reduce((s, b) => s + b.pages, 0);
      const uniqueAuthors = new Set(books.map(b => b.author)).size;
      const booksPerYear = stats.readingSpan ? Math.round(stats.total / stats.readingSpan) : null;
      const avgPagesPerBook = withPages.length ? Math.round(totalPages / withPages.length) : null;
      const pagesPerDay = stats.readingSpan && totalPages ? (totalPages / (stats.readingSpan * 365)).toFixed(1) : null;
      const overviewContext = [
        `Total: ${stats.total} books · ${uniqueAuthors} authors · ${stats.readingSpan} years reading`,
        booksPerYear ? `Pace: ${booksPerYear} books/year` : "",
        avgPagesPerBook ? `Pages: avg ${avgPagesPerBook} pages/book · ${pagesPerDay} pages/day` : "",
        stats.sortedYears[0] ? `Peak year: ${stats.sortedYears[0][0]} (${stats.sortedYears[0][1]} books)` : "",
        stats.sortedAuthors[0] ? `#1 author: ${stats.sortedAuthors[0][0]} (${stats.sortedAuthors[0][1]} books)` : "",
        stats.sortedGenres[0] ? `Top genre: ${stats.sortedGenres[0][0]} (${stats.sortedGenres[0][1]} books)` : "",
        analysisInsights ? `Fiction/Non-fiction split: ${analysisInsights.fictionCount} fiction (${analysisInsights.fictionPct}%) · ${analysisInsights.nonFictionCount} non-fiction` : "",
        analysisInsights ? `Series books: ${analysisInsights.seriesCount} (${analysisInsights.seriesPct}%)` : "",
        analysisInsights?.loyaltyRatio ? `${analysisInsights.loyaltyRatio}% of books from authors read 5+ times` : "",
        "",
        "Books per year: " + Object.entries(stats.byYear).sort((a, b) => a[0] - b[0]).map(([y, c]) => `${y}:${c}`).join(", "),
        "",
        "Genre breakdown: " + stats.sortedGenres.slice(0, 15).map(([g, c]) => `${g}:${c}`).join(", "),
        "",
        "Top authors: " + stats.sortedAuthors.slice(0, 20).map(([a, c]) => `${a}:${c}`).join(", "),
        "",
        Object.keys(stats.byCountry).length
          ? "Author origins: " + Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, n]) => `${c}:${n}`).join(", ")
          : "",
      ].filter(Boolean).join("\n");

      const resolvedAnalysis = analysisAI ?? (() => {
        try { return JSON.parse(localStorage.getItem("nairrative_analysis_ai") || "null"); } catch { return null; }
      })();
      const resolvedRecs = Object.keys(intentResults).length > 0 ? intentResults : (() => {
        try { return JSON.parse(localStorage.getItem("nairrative_recs") || "null"); } catch { return null; }
      })();

      const ANALYSIS_LABELS = {
        temporal: "Reading Pace & Volume", genre: "Genre Evolution",
        geographic: "Geographic & Cultural Range", author: "Author Patterns",
        thematic: "Themes & Preoccupations", contextual: "Life Context & Reading",
        complexity: "Complexity Balance", emotional: "Emotional Arc", discovery: "Discovery Patterns",
      };
      const analysisContext = resolvedAnalysis && typeof resolvedAnalysis === "object"
        ? Object.entries(resolvedAnalysis)
            .filter(([, v]) => v && typeof v === "string")
            .map(([k, v]) => `[${ANALYSIS_LABELS[k] || k}]\n${v}`)
            .join("\n\n")
        : "";

      const LENS_LABELS = {
        "more-like": "More Like Last Book", "more-by-last": "More By Last Author",
        "similar-author": "Books By Similar Author", "trending": "What's Trending",
        "challenge": "Challenge Me", "quick": "Quick Reads", "gaps": "Fill My Gaps",
        "surprise": "Surprise Me", "finish": "Finish the Series",
        "loved": "If You Loved…", "authors-like": "Books By Authors Like…",
        "mood": "Match My Mood", "genre-pick": "By Genre", "topic": "By Topic",
        "occasion": "For the Occasion", "pair": "Pair It",
      };
      const recsContext = resolvedRecs && typeof resolvedRecs === "object"
        ? Object.entries(resolvedRecs)
            .filter(([, v]) => Array.isArray(v) && v.length > 0 && v[0]?.title)
            .map(([k, v]) => {
              const b = v[0];
              return `[${LENS_LABELS[k] || k}]\n"${b.title}" by ${b.author}${b.year ? ` (${b.year})` : ""}${b.reason ? ` — ${b.reason}` : ""}`;
            })
            .join("\n\n")
        : "";

      let newReleasesContext = "";
      try {
        const { data: releases } = await supabase
          .from("new_releases").select("title, author, series, published_date")
          .gte("published_date", `${new Date().getFullYear() - 2}-01-01`)
          .order("published_date", { ascending: false }).limit(20);
        if (releases?.length) {
          const readTitles = new Set(books.map(b => b.title?.toLowerCase().trim()));
          const unread = releases.filter(r => !readTitles.has(r.title?.toLowerCase().trim()));
          if (unread.length) {
            newReleasesContext = unread
              .map(r => `• "${r.title}" by ${r.author}${r.series ? ` (${r.series})` : ""}${r.published_date ? ` — ${r.published_date}` : ""}`)
              .join("\n");
          }
        }
      } catch { /* supplementary — silent fail */ }

      const seriesRecapContext = seriesRecap ? `Series: ${selectedSeries}\n${seriesRecap}` : "";

      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: claudeHeaders(session),
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1200,
          system: `You are an insightful personal reading assistant with full access to the user's reading database, AI analysis, and recommendations. Use the data below to answer questions accurately and specifically.

IMPORTANT CONTEXT: Year 2010 is a collective placeholder for all books read between 1998 and 2010 — not a single-year anomaly. Do not treat it as unusual.

--- DATABASE SUMMARY ---
${summary}

--- OVERVIEW STATS & KPIs ---
${overviewContext}

--- FULL BOOK LIST (${books.length} books) ---
${fullList}
${analysisContext ? `\n--- AI ANALYSIS PANELS ---\n${analysisContext}` : ""}
${recsContext ? `\n--- CURRENT RECOMMENDATIONS (one curated pick per lens) ---\n${recsContext}` : ""}
${newReleasesContext ? `\n--- NEW RELEASES FROM YOUR AUTHORS (unread) ---\n${newReleasesContext}` : ""}
${seriesRecapContext ? `\n--- SERIES RECAP ---\n${seriesRecapContext}` : ""}

Answer primarily from the data, with specific references to books, authors, years, and patterns. When the user asks about analysis insights or recommendations, draw on the AI analysis panels and recommendation results above. For general knowledge questions about books or authors not requiring personal library data, you may use your broader knowledge — but never invent books the user has read.

Formatting rules: Write in clean, natural prose. Do not use markdown syntax — no asterisks for bold or italic, no hash symbols for headers, no hyphens or asterisks as bullet points. When a list genuinely helps, use "1." for numbered lists or "•" for bullet points. Keep responses direct and conversational — not a structured report.`,
          messages: updated.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      if (data.error) console.error("Chat API error:", data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || "Sorry, try again." }]);
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
        method: "POST", headers: claudeHeaders(session),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 800,
          system: `You are a literary companion helping a reader catch up on a book series. Write engaging recaps — key characters, major plot turns, how each book ends. Keep each book recap to 2–3 sentences. Be concise.`,
          messages: [{ role: "user", content: `Please recap the "${seriesName}" series. The reader has read these books (in order): ${seriesBooks.map((b, i) => `${i+1}. ${b.title} (${b.year_read_end})`).join(", ")}. Give a short recap of each book and a "What to remember" section with the 3–5 most important things going into the next installment.` }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSeriesRecap({ series: seriesName, books: seriesBooks, text: data.content?.[0]?.text || "Could not generate recap." });
    } catch (e) {
      console.error("generateSeriesRecap error:", e);
      setSeriesRecap({ series: seriesName, books: seriesBooks, text: "Could not generate recap. Please try again." });
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
    @keyframes widgetFade { from { opacity: 0; } to { opacity: 1; } }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse { animation: pulse 1.5s infinite; }
    .burger-btn { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 4px; }
    .mini-brand { cursor: pointer; padding: 0; }
    .logo-collapse { overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease; }
    @media (max-width: 640px) {
      .tab-nav { display: none !important; }
      .burger-btn { display: flex !important; }
      .page-header { padding-left: 16px !important; padding-right: 16px !important; }
      .page-content { padding: 16px !important; }
      .header-logo { width: 250px !important; height: auto !important; }
      .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
      .chart-grid { grid-template-columns: 1fr !important; }
      .rec-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .analysis-grid { grid-template-columns: 1fr !important; }
      .new-releases-grid { grid-template-columns: repeat(2, 1fr) !important; }
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

          {/* Lock + Burger */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
            <button onClick={() => session ? logout() : setShowLoginModal(true)}
              title={session ? "Sign out" : "Sign in"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 1, color: session ? G.gold : G.dimmed, flexShrink: 0 }}>
              {session
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              }
            </button>
            <button className="burger-btn" onClick={() => setMobileMenuOpen(o => !o)}
              title="Menu" style={{ color: G.muted }}>
              <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
              <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
              <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
            </button>
          </div>
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
            onChartClick={navigateToLibrary}
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
            onCiteClick={onCiteClick}
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
            libCountries={libCountries} setLibCountries={setLibCountries}
            libFormats={libFormats} setLibFormats={setLibFormats}
            libMoods={libMoods} setLibMoods={setLibMoods}
            libArchetypes={libArchetypes} setLibArchetypes={setLibArchetypes}
            libThemes={libThemes} setLibThemes={setLibThemes}
            libSort={libSort} setLibSort={setLibSort}
            allGenres={allGenres} allYears={allYears} allAuthors={allAuthors}
            allCountries={allCountries} allFormats={allFormats}
            allMoods={allMoods} allArchetypes={allArchetypes} allThemes={allThemes}
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
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeLoginModal(); }}>
          <div className="modal-box" style={{ maxWidth: 360 }}>
          <div className="modal-scroll">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text }}>Sign In</div>
              <button onClick={closeLoginModal} style={{ background: "none", border: "none", color: G.muted, fontSize: 20, cursor: "pointer" }}>×</button>
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
