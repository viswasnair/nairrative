import { useState } from "react";
import G from "../constants/theme";
import SeriesTab from "./SeriesTab";
import NewReleasesTab from "./NewReleasesTab";

const RecList = ({ results, loading }) => {
  if (loading) return (
    <div style={{ marginTop: 12 }}>
      <div className="pulse" style={{ height: 12, width: "70%", background: G.border, borderRadius: 4, marginBottom: 6 }} />
      <div className="pulse" style={{ height: 10, width: "40%", background: G.dimmed, borderRadius: 4, marginBottom: 6 }} />
      <div className="pulse" style={{ height: 10, width: "90%", background: G.dimmed, borderRadius: 4 }} />
    </div>
  );
  if (!results) return null;
  const r = results[0];
  if (!r) return null;
  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: G.text, lineHeight: 1.4, marginBottom: 3 }}>{r.title}</div>
      <div style={{ fontSize: 11, color: G.gold, marginBottom: 6 }}>{r.author}{r.year ? ` · ${r.year}` : ""}</div>
      {r.reason && <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.6 }}>{r.reason}</div>}
    </div>
  );
};

const SUB_TABS = [
  { id: "picks",    label: "Picks" },
  { id: "recap",    label: "Series Recap" },
  { id: "releases", label: "New Releases" },
];

export default function RecsTab({
  books,
  genreList,
  session,
  intentInputs,
  setIntentInputs,
  intentResults,
  setIntentResults,
  intentLoading,
  fetchIntentRecs,
  selectedSeries,
  setSelectedSeries,
  seriesRecap,
  setSeriesRecap,
  seriesLoading,
  generateSeriesRecap,
}) {
  const [subTab, setSubTab] = useState("picks");
  const lastBook = books[books.length - 1];

  const LENSES = [
    { id: "more-like", icon: "◈", title: "More Like Last Book", sub: `Based on "${lastBook?.title}"`, auto: true },
    { id: "more-by-last", icon: "◉", title: "More By Last Author", sub: `Everything by ${lastBook?.author}`, auto: true },
    { id: "similar-author", icon: "◎", title: "Books By Similar Author", sub: `Authors like ${lastBook?.author}`, auto: true },
    { id: "trending", icon: "⊛", title: "What's Trending", sub: "Culturally buzzy · award-listed · 2024–26", auto: true },
    { id: "challenge", icon: "△", title: "Challenge Me", sub: "Dense, difficult, demanding works", auto: true },
    { id: "quick", icon: "≡", title: "Quick Reads", sub: "Under 300 pages, deeply rewarding", auto: true },
    { id: "gaps", icon: "⊕", title: "Fill My Gaps", sub: "Traditions & voices not yet in your library", auto: true },
    { id: "surprise", icon: "✦", title: "Surprise Me", sub: "Wildly unexpected — off-pattern picks", auto: true },
    { id: "finish", icon: "⊙", title: "Finish the Series", sub: "Re-entry points or similar completable series", auto: true },
    { id: "loved", icon: "◑", title: "If You Loved…", sub: "", auto: false, placeholder: "A book title…", inputLabel: "Enter a book you loved" },
    { id: "authors-like", icon: "◷", title: "Books By Authors Like…", sub: "", auto: false, placeholder: "An author name…", inputLabel: "Enter an author" },
    { id: "mood", icon: "◐", title: "Match My Mood", sub: "", auto: false, placeholder: "Describe the vibe…", inputLabel: "What are you in the mood for?" },
    { id: "genre-pick", icon: "▦", title: "By Genre", sub: "", auto: false, isDropdown: true, dropdownOptions: genreList, inputLabel: "Choose a genre" },
    { id: "topic", icon: "◫", title: "By Topic", sub: "", auto: false, placeholder: "AI, colonialism, ecology…", inputLabel: "Enter a topic or theme" },
    { id: "pair", icon: "⊞", title: "Pair It", sub: "Web-searched companion reads", auto: false, placeholder: "A film, show, event, or experience…", inputLabel: "Pair a book with…" },
  ];

  return (
    <div>
      {/* Subtab nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
        {SUB_TABS.map((t, i) => (
          <>
            {i > 0 && <span key={`sep-${i}`} style={{ color: G.dimmed, fontSize: 12, userSelect: "none" }}>·</span>}
            <button key={t.id} onClick={() => setSubTab(t.id)}
              style={{ background: "none", border: "none", padding: "4px 8px", cursor: "pointer", fontSize: 13, fontWeight: subTab === t.id ? 600 : 400, color: subTab === t.id ? G.gold : G.muted, fontFamily: "'DM Sans', sans-serif" }}>
              {t.label}
            </button>
          </>
        ))}
      </div>

      {/* Picks */}
      {subTab === "picks" && (
        <div>
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            <div style={{ color: G.muted, fontSize: 13 }}>{LENSES.length} lenses for discovery — one curated pick per lens, refreshes on every new book added.</div>
          </div>
          <div className="rec-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {LENSES.map(lens => {
              const results = intentResults[lens.id];
              const loading = !!intentLoading[lens.id];
              const input = intentInputs[lens.id] || "";
              const canFetch = lens.auto || (lens.isDropdown ? !!input : !!input.trim());

              return (
                <div key={lens.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>{lens.icon} {lens.title}</span>
                    {session && (results || loading) && (
                      <button
                        onClick={() => { setIntentResults(p => { const n = { ...p }; delete n[lens.id]; return n; }); fetchIntentRecs(lens.id, input); }}
                        style={{ background: "none", border: "none", color: G.muted, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}
                        title="Refresh">↺</button>
                    )}
                  </div>
                  {lens.sub && <div style={{ fontSize: 11, color: G.muted, marginTop: 6 }}>{lens.sub}</div>}

                  {!lens.auto && (
                    <div style={{ marginTop: 8, marginBottom: 4 }}>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        {lens.isDropdown ? (
                          <select className="input-dark" style={{ fontSize: 12, padding: "7px 10px", paddingRight: 32, flex: 1, opacity: session ? 1 : 0.5, cursor: session ? "pointer" : "not-allowed" }}
                            value={input}
                            disabled={!session}
                            title={session ? undefined : "Sign in to use this"}
                            onChange={e => { const v = e.target.value; setIntentInputs(p => ({ ...p, [lens.id]: v })); if (v && session) fetchIntentRecs(lens.id, v); }}>
                            <option value="">— pick a genre —</option>
                            {lens.dropdownOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input className="input-dark" style={{ fontSize: 12, paddingRight: 32, flex: 1, opacity: session ? 1 : 0.5, cursor: session ? "text" : "not-allowed" }}
                            placeholder={session ? lens.placeholder : "Sign in to use this"}
                            value={input}
                            disabled={!session}
                            onChange={e => setIntentInputs(p => ({ ...p, [lens.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter" && input.trim() && session) fetchIntentRecs(lens.id, input); }} />
                        )}
                        {!lens.isDropdown && (
                          <button
                            onClick={() => session && canFetch && !loading && fetchIntentRecs(lens.id, input)}
                            disabled={!session || loading || !canFetch}
                            title={session ? "Get pick" : "Sign in to get picks"}
                            style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: session && canFetch && !loading ? "pointer" : "not-allowed", color: session && canFetch && !loading ? G.gold : G.dimmed, fontSize: 14, lineHeight: 1, padding: 0 }}>
                            {loading ? "…" : "→"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <RecList results={results} loading={loading} />

                  {lens.auto && !results && !loading && session && (
                    <div style={{ fontSize: 11, color: G.dimmed, marginTop: 8 }}>
                      <button onClick={() => fetchIntentRecs(lens.id)}
                        style={{ background: "none", border: `1px solid ${G.border}`, color: G.muted, fontSize: 11, borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}>Load picks</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Series Recap */}
      {subTab === "recap" && (
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

      {/* New Releases */}
      {subTab === "releases" && (
        <NewReleasesTab books={books} session={session} />
      )}
    </div>
  );
}
