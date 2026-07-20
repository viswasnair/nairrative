import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import * as db from "../lib/db";
import { SEED_ANALYSIS } from "../constants/seeds";
import { DEFAULT_PANEL_PROMPTS } from "../constants/config";
import { INTER_REQUEST_DELAY_MS } from "../lib/api";
import { callAI } from "../lib/aiClient";
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
  const fetchAbortRef = useRef(null);
  const regenAbortRef = useRef(null);

  useEffect(() => () => {
    fetchAbortRef.current?.abort();
    regenAbortRef.current?.abort();
  }, []);

  // Load panel prompts from Supabase for cross-device sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      db.getPanelPrompts(session.user.id)
        .then(({ data }) => {
          if (data?.data) {
            setPanelPrompts(data.data);
            localStorage.setItem("nairrative_panel_prompts", JSON.stringify(data.data));
          }
        }).catch(e => console.error("Failed to load panel prompts:", e));
    });
  }, []);

  // Load analysis: localStorage → Supabase → seed fallback.
  // booksFingerprint already changes whenever books changes, so books is not a dep.
  useEffect(() => {
    if (activeTab !== "analysis" || !booksFingerprint) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const cached = await loadCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, session });
      setAnalysisAI(cached ?? SEED_ANALYSIS);
    });
  }, [activeTab, booksFingerprint]);

  const saveAnalysis = async (data) => {
    const { data: { session } } = await supabase.auth.getSession();
    await saveCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, data, session });
  };

  const fetchAnalysisAI = async () => {
    if (analysisAILoading || !books.length) return;
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const { data: { session } } = await supabase.auth.getSession();
    const cached = await loadCachedData({ table: TABLE, lsDataKey: LS_DATA, lsFpKey: LS_FP, fingerprint: booksFingerprint, session });
    if (cached) { setAnalysisAI(cached); return; }
    setAnalysisAILoading(true);
    const result = {};
    for (const dimension of DIMENSIONS) {
      if (controller.signal.aborted) break;
      try {
        const body = buildAnalysisRequestBody({ dimension, books, panelPrompts });
        const data = await callAI(body.messages, { model: body.model, maxTokens: body.max_tokens, system: body.system, signal: controller.signal }, session);
        const parsed = parseAnalysisResponse(data.content?.[0]?.text || "{}", dimension);
        if (parsed) {
          result[dimension] = { ...parsed, generatedAt: new Date().toISOString(), bookCount: body.messages[0].content.includes("RECENT") ? books.filter(b => (b.year_read_end || b.year) >= new Date().getFullYear() - 1).length : books.length };
        }
        if (!controller.signal.aborted) setAnalysisAI(prev => ({ ...prev, [dimension]: result[dimension] }));
      } catch (e) {
        if (e.name === "AbortError") break;
        console.error(`Analysis AI error (${dimension}):`, e);
      }
      await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
    }
    if (!controller.signal.aborted) {
      await saveAnalysis(result);
      setAnalysisAILoading(false);
    }
  };

  // Trigger analysis refresh 2s after a new book is added.
  // fetchAnalysisAI is intentionally excluded from deps: we want the timeout to
  // capture the latest closure value at fire time, not re-register on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!lastAddedAt) return;
    const t = setTimeout(() => fetchAnalysisAI(), 2000);
    return () => clearTimeout(t);
  }, [lastAddedAt]);

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
      if (!session) return true;
      const { error } = await db.savePanelPrompts(session.user.id, prompts);
      if (error) throw error;
      return true;
    } catch (e) { console.error("Failed to save panel prompts:", e); return false; }
  };

  const regeneratePanel = async (dimension) => {
    if (panelLoading[dimension]) return;
    regenAbortRef.current?.abort();
    const controller = new AbortController();
    regenAbortRef.current = controller;
    setPanelLoading(p => ({ ...p, [dimension]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const body = buildRegenerateRequestBody({ dimension, books, panelPrompts });
      const data = await callAI(body.messages, { model: body.model, maxTokens: body.max_tokens, system: body.system, signal: controller.signal }, session);
      if (!controller.signal.aborted) {
        const parsed = parseAnalysisResponse(data.content?.[0]?.text || "{}", dimension);
        if (parsed) {
          const panelData = { ...parsed, generatedAt: new Date().toISOString(), bookCount: books.length };
          const updated = { ...analysisAI, [dimension]: panelData };
          setAnalysisAI(updated);
          await saveAnalysis(updated);
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error("Panel regenerate error:", e);
    }
    if (!controller.signal.aborted) {
      setPanelLoading(p => ({ ...p, [dimension]: false }));
      savePanelPromptsToSupabase(panelPrompts);
      setEditingPanel(null);
    }
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
