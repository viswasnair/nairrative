import { useState, useMemo, useCallback, useTransition, useDeferredValue } from "react";
import G from "./constants/theme";
import { TABS } from "./constants/config";
import { computeStats, computeAnalysisInsights } from "./lib/bookStats";
import { useAuth } from "./hooks/useAuth";
import { useBooks } from "./hooks/useBooks";
import { useAnalysis } from "./hooks/useAnalysis";
import { useRecs } from "./hooks/useRecs";
import { useLibraryFilters } from "./hooks/useLibraryFilters";
import { useChat } from "./hooks/useChat";
import BookModal from "./components/BookModal";
import { BookActionsContext } from "./contexts/BookActionsContext";
import { AnalysisContext } from "./contexts/AnalysisContext";
import { RecsContext } from "./contexts/RecsContext";
import { LibraryFiltersContext } from "./contexts/LibraryFiltersContext";
import AnalysisTab from "./components/AnalysisTab";
import RecsTab from "./components/RecsTab";
import OverviewTab from "./components/OverviewTab";
import ChatTab from "./components/ChatTab";
import LibraryTab from "./components/LibraryTab";
import RatingFlashcard from "./components/RatingFlashcard";
import ErrorBoundary from "./components/ErrorBoundary";

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
    booksLoading,
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

  const {
    messages, chatInput, setChatInput, chatLoading, chatEndRef, sendChat,
    seriesRecap, setSeriesRecap, seriesLoading, selectedSeries, setSelectedSeries, generateSeriesRecap,
  } = useChat({ books, stats, analysisInsights, analysisAI, intentResults, session });

  const getChartRange = useCallback((id) => {
    const timeCharts = new Set(["yc", "fn", "ge"]);
    const defaultFrom = timeCharts.has(id) ? (allYearsList[0] ?? 2011) : (allYearsListFull[0] ?? 2010);
    const defaultTo = timeCharts.has(id) ? (allYearsList[allYearsList.length - 1] ?? 2026) : (allYearsListFull[allYearsListFull.length - 1] ?? 2026);
    return {
      from: chartRanges[id]?.from ?? defaultFrom,
      to: chartRanges[id]?.to ?? defaultTo,
    };
  }, [chartRanges, allYearsList, allYearsListFull]);
  const setChartRange = useCallback((id, from, to) => setChartRanges(p => ({ ...p, [id]: { from, to } })), []);


  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>

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
      <AnalysisContext.Provider value={{ analysisAI, analysisAILoading, panelPrompts, editingPanel, setEditingPanel, viewingPanel, setViewingPanel, panelLoading, updatePanelPrompt, resetPanelPrompt, savePanelPromptsToSupabase, regeneratePanel }}>
      <RecsContext.Provider value={{ intentInputs, setIntentInputs, intentResults, setIntentResults, intentLoading, fetchIntentRecs, selectedSeries, setSelectedSeries, seriesRecap, setSeriesRecap, seriesLoading, generateSeriesRecap }}>
      <LibraryFiltersContext.Provider value={{ search, setSearch, libGenres, setLibGenres, libYears, setLibYears, libAuthors, setLibAuthors, libCountries, setLibCountries, libFormats, setLibFormats, libMoods, setLibMoods, libArchetypes, setLibArchetypes, libThemes, setLibThemes, libSort, setLibSort, setAllFilters, filteredBooks, allGenres, allYears, allAuthors, allCountries, allFormats, allMoods, allArchetypes, allThemes }}>
      <div className="fade-in page-content" style={{ padding: "24px 28px" }}>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <ErrorBoundary>
            <OverviewTab
              books={books}
              booksLoading={booksLoading}
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
          </ErrorBoundary>
        )}

        {/* ── ANALYSIS ─────────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <ErrorBoundary>
            <AnalysisTab
              books={books}
              booksLoading={booksLoading}
              stats={stats}
              analysisInsights={analysisInsights}
              genreMap={genreMap}
              session={session}
              onCiteClick={onCiteClick}
            />
          </ErrorBoundary>
        )}

        {/* ── LIBRARY ────────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <ErrorBoundary>
            <LibraryTab
              books={books}
              session={session}
              genreMap={genreMap}
              openAddModal={openAddModal}
              openEditModal={openEditModal}
              openRatingMode={() => setShowRatingMode(true)}
            />
          </ErrorBoundary>
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
          <BookActionsContext.Provider value={{
            editingBook, bookDraft, setBookDraft, bookChatInputRef,
            bookChatLoading, bookChatPending, setBookChatPending,
            bookSaving, bookMsg, newGenreInput, setNewGenreInput,
            newGenreOpen, setNewGenreOpen, newGenreSaving,
            genreList, chatFillBook, applyPending, addGenre,
            saveBook, deleteBook, onClose: () => setShowBookModal(false),
            authorSuggestions, checkAuthorSuggestion, acceptAuthorSuggestion,
            dismissAuthorSuggestion, genreSuggestion, acceptGenreSuggestion,
            dismissGenreSuggestion,
          }}>
            <BookModal />
          </BookActionsContext.Provider>
        )}

        {/* ── RECOMMENDATIONS ────────────────────────────────────────────── */}
        {activeTab === "recs" && (
          <ErrorBoundary>
            <RecsTab
              books={books}
              genreList={genreList}
              session={session}
            />
          </ErrorBoundary>
        )}

        {/* ── CHAT ──────────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <ErrorBoundary>
            <ChatTab
              session={session}
              messages={messages}
              chatLoading={chatLoading}
              chatInput={chatInput}
              setChatInput={setChatInput}
              chatEndRef={chatEndRef}
              sendChat={sendChat}
            />
          </ErrorBoundary>
        )}
      </div>
      </LibraryFiltersContext.Provider>
      </RecsContext.Provider>
      </AnalysisContext.Provider>

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
