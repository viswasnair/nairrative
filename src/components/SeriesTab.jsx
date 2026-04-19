import { useState } from "react";
import G from "../constants/theme";
import { CLAUDE_URL, claudeHeaders } from "../lib/api";

export default function SeriesTab({ books, session, selectedSeries, setSelectedSeries, seriesRecap, setSeriesRecap, seriesLoading, generateSeriesRecap }) {
  const [customInput, setCustomInput] = useState("");
  const [customRecap, setCustomRecap] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  const allSeries = [...new Set(books.filter(b => b.series).map(b => b.series))].sort();
  const seriesCounts = allSeries.map(s => ({ name: s, count: books.filter(b => b.series === s).length }))
    .sort((a, b) => b.count - a.count);

  const generateCustomRecap = async () => {
    if (!customInput.trim() || customLoading || !session) return;
    setCustomLoading(true);
    setCustomRecap(null);
    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST",
        headers: claudeHeaders(session),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 800,
          system: "You are a literary companion helping a reader recall a book or series. Write an engaging recap covering key characters, major plot turns, central themes, and what's most important to remember. Be concise but thorough.",
          messages: [{ role: "user", content: `Please give me a recap of "${customInput.trim()}". Include key characters, major plot points, central themes, and the most important things to remember.` }]
        })
      });
      const data = await res.json();
      setCustomRecap(data.content?.[0]?.text || "Could not generate recap.");
    } catch (e) {
      setCustomRecap(`Error: ${e?.message || "Unknown error"}`);
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <div>
      {/* Custom recap input */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, marginBottom: 10 }}>Recap anything</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input-dark"
            style={{ flex: 1, opacity: session ? 1 : 0.5, cursor: session ? "text" : "not-allowed" }}
            placeholder={session ? "Enter any series or book name…" : "Sign in to generate recaps"}
            value={customInput}
            disabled={!session}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") generateCustomRecap(); }}
          />
          <button className="btn-gold" disabled={!session || customLoading || !customInput.trim()}
            style={{ flexShrink: 0, opacity: session && customInput.trim() ? 1 : 0.35, cursor: session && customInput.trim() ? "pointer" : "not-allowed" }}
            onClick={generateCustomRecap}>
            {customLoading ? "Generating…" : "✦ Recap"}
          </button>
        </div>
        {customLoading && (
          <div className="pulse" style={{ color: G.gold, fontSize: 13, fontFamily: "'Playfair Display', serif", marginTop: 12 }}>
            Recapping "{customInput}"…
          </div>
        )}
        {customRecap && !customLoading && (
          <div style={{ borderTop: `1px solid ${G.border}`, marginTop: 14, paddingTop: 14, fontSize: 13, color: G.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {customRecap}
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ color: G.muted, fontSize: 13 }}>Or pick a series from your library for a personalised catch-up — key characters, plot beats, and what to remember.</div>
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
        <div style={{ textAlign: "center", padding: "20px 0", color: G.muted }}>
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
}
