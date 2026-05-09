import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { SEED_ANALYSIS } from "../constants/seeds";
import { DEFAULT_PANEL_PROMPTS } from "../constants/config";
import { CLAUDE_URL, claudeHeaders, INTER_REQUEST_DELAY_MS } from "../lib/api";
import { loadCachedData, saveCachedData } from "../lib/aiCache";
import { buildAnalysisRequestBody, buildRegenerateRequestBody, parseAnalysisResponse } from "../lib/analysisPrompts";

const LS_DATA = "nairrative_analysis_ai";
const LS_FP   = "nairrative_analysis_fp";
const TABLE   = "analysis_cache";
const DIMENSIONS = ["temporal", "genre", "thematic", "contextual", "complexity", "emotional", "blindspots", "recent"];

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const cached = await loadCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, session });
      setAnalysisAI(cached ?? SEED_ANALYSIS);
    });
  }, [activeTab, booksFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAnalysis = async (data) => {
    const { data: { session } } = await supabase.auth.getSession();
    await saveCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, data, session });
  };

  const fetchAnalysisAI = async () => {
    if (analysisAILoading || !books.length) return;
    const cachedFp = localStorage.getItem(LS_FP);
    const cachedResult = localStorage.getItem(LS_DATA);
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setAnalysisAI(JSON.parse(cachedResult)); return; } catch { /* malformed — regenerate */ }
    }
    setAnalysisAILoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const result = {};
    for (const dimension of DIMENSIONS) {
      try {
        const body = buildAnalysisRequestBody({ dimension, books, panelPrompts });
        const res = await fetch(CLAUDE_URL, { method: "POST", headers: claudeHeaders(session), body: JSON.stringify(body) });
        const data = await res.json();
        const parsed = parseAnalysisResponse(data.content?.[0]?.text || "{}", dimension);
        if (parsed) {
          result[dimension] = { ...parsed, generatedAt: new Date().toISOString(), bookCount: body.messages[0].content.includes("RECENT") ? books.filter(b => (b.year_read_end || b.year) >= new Date().getFullYear() - 1).length : books.length };
        }
        setAnalysisAI(prev => ({ ...prev, [dimension]: result[dimension] }));
      } catch (e) { console.error(`Analysis AI error (${dimension}):`, e); }
      await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
    }
    await saveAnalysis(result);
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
      const body = buildRegenerateRequestBody({ dimension, books, panelPrompts });
      const res = await fetch(CLAUDE_URL, { method: "POST", headers: claudeHeaders(session), body: JSON.stringify(body) });
      const data = await res.json();
      const parsed = parseAnalysisResponse(data.content?.[0]?.text || "{}", dimension);
      if (parsed) {
        const panelData = { ...parsed, generatedAt: new Date().toISOString(), bookCount: books.length };
        const updated = { ...analysisAI, [dimension]: panelData };
        setAnalysisAI(updated);
        await saveAnalysis(updated);
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
