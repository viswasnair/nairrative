import G from "../constants/theme";

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
}) {
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
              {/* Header */}
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

              {/* Input for non-auto panels */}
              {!lens.auto && (
                <div style={{ marginTop: 8, marginBottom: 4 }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    {lens.isDropdown ? (
                      <select className="input-dark" style={{ fontSize: 12, padding: "7px 10px", paddingRight: 32, flex: 1 }}
                        value={input}
                        onChange={e => { const v = e.target.value; setIntentInputs(p => ({ ...p, [lens.id]: v })); if (v && session) fetchIntentRecs(lens.id, v); }}>
                        <option value="">— pick a genre —</option>
                        {lens.dropdownOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className="input-dark" style={{ fontSize: 12, paddingRight: 32, flex: 1 }}
                        placeholder={lens.placeholder}
                        value={input}
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

              {/* Results */}
              <RecList results={results} loading={loading} />

              {/* Empty state for auto panels */}
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
  );
}
