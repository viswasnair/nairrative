import { useState } from "react";
import G from "../constants/theme";
import { DEFAULT_PANEL_PROMPTS } from "../constants/config";
import { stripMd } from "../lib/bookUtils";
import { useAnalysisContext } from "../contexts/AnalysisContext";

const MOOD_COLORS = { "Dark & Tense": "#e06c75", "Imaginative": "#4a9eff", "Reflective": "#c3a6ff", "Informative": "#ffd166" };

function relativeTime(iso) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AnalysisTab({ books, booksLoading, stats, analysisInsights, genreMap, session, onCiteClick }) {
  const { analysisAI, analysisAILoading, panelPrompts, editingPanel, setEditingPanel, viewingPanel, setViewingPanel, panelLoading, updatePanelPrompt, resetPanelPrompt, savePanelPromptsToSupabase, regeneratePanel } = useAnalysisContext();
  const [saveMsg, setSaveMsg] = useState(null);

  const handleSavePrompt = async (dimension) => {
    const ok = await savePanelPromptsToSupabase(panelPrompts);
    setSaveMsg({ dimension, ok });
    if (ok) setTimeout(() => setSaveMsg(null), 2000);
    setEditingPanel(null);
  };

  const currentYear = new Date().getFullYear();
  const minYear = books.length ? Math.min(...books.map(b => b.year_read_start)) : currentYear;
  const maxYear = books.length ? Math.max(...books.map(b => b.year_read_end)) : currentYear;
  const span = maxYear - minYear + 1;

  const recentBooksList = books.filter(b => (b.year_read_end || b.year) >= currentYear - 1);
  const recentCount = recentBooksList.length;
  const recentPages = recentBooksList.reduce((s, b) => s + (b.pages || 0), 0);
  const recentFictionPct = recentCount ? Math.round(recentBooksList.filter(b => b.fiction).length / recentCount * 100) : 0;
  const recentGenreCounts = {};
  recentBooksList.forEach(b => (b.genre || []).forEach(g => { recentGenreCounts[g] = (recentGenreCounts[g] || 0) + 1; }));
  const recentTopGenre = Object.entries(recentGenreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const renderEditIcon = (dimension) => {
    const val = analysisAI?.[dimension];
    const meta = val && typeof val === "object" ? val : null;
    const infoTitle = meta?.generatedAt
      ? `Generated ${relativeTime(meta.generatedAt)} · ${meta.bookCount} book${meta.bookCount !== 1 ? "s" : ""}`
      : null;

    if (session) return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {infoTitle && (
          <button title={infoTitle}
            style={{ background: "none", border: "none", cursor: "default", color: G.dimmed, fontSize: 11, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>ⓘ</button>
        )}
        <button onClick={() => regeneratePanel(dimension)} title="Refresh with Opus"
          style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>↻</button>
        <button onClick={() => { setEditingPanel(editingPanel === dimension ? null : dimension); setViewingPanel(null); }} title="Edit prompt"
          style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>✎</button>
      </div>
    );
    return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {infoTitle && (
          <button title={infoTitle}
            style={{ background: "none", border: "none", cursor: "default", color: G.dimmed, fontSize: 11, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>ⓘ</button>
        )}
        <button onClick={() => setViewingPanel(viewingPanel === dimension ? null : dimension)} title="View prompt"
          style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>⊙</button>
      </div>
    );
  };

  const renderInsight = (dimension, borderTop = true) => {
    const isEditing = editingPanel === dimension;
    const isLoading = panelLoading[dimension];
    const textStyle = { fontSize: 12, color: G.muted, lineHeight: 1.75, ...(borderTop ? { borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 4 } : {}) };

    const raw = analysisAI?.[dimension];
    const insight = raw ? (typeof raw === "string" ? raw : (raw.insight || "")) : null;
    const evidence = raw && typeof raw === "object" && Array.isArray(raw.evidence) ? raw.evidence : [];

    const bookTitlesLower = books.map(b => b.title.toLowerCase());

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
            <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end", alignItems: "center" }}>
              {saveMsg?.dimension === dimension && !saveMsg.ok && (
                <span style={{ fontSize: 11, color: "#e06c75" }}>Save failed</span>
              )}
              <button onClick={() => resetPanelPrompt(dimension)} title="Reset to default prompt"
                style={{ background: "none", border: `1px solid ${G.border}`, borderRadius: 5, color: G.dimmed, fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>Reset</button>
              <button onClick={() => handleSavePrompt(dimension)}
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
            : insight
              ? (
                <div>
                  <div style={textStyle}>{stripMd(insight)}</div>
                  {evidence.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                      {evidence.map((title, i) => {
                        const verified = bookTitlesLower.includes(title.toLowerCase());
                        return verified ? (
                          <button key={i} onClick={() => onCiteClick?.(title)} title={`See in library: ${title}`}
                            style={{ background: `${G.gold}18`, border: `1px solid ${G.gold}40`, borderRadius: 4, color: G.gold, fontSize: 10, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                            {title}
                          </button>
                        ) : (
                          <span key={i} title="Title not found in your library"
                            style={{ background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.dimmed, fontSize: 10, padding: "2px 8px", textDecoration: "line-through" }}>
                            {title}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
              : null
        }
      </div>
    );
  };

  if (booksLoading) return (
    <div>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div className="pulse" style={{ height: 13, width: 280, background: G.border, borderRadius: 4, margin: "0 auto" }} />
      </div>
      <div className="analysis-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
            <div className="pulse" style={{ height: 10, width: 60, background: G.border, borderRadius: 4, marginBottom: 12 }} />
            <div className="pulse" style={{ height: 15, width: "60%", background: G.border, borderRadius: 4, marginBottom: 16 }} />
            <div className="pulse" style={{ height: 10, width: "100%", background: G.border, borderRadius: 4, marginBottom: 6 }} />
            <div className="pulse" style={{ height: 10, width: "90%", background: G.border, borderRadius: 4, marginBottom: 6 }} />
            <div className="pulse" style={{ height: 10, width: "80%", background: G.border, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  );

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

        {/* 5 · COMPLEXITY & CHALLENGE */}
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

        {/* 6 · EMOTIONAL FINGERPRINT */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.purple}18`, color: G.purple, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Emotional</span>
            {renderEditIcon("emotional")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Emotional Fingerprint</div>
          {(() => {
            const moodTotals = {};
            (analysisInsights.fictionByEra || []).forEach(({ counts }) => {
              Object.entries(counts || {}).forEach(([mood, c]) => { moodTotals[mood] = (moodTotals[mood] || 0) + c; });
            });
            const total = Object.values(moodTotals).reduce((a, b) => a + b, 0);
            if (!total) return null;
            const sorted = Object.entries(moodTotals).sort((a, b) => b[1] - a[1]);
            return (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
                  {sorted.map(([mood, c]) => (
                    <div key={mood} title={`${mood}: ${c}`}
                      style={{ width: `${Math.round(c / total * 100)}%`, background: MOOD_COLORS[mood] || G.muted }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {sorted.map(([mood, c]) => (
                    <div key={mood} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: MOOD_COLORS[mood] || G.muted, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: G.muted }}>{mood}</span>
                      <span style={{ fontSize: 10, color: G.text, fontWeight: 600 }}>{Math.round(c / total * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {renderInsight("emotional")}
        </div>

        {/* 7 · BLINDSPOTS */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Blindspots</span>
            {renderEditIcon("blindspots")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>What's Missing</div>
          {renderInsight("blindspots", false)}
        </div>

        {/* 8 · RECENT — LAST 12 MONTHS */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: `${G.green}18`, color: G.green, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Recent</span>
            {renderEditIcon("recent")}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Last 12 Months</div>
          <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: G.green, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{recentCount}</div>
              <div style={{ color: G.muted, fontSize: 10 }}>books read</div>
            </div>
            <div>
              <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{recentPages.toLocaleString()}</div>
              <div style={{ color: G.muted, fontSize: 10 }}>pages read</div>
            </div>
            <div>
              <div style={{ color: G.blue, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{recentFictionPct}%</div>
              <div style={{ color: G.muted, fontSize: 10 }}>fiction</div>
            </div>
            {recentTopGenre && (
              <div>
                <div style={{ color: genreMap[recentTopGenre] || G.purple, fontSize: 16, fontFamily: "'Playfair Display', serif", fontWeight: 700, marginTop: 5 }}>{recentTopGenre}</div>
                <div style={{ color: G.muted, fontSize: 10 }}>top genre</div>
              </div>
            )}
          </div>
          {renderInsight("recent")}
        </div>

      </div>
    </div>
  );
}
