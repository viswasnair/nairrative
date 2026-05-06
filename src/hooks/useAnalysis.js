import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { buildBookContext } from "../lib/bookUtils";
import { SEED_ANALYSIS, } from "../constants/seeds";
import { DEFAULT_PANEL_PROMPTS } from "../constants/config";
import { CLAUDE_URL, claudeHeaders, INTER_REQUEST_DELAY_MS } from "../lib/api";

const toRow = b =>
  `[${b.year_read_end || b.year}] "${b.title}" by ${b.author} | ${(b.genre || []).join("/")}` +
  `${b.pages ? " | " + b.pages + "pp" : ""}` +
  `${b.series ? " | series: " + b.series : ""}` +
  `${b.fiction !== undefined ? " | " + (b.fiction ? "fiction" : "non-fiction") : ""}` +
  `${b.notes ? " | notes: " + b.notes : ""}`;

export function useAnalysis({ books, booksFingerprint, activeTab, lastAddedAt }) {
  const [analysisAI, setAnalysisAI] = useState(null);
  const [analysisAILoading, setAnalysisAILoading] = useState(false);
  const [panelPrompts, setPanelPrompts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nairrative_panel_prompts") || "{}"); } catch { return {}; }
  });
  const [editingPanel, setEditingPanel] = useState(null);
  const [viewingPanel, setViewingPanel] = useState(null);
  const [panelLoading, setPanelLoading] = useState({});

  // Load panel prompts from Supabase for cross-device sync
  useEffect(() => {
    supabase.from("panel_prompts").select("data").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (data?.data) {
          setPanelPrompts(data.data);
          localStorage.setItem("nairrative_panel_prompts", JSON.stringify(data.data));
        }
      }).catch(e => console.error("Failed to load panel prompts:", e));
  }, []);

  // Load analysis: localStorage → Supabase → seed fallback
  useEffect(() => {
    if (activeTab !== "analysis" || !books.length) return;
    const cachedFp = localStorage.getItem("nairrative_analysis_fp");
    const cachedResult = localStorage.getItem("nairrative_analysis_ai");
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setAnalysisAI(JSON.parse(cachedResult)); return; } catch {}
    }
    supabase.from("analysis_cache").select("data").eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (data?.data) {
          setAnalysisAI(data.data);
          localStorage.setItem("nairrative_analysis_ai", JSON.stringify(data.data));
          localStorage.setItem("nairrative_analysis_fp", booksFingerprint);
        } else {
          setAnalysisAI(SEED_ANALYSIS);
        }
      })
      .catch(() => setAnalysisAI(SEED_ANALYSIS));
  }, [activeTab, booksFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAnalysisToSupabase = async (data) => {
    try {
      await supabase.from("analysis_cache").upsert({ id: 1, fingerprint: booksFingerprint, data });
    } catch (e) { console.error("Failed to save analysis to Supabase:", e); }
  };

  const fetchAnalysisAI = async () => {
    if (analysisAILoading || !books.length) return;
    const cachedFp = localStorage.getItem("nairrative_analysis_fp");
    const cachedResult = localStorage.getItem("nairrative_analysis_ai");
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setAnalysisAI(JSON.parse(cachedResult)); return; } catch {}
    }
    setAnalysisAILoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const dimensions = ["temporal", "genre", "thematic", "contextual", "complexity", "emotional", "blindspots", "recent"];
    const ctx = buildBookContext(books);
    const currentYear = new Date().getFullYear();
    const recentBooks = books.filter(b => (b.year_read_end || b.year) >= currentYear - 1);
    const fullList = books.map(toRow).join("\n");
    const recentList = recentBooks.map(toRow).join("\n");
    const result = {};
    for (const dimension of dimensions) {
      try {
        const effectivePrompt = panelPrompts[dimension]?.trim() || DEFAULT_PANEL_PROMPTS[dimension] || "";
        const customInstruction = effectivePrompt ? `\n\nFocus: ${effectivePrompt}` : "";
        const isRecent = dimension === "recent";
        const listLabel = isRecent ? `RECENT BOOKS — last 12 months (${recentBooks.length} books)` : `FULL BOOK LIST (${books.length} books)`;
        const listContent = isRecent ? recentList : fullList;
        const noYearsNote = ["temporal", "genre", "contextual"].includes(dimension) ? "" : "\n\nCRITICAL: Do not reference or cite any specific years in your response.";
        const res = await fetch(CLAUDE_URL, {
          method: "POST", headers: claudeHeaders(session),
          body: JSON.stringify({
            model: "claude-sonnet-4-6", max_tokens: 350,
            system: `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly one key: "${dimension}". Write 3-4 concise sentences focused on patterns and arc — not catalogues of titles or authors. Mention at most 1-2 specific examples to ground the observation. Do not use markdown formatting. Do not invent facts.${customInstruction}\n\nCRITICAL: Year 2010 is a placeholder for all books read 1998–2010. Never describe it as a peak or anomaly.${noYearsNote}`,
            messages: [{ role: "user", content: `${ctx}\n\n--- ${listLabel} ---\n${listContent}\n\nGenerate insight for the "${dimension}" dimension only.` }]
          })
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed[dimension]) result[dimension] = parsed[dimension];
        }
        setAnalysisAI(prev => ({ ...prev, [dimension]: result[dimension] }));
      } catch (e) { console.error(`Analysis AI error (${dimension}):`, e); }
      await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
    }
    localStorage.setItem("nairrative_analysis_ai", JSON.stringify(result));
    localStorage.setItem("nairrative_analysis_fp", booksFingerprint);
    saveAnalysisToSupabase(result);
    setAnalysisAILoading(false);
  };

  // Trigger analysis refresh 2s after a new book is added
  useEffect(() => {
    if (!lastAddedAt) return;
    const t = setTimeout(() => fetchAnalysisAI(), 2000);
    return () => clearTimeout(t);
  }, [lastAddedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePanelPrompt = (dimension, value) => {
    setPanelPrompts(p => {
      const updated = { ...p, [dimension]: value };
      localStorage.setItem("nairrative_panel_prompts", JSON.stringify(updated));
      return updated;
    });
  };

  const resetPanelPrompt = (dimension) => {
    setPanelPrompts(p => {
      const updated = { ...p, [dimension]: DEFAULT_PANEL_PROMPTS[dimension] };
      localStorage.setItem("nairrative_panel_prompts", JSON.stringify(updated));
      return updated;
    });
  };

  const savePanelPromptsToSupabase = async (prompts) => {
    try { await supabase.from("panel_prompts").upsert({ id: 1, data: prompts }); } catch (e) { console.error("Failed to save panel prompts:", e); }
  };

  const regeneratePanel = async (dimension) => {
    if (panelLoading[dimension]) return;
    setPanelLoading(p => ({ ...p, [dimension]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const ctx = buildBookContext(books);
      const currentYear = new Date().getFullYear();
      const listSource = dimension === "recent"
        ? books.filter(b => (b.year_read_end || b.year) >= currentYear - 1)
        : books;
      const fullList = listSource.map(toRow).join("\n");
      const listLabel = dimension === "recent" ? `RECENT BOOKS — last 12 months (${listSource.length} books)` : `FULL BOOK LIST (${books.length} books)`;
      const effectivePrompt = panelPrompts[dimension]?.trim() || DEFAULT_PANEL_PROMPTS[dimension] || "";
      const customInstruction = effectivePrompt ? `\n\nFocus: ${effectivePrompt}` : "";
      const noYearsNote = ["temporal", "genre", "contextual"].includes(dimension) ? "" : "\n\nCRITICAL: Do not reference or cite any specific years in your response.";
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: claudeHeaders(session),
        body: JSON.stringify({
          model: "claude-opus-4-6", max_tokens: 400,
          system: `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly one key: "${dimension}". Write 3-4 concise sentences — surface a non-obvious pattern or insight. Mention at most 1-2 specific authors or titles as illustrative examples; do not catalogue books. Do not use markdown formatting. Do not invent facts.${customInstruction}\n\nCRITICAL: Year 2010 is a placeholder for all books read 1998–2010. Never describe it as a peak or anomaly.${noYearsNote}`,
          messages: [{ role: "user", content: `${ctx}\n\n--- ${listLabel} ---\n${fullList}\n\nGenerate insight for the "${dimension}" dimension only.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result[dimension]) {
          const updated = { ...analysisAI, [dimension]: result[dimension] };
          setAnalysisAI(updated);
          localStorage.setItem("nairrative_analysis_ai", JSON.stringify(updated));
          saveAnalysisToSupabase(updated);
        }
      }
    } catch (e) { console.error("Panel regenerate error:", e); }
    setPanelLoading(p => ({ ...p, [dimension]: false }));
    savePanelPromptsToSupabase(panelPrompts);
    setEditingPanel(null);
  };

  return {
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
  };
}
