import G from "../constants/theme";
import { DEFAULT_PANEL_PROMPTS } from "../constants/config";

const MOOD_COLORS = { "Dark & Tense": "#e06c75", "Imaginative": "#4a9eff", "Reflective": "#c3a6ff", "Informative": "#ffd166" };

export default function AnalysisTab({
  books,
  stats,
  analysisInsights,
  genreMap,
  session,
  analysisAI,
  analysisAILoading,
  panelPrompts,
  editingPanel,
  setEditingPanel,
  viewingPanel,
  setViewingPanel,
  panelLoading,
  updatePanelPrompt,
  savePanelPromptsToSupabase,
  regeneratePanel,
}) {
  const minYear = Math.min(...books.map(b => b.year_read_start));
  const maxYear = Math.max(...books.map(b => b.year_read_end));
  const span = maxYear - minYear + 1;

  const renderEditIcon = (dimension) => {
    if (session) return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button onClick={() => regeneratePanel(dimension)} title="Refresh with Opus"
          style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>↻</button>
        <button onClick={() => { setEditingPanel(editingPanel === dimension ? null : dimension); setViewingPanel(null); }} title="Edit prompt"
          style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>✎</button>
      </div>
    );
    return (
      <button onClick={() => setViewingPanel(viewingPanel === dimension ? null : dimension)} title="View prompt"
        style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>⊙</button>
    );
  };

  const renderInsight = (dimension, borderTop = true) => {
    const isEditing = editingPanel === dimension;
    const isLoading = panelLoading[dimension];
    const textStyle = { fontSize: 12, color: G.muted, lineHeight: 1.75, ...(borderTop ? { borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 4 } : {}) };
    return (
      <div>
        {!session && viewingPanel === dimension && (
          <div style={{ marginBottom: 8, background: G.card2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: G.dimmed, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Prompt</div>
            <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.7 }}>{panelPrompts[dimension]?.trim() || DEFAULT_PANEL_PROMPTS[dimension]}</div>
          </div>
        )}
        {isEditing && (
          <div style={{ marginBottom: 8 }}>
            <textarea
              value={panelPrompts[dimension] ?? DEFAULT_PANEL_PROMPTS[dimension] ?? ""}
              onChange={e => updatePanelPrompt(dimension, e.target.value)}
              placeholder="Describe what this panel should focus on…"
              style={{ width: "100%", minHeight: 68, background: G.card2, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontSize: 11, padding: "8px 10px", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
              <button onClick={() => { savePanelPromptsToSupabase(panelPrompts); setEditingPanel(null); }}
                style={{ background: "none", border: `1px solid ${G.border}`, borderRadius: 5, color: G.muted, fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>Save</button>
              <button onClick={() => regeneratePanel(dimension)}
                style={{ background: G.gold, border: "none", borderRadius: 5, color: "#000", fontSize: 11, fontWeight: 600, padding: "4px 12px", cursor: "pointer" }}>Regenerate</button>
            </div>
          </div>
        )}
        {isLoading
          ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Regenerating…</div>
          : analysisAILoading
            ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div>
            : analysisAI?.[dimension]
              ? <div style={textStyle}>{analysisAI[dimension]}</div>
              : null
        }
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{ color: G.muted, fontSize: 13 }}>{Object.keys(DEFAULT_PANEL_PROMPTS).length} lenses into {stats.total} books across {span} years ({minYear}–present).</div>
      </div>
      <div className="analysis-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>

        {/* 1 · TEMPORAL */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Temporal</span>
            {renderEditIcon("temporal")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Volume & Pace</div>
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            <div>
              <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.peakYear?.[1]}</div>
              <div style={{ color: G.muted, fontSize: 10 }}>books in {analysisInsights.peakYear?.[0]}</div>
            </div>
            <div>
              <div style={{ color: G.blue, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.avgPerActive}</div>
              <div style={{ color: G.muted, fontSize: 10 }}>avg / active year</div>
            </div>
            <div>
              <div style={{ color: G.red, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.maxGap}</div>
              <div style={{ color: G.muted, fontSize: 10 }}>yr reading hiatus</div>
            </div>
          </div>
          {renderInsight("temporal")}
        </div>

        {/* 2 · GENRE & FORM */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Genre & Form</span>
            {renderEditIcon("genre")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Migration Over Time</div>
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            <div>
              <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.fictionPct}%</div>
              <div style={{ color: G.muted, fontSize: 10 }}>fiction overall</div>
            </div>
            <div>
              <div style={{ color: G.green, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.genreCount}</div>
              <div style={{ color: G.muted, fontSize: 10 }}>genres explored</div>
            </div>
            <div>
              <div style={{ color: G.purple, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.graphicNovels}</div>
              <div style={{ color: G.muted, fontSize: 10 }}>graphic novels</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {analysisInsights.genreEra.map(({ era, top }) => (
              <div key={era} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 11 }}>
                <span style={{ color: G.muted }}>{era} </span>
                <span style={{ color: genreMap[top] || G.text, fontWeight: 600 }}>{top}</span>
              </div>
            ))}
          </div>
          {renderInsight("genre")}
        </div>

        {/* 5 · THEMATIC */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Thematic</span>
            {renderEditIcon("thematic")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Recurring Intellectual Preoccupations</div>
          {renderInsight("thematic", false)}
        </div>

        {/* 6 · SOCIAL & CONTEXTUAL */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Social & Contextual</span>
            {renderEditIcon("contextual")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Life Shapes the List</div>
          {renderInsight("contextual")}
        </div>

        {/* 7 · COMPLEXITY & CHALLENGE */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.red}18`, color: G.red, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Complexity & Challenge</span>
            {renderEditIcon("complexity")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Stretching vs. Comfort</div>
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            <div>
              <div style={{ color: G.red, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.challengePct}%</div>
              <div style={{ color: G.muted, fontSize: 10 }}>literary / challenging</div>
            </div>
            <div>
              <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{100 - analysisInsights.challengePct}%</div>
              <div style={{ color: G.muted, fontSize: 10 }}>commercial / accessible</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Notable stretches</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {analysisInsights.challengingAuthorsFromData.map(a => (
                <span key={a} style={{ background: `${G.red}15`, color: G.red, fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>{a}</span>
              ))}
            </div>
          </div>
          {renderInsight("complexity")}
        </div>

        {/* 9 · EMOTIONAL ARC */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.purple}18`, color: G.purple, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Emotional Arc</span>
            {renderEditIcon("emotional")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Mood Mapping by Era</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {analysisInsights.fictionByEra.map(({ era, dominant, counts, total }) => (
              <div key={era}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: G.text, fontWeight: 600 }}>{era}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: MOOD_COLORS[dominant] }}>{dominant}</span>
                </div>
                <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
                  {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([mood, c]) => (
                    <div key={mood} title={`${mood}: ${c}`}
                      style={{ width: `${Math.round(c / total * 100)}%`, background: MOOD_COLORS[mood], borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {renderInsight("emotional")}
        </div>

      </div>
    </div>
  );
}
