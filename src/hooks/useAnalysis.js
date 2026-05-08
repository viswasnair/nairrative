import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { buildBookContext, toRow } from "../lib/bookUtils";
import { SEED_ANALYSIS, } from "../constants/seeds";
import { DEFAULT_PANEL_PROMPTS } from "../constants/config";
import { CLAUDE_URL, claudeHeaders, INTER_REQUEST_DELAY_MS } from "../lib/api";

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from("panel_prompts").select("data").eq("user_id", session.user.id).maybeSingle()
        .then(({ data }) => {
          if (data?.data) {
            setPanelPrompts(data.data);
            localStorage.setItem("nairrative_panel_prompts", JSON.stringify(data.data));
          }
        }).catch(e => console.error("Failed to load panel prompts:", e));
    });
  }, []);

  // Load analysis: localStorage → Supabase → seed fallback
  useEffect(() => {
    if (activeTab !== "analysis" || !books.length) return;
    const cachedFp = localStorage.getItem("nairrative_analysis_fp");
    const cachedResult = localStorage.getItem("nairrative_analysis_ai");
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setAnalysisAI(JSON.parse(cachedResult)); return; } catch { /* malformed cache — fall through to fetch */ }
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      const query = supabase.from("analysis_cache").select("data");
      (session ? query.eq("user_id", session.user.id) : query).maybeSingle()
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
    });
  }, [activeTab, booksFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAnalysisToSupabase = async (data) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from("analysis_cache").upsert(
        { user_id: session.user.id, fingerprint: booksFingerprint, data },
        { onConflict: "user_id" }
      );
    } catch (e) { console.error("Failed to save analysis to Supabase:", e); }
  };

  const fetchAnalysisAI = async () => {
    if (analysisAILoading || !books.length) return;
    const cachedFp = localStorage.getItem("nairrative_analysis_fp");
    const cachedResult = localStorage.getItem("nairrative_analysis_ai");
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setAnalysisAI(JSON.parse(cachedResult)); return; } catch { /* malformed cache — regenerate */ }
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
            model: "claude-sonnet-4-6", max_tokens: 400,
            system: `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly one key: "${dimension}". The value must be a JSON object with two fields: "insight" (3-4 concise sentences on patterns and arc — not catalogues, at most 1-2 illustrative mentions) and "evidence" (array of up to 3 exact book titles verbatim from the provided list that most directly support this insight). Do not use markdown. Do not invent facts or titles.${customInstruction}\n\nCRITICAL: Year 2010 is a placeholder for all books read 1998–2010. Never describe it as a peak or anomaly.${noYearsNote}`,
            messages: [{ role: "user", content: `${ctx}\n\n--- ${listLabel} ---\n${listContent}\n\nGenerate insight for the "${dimension}" dimension only.` }]
          })
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed[dimension]) {
            const val = parsed[dimension];
            const insight = typeof val === "string" ? val : (val.insight || "");
            const evidence = typeof val === "string" ? [] : (Array.isArray(val.evidence) ? val.evidence : []);
            result[dimension] = { insight, evidence, generatedAt: new Date().toISOString(), bookCount: isRecent ? recentBooks.length : books.length };
          }
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from("panel_prompts").upsert(
        { user_id: session.user.id, data: prompts },
        { onConflict: "user_id" }
      );
    } catch (e) { console.error("Failed to save panel prompts:", e); }
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
          model: "claude-opus-4-6", max_tokens: 450,
          system: `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly one key: "${dimension}". The value must be a JSON object with two fields: "insight" (3-4 concise sentences — surface a non-obvious pattern, at most 1-2 illustrative mentions) and "evidence" (array of up to 3 exact book titles verbatim from the provided list that most directly support this insight). Do not use markdown. Do not invent facts or titles.${customInstruction}\n\nCRITICAL: Year 2010 is a placeholder for all books read 1998–2010. Never describe it as a peak or anomaly.${noYearsNote}`,
          messages: [{ role: "user", content: `${ctx}\n\n--- ${listLabel} ---\n${fullList}\n\nGenerate insight for the "${dimension}" dimension only.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed[dimension]) {
          const val = parsed[dimension];
          const insight = typeof val === "string" ? val : (val.insight || "");
          const evidence = typeof val === "string" ? [] : (Array.isArray(val.evidence) ? val.evidence : []);
          const panelData = { insight, evidence, generatedAt: new Date().toISOString(), bookCount: listSource.length };
          const updated = { ...analysisAI, [dimension]: panelData };
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
