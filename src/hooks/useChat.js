import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { buildBookContext, toRow } from "../lib/bookUtils";
import { callAI, AI_MODELS } from "../lib/aiClient";

const ANALYSIS_LABELS = {
  temporal: "Reading Pace & Volume", genre: "Genre Evolution",
  geographic: "Geographic & Cultural Range", author: "Author Patterns",
  thematic: "Themes & Preoccupations", contextual: "Life Context & Reading",
  complexity: "Complexity Balance", emotional: "Emotional Arc", discovery: "Discovery Patterns",
};

const LENS_LABELS = {
  "more-like": "More Like Last Book", "more-by-last": "More By Last Author",
  "similar-author": "Books By Similar Author", "trending": "What's Trending",
  "challenge": "Challenge Me", "quick": "Quick Reads", "gaps": "Fill My Gaps",
  "surprise": "Surprise Me", "finish": "Finish the Series",
  "loved": "If You Loved…", "authors-like": "Books By Authors Like…",
  "mood": "Match My Mood", "genre-pick": "By Genre", "topic": "By Topic",
  "occasion": "For the Occasion", "pair": "Pair It",
};

export function useChat({ books, stats, analysisInsights, analysisAI, intentResults, session }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I know your complete reading history. Ask me anything: your patterns, what to read next, your top authors, surprising stats, or anything else!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [seriesRecap, setSeriesRecap] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState("Wheel of Time");
  const chatEndRef = useRef(null);
  const chatAbortRef = useRef(null);
  const seriesAbortRef = useRef(null);

  useEffect(() => () => {
    chatAbortRef.current?.abort();
    seriesAbortRef.current?.abort();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    const userMsg = { role: "user", content: chatInput };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const summary = buildBookContext(books);
      const fullList = books.map(toRow).join("\n");
      const withPages = books.filter(b => b.pages);
      const totalPages = withPages.reduce((s, b) => s + b.pages, 0);
      const uniqueAuthors = new Set(books.map(b => b.author)).size;
      const booksPerYear = stats.readingSpan ? Math.round(stats.total / stats.readingSpan) : null;
      const avgPagesPerBook = withPages.length ? Math.round(totalPages / withPages.length) : null;
      const pagesPerDay = stats.readingSpan && totalPages ? (totalPages / (stats.readingSpan * 365)).toFixed(1) : null;
      const overviewContext = [
        `Total: ${stats.total} books · ${uniqueAuthors} authors · ${stats.readingSpan} years reading`,
        booksPerYear ? `Pace: ${booksPerYear} books/year` : "",
        avgPagesPerBook ? `Pages: avg ${avgPagesPerBook} pages/book · ${pagesPerDay} pages/day` : "",
        stats.sortedYears[0] ? `Peak year: ${stats.sortedYears[0][0]} (${stats.sortedYears[0][1]} books)` : "",
        stats.sortedAuthors[0] ? `#1 author: ${stats.sortedAuthors[0][0]} (${stats.sortedAuthors[0][1]} books)` : "",
        stats.sortedGenres[0] ? `Top genre: ${stats.sortedGenres[0][0]} (${stats.sortedGenres[0][1]} books)` : "",
        analysisInsights ? `Fiction/Non-fiction split: ${analysisInsights.fictionCount} fiction (${analysisInsights.fictionPct}%) · ${analysisInsights.nonFictionCount} non-fiction` : "",
        analysisInsights ? `Series books: ${analysisInsights.seriesCount} (${analysisInsights.seriesPct}%)` : "",
        analysisInsights?.loyaltyRatio ? `${analysisInsights.loyaltyRatio}% of books from authors read 5+ times` : "",
        "",
        "Books per year: " + Object.entries(stats.byYear).sort((a, b) => a[0] - b[0]).map(([y, c]) => `${y}:${c}`).join(", "),
        "",
        "Genre breakdown: " + stats.sortedGenres.slice(0, 15).map(([g, c]) => `${g}:${c}`).join(", "),
        "",
        "Top authors: " + stats.sortedAuthors.slice(0, 20).map(([a, c]) => `${a}:${c}`).join(", "),
        "",
        Object.keys(stats.byCountry).length
          ? "Author origins: " + Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, n]) => `${c}:${n}`).join(", ")
          : "",
      ].filter(Boolean).join("\n");

      const resolvedAnalysis = analysisAI ?? (() => {
        try { return JSON.parse(localStorage.getItem("nairrative_analysis_ai") || "null"); } catch { return null; }
      })();
      const resolvedRecs = Object.keys(intentResults).length > 0 ? intentResults : (() => {
        try { return JSON.parse(localStorage.getItem("nairrative_recs") || "null"); } catch { return null; }
      })();

      const analysisContext = resolvedAnalysis && typeof resolvedAnalysis === "object"
        ? Object.entries(resolvedAnalysis)
            .filter(([, v]) => v && typeof v === "string")
            .map(([k, v]) => `[${ANALYSIS_LABELS[k] || k}]\n${v}`)
            .join("\n\n")
        : "";

      const recsContext = resolvedRecs && typeof resolvedRecs === "object"
        ? Object.entries(resolvedRecs)
            .filter(([, v]) => Array.isArray(v) && v.length > 0 && v[0]?.title)
            .map(([k, v]) => {
              const b = v[0];
              return `[${LENS_LABELS[k] || k}]\n"${b.title}" by ${b.author}${b.year ? ` (${b.year})` : ""}${b.reason ? ` — ${b.reason}` : ""}`;
            })
            .join("\n\n")
        : "";

      let newReleasesContext = "";
      try {
        const { data: releases } = await supabase
          .from("new_releases").select("title, author, series, published_date")
          .gte("published_date", `${new Date().getFullYear() - 2}-01-01`)
          .order("published_date", { ascending: false }).limit(20);
        if (releases?.length) {
          const readTitles = new Set(books.map(b => b.title?.toLowerCase().trim()));
          const unread = releases.filter(r => !readTitles.has(r.title?.toLowerCase().trim()));
          if (unread.length) {
            newReleasesContext = unread
              .map(r => `• "${r.title}" by ${r.author}${r.series ? ` (${r.series})` : ""}${r.published_date ? ` — ${r.published_date}` : ""}`)
              .join("\n");
          }
        }
      } catch { /* supplementary — silent fail */ }

      const seriesRecapContext = seriesRecap ? `Series: ${selectedSeries}\n${seriesRecap}` : "";

      const data = await callAI(
        updated.map(m => ({ role: m.role, content: m.content })),
        {
          model: AI_MODELS.standard, maxTokens: 1200, signal: controller.signal,
          system: `You are an insightful personal reading assistant with full access to the user's reading database, AI analysis, and recommendations. Use the data below to answer questions accurately and specifically.

IMPORTANT CONTEXT: Year 2010 is a collective placeholder for all books read between 1998 and 2010 — not a single-year anomaly. Do not treat it as unusual.

--- DATABASE SUMMARY ---
${summary}

--- OVERVIEW STATS & KPIs ---
${overviewContext}

--- FULL BOOK LIST (${books.length} books) ---
${fullList}
${analysisContext ? `\n--- AI ANALYSIS PANELS ---\n${analysisContext}` : ""}
${recsContext ? `\n--- CURRENT RECOMMENDATIONS (one curated pick per lens) ---\n${recsContext}` : ""}
${newReleasesContext ? `\n--- NEW RELEASES FROM YOUR AUTHORS (unread) ---\n${newReleasesContext}` : ""}
${seriesRecapContext ? `\n--- SERIES RECAP ---\n${seriesRecapContext}` : ""}

Answer primarily from the data, with specific references to books, authors, years, and patterns. When the user asks about analysis insights or recommendations, draw on the AI analysis panels and recommendation results above. For general knowledge questions about books or authors not requiring personal library data, you may use your broader knowledge — but never invent books the user has read.

Formatting rules: Write in clean, natural prose. Do not use markdown syntax — no asterisks for bold or italic, no hash symbols for headers, no hyphens or asterisks as bullet points. When a list genuinely helps, use "1." for numbered lists or "•" for bullet points. Keep responses direct and conversational — not a structured report.`,
        },
        session
      );
      if (data.error) console.error("Chat API error:", data.error);
      if (!controller.signal.aborted)
        setMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || "Sorry, try again." }]);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("sendChat error:", e);
        setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
      }
    }
    finally { if (!controller.signal.aborted) setChatLoading(false); }
  };

  const generateSeriesRecap = async (seriesName) => {
    if (!seriesName || seriesLoading) return;
    seriesAbortRef.current?.abort();
    const controller = new AbortController();
    seriesAbortRef.current = controller;
    setSeriesLoading(true);
    setSeriesRecap(null);
    const seriesBks = books.filter(b => b.series === seriesName).sort((a, b) => (a.id - b.id));
    try {
      const data = await callAI(
        [{ role: "user", content: `Please recap the "${seriesName}" series. The reader has read these books (in order): ${seriesBks.map((b, i) => `${i+1}. ${b.title} (${b.year_read_end})`).join(", ")}. Give a short recap of each book and a "What to remember" section with the 3–5 most important things going into the next installment.` }],
        {
          model: AI_MODELS.fast, maxTokens: 800, signal: controller.signal,
          system: `You are a literary companion helping a reader catch up on a book series. Write engaging recaps — key characters, major plot turns, how each book ends. Keep each book recap to 2–3 sentences. Be concise.`,
        },
        session
      );
      if (!controller.signal.aborted)
        setSeriesRecap({ series: seriesName, books: seriesBks, text: data.content?.[0]?.text || "Could not generate recap." });
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error("generateSeriesRecap error:", e);
      setSeriesRecap({ series: seriesName, books: seriesBks, text: "Could not generate recap. Please try again." });
    }
    finally { if (!controller.signal.aborted) setSeriesLoading(false); }
  };

  return {
    messages, chatInput, setChatInput, chatLoading, chatEndRef, sendChat,
    seriesRecap, setSeriesRecap, seriesLoading, selectedSeries, setSelectedSeries, generateSeriesRecap,
  };
}
