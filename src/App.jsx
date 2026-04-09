import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, Legend, LabelList
} from "recharts";

// ── THEME ──────────────────────────────────────────────────────────────────
const G = {
  gold: "#2d6a4f", goldLight: "#3d8a66", goldDim: "#6aab8a",
  copper: "#c0522a",
  blue: "#2563eb", red: "#dc2626", green: "#0e9488", purple: "#7c3aed",
  bg: "#f7f8fa", card: "#ffffff", card2: "#f0f2f6", border: "#e4e7ed",
  text: "#111827", muted: "#6b7280", dimmed: "#d1d5db", hover: "#e8eaef",
};

const GENRE_COLORS = {
  "Fantasy": "#c9a84c", "Sci-Fi": "#4a9eff", "Thriller": "#e06c75",
  "Mystery": "#ff9f7f", "Literary Fiction": "#98d8c8", "Historical Fiction": "#c3a6ff",
  "Non-Fiction": "#ffd166", "Graphic Novel": "#06d6a0", "Memoir": "#74b9ff",
  "Biography": "#81ecec", "Classic": "#fab1a0", "Philosophy": "#a29bfe",
  "Popular Science": "#55c9a0", "Self-Help": "#fdcb6e", "Travel": "#e17055",
  "Horror": "#b2bec3", "History": "#e67e22", "Politics": "#fd79a8",
  "Economics": "#fdcb6e", "Psychology": "#6c5ce7", "Business": "#00b894",
};

const READING_CONTEXT = `This reader has consumed 345 books across 17 years (2010–2026). Key patterns:

TOP AUTHORS: Brandon Sanderson (many books – Mistborn, Stormlight Archive, Skyward, Cosmere novellas), Sidney Sheldon (thrillers), Sarah J. Maas (ACOTAR series), Rebecca Yarros (Empyrean series), J.K. Rowling (Harry Potter), Christopher Paolini (Eragon), Ken Follett (Kingsbridge), Agatha Christie (mysteries), Amish Tripathi (Indian mythology fantasy), Robert Jordan (Wheel of Time), Dan Brown (thrillers), Andy Weir (sci-fi), Walter Isaacson (biographies), Yuval Noah Harari (non-fiction), Perumal Murugan (Indian literary), Arundhati Roy (Indian literary), Appupen (Indian graphic novels).

GENRES (ranked): Thriller (~83 books) > Literary Fiction (~55) > Fantasy (~54) > Sci-Fi (~47) > Biography (~19) > Popular Science (~17) > History (~17) > Philosophy (~9) > Politics (~8) > Historical Fiction (~8) > Mystery (~6) > Economics (~5) > Graphic Novel (~5) > Non-Fiction (~5) > Psychology (~3) > Self-Help (~2) > Horror (~1) > Business (~1).

YEAR HIGHLIGHTS: 2010 (heavy reading – 130 books, likely early reading list), 2011-2014 (fantasy exploration), 2015-2017 (diverse non-fiction phase), 2018-19 (literary fiction surge), 2020-21 (pandemic reading peak – 24+40 books), 2022 (sudden drop to 3), 2023-24 (hiatus), 2025-26 (comeback with romantasy – ACOTAR + Empyrean).

STRONG INTERESTS: Thrillers and crime fiction, epic fantasy, Indian literature, science non-fiction, literary fiction, biographies of scientists/leaders, graphic novels, history and politics.

POTENTIAL GAPS: Literary romance, poetry, westerns, African literature, Japanese fiction beyond manga, Latin American magical realism beyond Marquez, contemporary cozy mysteries, Nordic noir beyond Nesbo.

RECENT DIRECTION (2025-26): Clear romantasy and fantasy phase – ACOTAR series, Empyrean series, Cosmere. Also some literary fiction. Suggests appetite for character-driven fantasy with romance, not just plot-heavy epic fantasy.`;

// ── NORMALIZE BOOK (joins authors from Supabase nested select) ────────────
function normalizeBook(b) {
  const sortedAuthors = (b.book_authors || [])
    .sort((x, y) => x.author_order - y.author_order)
    .map(ba => ba.authors);
  return {
    ...b,
    authors: sortedAuthors,
    author: sortedAuthors.map(a => a.name).join(" & "),
    country: sortedAuthors[0]?.country || "",
    year: b.year_read_end,
    genre: Array.isArray(b.genre) ? b.genre : (b.genre ? [b.genre] : []),
  };
}

// ── MULTI SELECT ─────────────────────────────────────────────────────────
function MultiSelect({ options, selected, onChange, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div onClick={() => setOpen(o => !o)} style={{ background: G.card2, border: `1px solid ${open ? G.goldDim : G.border}`, borderRadius: 8, color: selected.length ? G.text : G.muted, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, userSelect: "none", transition: "border-color 0.2s" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{label}</span>
        <span style={{ color: G.muted, fontSize: 10, flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, zIndex: 200, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
          {selected.length > 0 && (
            <div onClick={() => onChange([])} style={{ padding: "8px 14px", fontSize: 11, color: G.gold, cursor: "pointer", borderBottom: `1px solid ${G.border}` }}>✕ Clear all</div>
          )}
          {options.map(o => (
            <div key={o} onClick={() => toggle(o)} style={{ padding: "8px 14px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: selected.includes(o) ? G.text : G.muted, background: selected.includes(o) ? `${G.gold}10` : "transparent" }}>
              <div style={{ width: 14, height: 14, border: `1px solid ${selected.includes(o) ? G.gold : G.border}`, borderRadius: 3, background: selected.includes(o) ? G.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: "#000", fontWeight: 700 }}>
                {selected.includes(o) && "✓"}
              </div>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RANGE FILTER ─────────────────────────────────────────────────────────
function RangeFilter({ chartId, allYears, ranges, onSet }) {
  if (!allYears || allYears.length === 0) return null;
  const r = ranges[chartId] || { from: allYears[0], to: allYears[allYears.length - 1] };
  const sel = { background: G.card2, border: `1px solid ${G.border}`, borderRadius: 4, color: G.muted, fontSize: 10, padding: "2px 4px", outline: "none", cursor: "pointer" };
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      <span style={{ color: G.dimmed, fontSize: 10 }}>From</span>
      <select style={sel} value={r.from} onChange={e => onSet(chartId, Number(e.target.value), r.to)}>
        {allYears.map(y => <option key={y} value={y}>{y === 2010 ? "Pre-2011" : y}</option>)}
      </select>
      <span style={{ color: G.dimmed, fontSize: 10 }}>to</span>
      <select style={sel} value={r.to} onChange={e => onSet(chartId, r.from, Number(e.target.value))}>
        {allYears.map(y => <option key={y} value={y}>{y === 2010 ? "Pre-2011" : y}</option>)}
      </select>
    </div>
  );
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: G.muted, fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || G.gold, fontSize: 13, fontWeight: 600 }}>
          {p.name !== "count" && p.name !== undefined ? `${p.name}: ` : ""}{p.value}
        </p>
      ))}
    </div>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [libGenres, setLibGenres] = useState([]);
  const [libYears, setLibYears] = useState([]);
  const [libAuthors, setLibAuthors] = useState([]);
  const [libSort, setLibSort] = useState("year");
  const [chartRanges, setChartRanges] = useState({});
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I know your complete reading history. Ask me anything: your patterns, what to read next, your top authors, surprising stats, or anything else!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [analysisChat, setAnalysisChat] = useState([]);
  const [analysisChatInput, setAnalysisChatInput] = useState("");
  const [analysisChatLoading, setAnalysisChatLoading] = useState(false);
  const [analysisAI, setAnalysisAI] = useState(null);
  const [analysisAILoading, setAnalysisAILoading] = useState(false);
  const [intentInputs, setIntentInputs] = useState({});
  const [intentResults, setIntentResults] = useState({});
  const [intentLoading, setIntentLoading] = useState({});
  const [newBook, setNewBook] = useState({ title: "", author: "", year: 2026, genre: "Fantasy", country: "", pages: "" });
  const [addMsg, setAddMsg] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
  const [seriesRecap, setSeriesRecap] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:wght@300;400;600&family=Lora:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Fraunces:ital,wght@0,300;1,300&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    supabase
      .from("books")
      .select("*, book_authors(author_order, authors(id, name, country))")
      .order("id")
      .then(({ data, error }) => {
        if (error) {
          console.error("Supabase fetch error:", error);
          setBooksLoading(false);
          return;
        }
        if (data) {
          try {
            setBooks(data.map(normalizeBook));
          } catch (e) {
            console.error("normalizeBook error:", e, data[0]);
          }
        }
        setBooksLoading(false);
      })
      .catch(e => {
        console.error("Supabase connection error:", e);
        setBooksLoading(false);
      });
  }, []);

  const AUTO_RECS = ["more-like", "more-by-last", "similar-author", "trending", "challenge", "quick", "gaps", "surprise", "finish"];

  const INPUT_DEFAULTS = {
    "loved": ["Dune", "The Name of the Wind", "The White Tiger", "Gone Girl", "Foundation", "The Remains of the Day"],
    "authors-like": ["Brandon Sanderson", "Agatha Christie", "Yuval Noah Harari", "Arundhati Roy", "Michael Crichton", "Neil Gaiman"],
    "mood": ["dark and atmospheric", "light and funny", "epic and sweeping", "thought-provoking non-fiction", "cozy and comforting", "fast-paced thriller"],
    "genre-pick": Object.keys(GENRE_COLORS),
    "topic": ["artificial intelligence", "Indian history", "climate and environment", "espionage", "philosophy of mind", "exploration and adventure"],
    "occasion": ["a long flight", "book club", "summer reading", "a lazy weekend", "gift for a friend who loves thrillers", "something to read before bed"],
    "pair": ["Oppenheimer (film)", "Shogun (TV series)", "a trip to Japan", "watching the World Cup", "Interstellar (film)", "reading about WW2"],
  };

  // Fingerprint catches adds, removes, and edits to title/year/genre
  const booksFingerprint = useMemo(() =>
    books.map(b => `${b.id}|${b.title}|${b.year}|${(b.genre||[]).join('')}`).join(','),
  [books]);

  useEffect(() => {
    if (activeTab !== "analysis" || !books.length) return;
    fetchAnalysisAI();
  }, [activeTab, booksFingerprint]);

  useEffect(() => {
    if (activeTab !== "recs") return;
    // Auto panels
    AUTO_RECS.forEach(id => { if (!intentResults[id] && !intentLoading[id]) fetchIntentRecs(id); });
    // Input panels — set random defaults and fetch if not already done
    Object.entries(INPUT_DEFAULTS).forEach(([id, options]) => {
      if (!intentResults[id] && !intentLoading[id]) {
        const pick = options[Math.floor(Math.random() * options.length)];
        setIntentInputs(p => ({ ...p, [id]: p[id] || pick }));
        setTimeout(() => fetchIntentRecs(id, pick), 100);
      }
    });
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── COMPUTED DATA ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byYear = {}, byYearTracked = {}, byGenre = {}, byAuthor = {}, byCountry = {};
    books.forEach(b => {
      byYear[b.year] = (byYear[b.year] || 0) + 1;
      if (b.year_read_start === b.year_read_end)
        byYearTracked[b.year] = (byYearTracked[b.year] || 0) + 1;
      (b.genre || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
      byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
      if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
    });
    const sortedAuthors = Object.entries(byAuthor).sort((a, b) => b[1] - a[1]);
    const sortedGenres = Object.entries(byGenre).sort((a, b) => b[1] - a[1]);
    const sortedYears = Object.entries(byYearTracked).sort((a, b) => b[1] - a[1]);
    const minYearStart = books.length ? Math.min(...books.map(b => b.year_read_start)) : 1998;
    const maxYearEnd = books.length ? Math.max(...books.map(b => b.year_read_end)) : new Date().getFullYear();
    const readingSpan = maxYearEnd - minYearStart + 1;
    return { total: books.length, byYear, byYearTracked, byGenre, byAuthor, byCountry, sortedAuthors, sortedGenres, sortedYears, readingSpan };
  }, [books]);


  const analysisInsights = useMemo(() => {
    const fGen = new Set(["Fantasy","Sci-Fi","Thriller","Mystery","Literary Fiction","Historical Fiction","Classic","Horror"]);

    // Temporal
    const years = Object.keys(stats.byYearTracked).map(Number).sort();
    const fullRange = Array.from({length: years[years.length-1] - years[0] + 1}, (_, i) => years[0] + i);
    const trackedBooks = books.filter(b => b.year_read_start === b.year_read_end);
    const avgPerActive = Math.round(trackedBooks.length / years.length);
    let maxGap = 0, curGap = 0, gapStart = null, longestGapStart = null;
    for (const y of fullRange) {
      if (!stats.byYear[y]) { if (!curGap) gapStart = y; curGap++; if (curGap > maxGap) { maxGap = curGap; longestGapStart = gapStart; } }
      else curGap = 0;
    }

    // Genre & Form
    const fictionCount = books.filter(b => b.fiction !== undefined ? b.fiction : (b.genre || []).some(g => fGen.has(g))).length;
    const fictionPct = Math.round(fictionCount / books.length * 100);
    const graphicNovels = books.filter(b => (b.genre || []).includes("Graphic Novel")).length;
    const genreCount = Object.keys(stats.byGenre).length;
    const era = (s, e) => books.filter(b => b.year >= s && b.year <= e);
    const topGenreIn = sub => Object.entries(sub.reduce((a, b) => { (b.genre||[]).forEach(g=>{a[g]=(a[g]||0)+1;}); return a; }, {})).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";
    const genreEra = [
      { era: "2010–14", top: topGenreIn(era(2010,2014)) },
      { era: "2015–19", top: topGenreIn(era(2015,2019)) },
      { era: "2020–24", top: topGenreIn(era(2020,2024)) },
      { era: "2025–26", top: topGenreIn(era(2025,2026)) },
    ];

    // Geographic
    const uniqueCountries = Object.keys(stats.byCountry).length;
    const topCountries = Object.entries(stats.byCountry).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const indiaPct = Math.round((stats.byCountry["India"]||0) / books.length * 100);

    // Author behavior
    const authorEntries = Object.entries(stats.byAuthor);
    const loyal = authorEntries.filter(([,c])=>c>=5).sort((a,b)=>b[1]-a[1]);
    const sampledCount = authorEntries.filter(([,c])=>c===1).length;
    const booksFromLoyal = loyal.reduce((s,[,c])=>s+c,0);
    const loyaltyRatio = Math.round(booksFromLoyal / books.length * 100);

    // Complexity — derived from genre tags only, no hardcoded authors
    const challengingCount = books.filter(b => (b.genre||[]).some(g => ["Classic","Philosophy","Literary Fiction"].includes(g))).length;
    const challengePct = Math.round(challengingCount / books.length * 100);
    const challengingAuthorsFromData = [...new Set(books.filter(b => (b.genre||[]).some(g => ["Classic","Philosophy"].includes(g))).map(b => b.author))].slice(0, 8);

    // Series — derived from books with a series field set
    const seriesBooks = books.filter(b => b.series && b.series.trim() !== "");
    const seriesCount = seriesBooks.length;
    const seriesPct = Math.round(seriesCount / books.length * 100);

    // Emotional arc: fiction % across dynamic era buckets derived from actual year range
    const allBookYears = [...new Set(books.map(b => b.year))].sort((a,b) => a-b);
    const minY = allBookYears[0] ?? 2010;
    const maxY = allBookYears[allBookYears.length - 1] ?? new Date().getFullYear();
    const span = maxY - minY;
    const eraFictionPct = (s, e) => { const sub = era(s,e); return sub.length ? Math.round(sub.filter(b=>b.fiction !== undefined ? b.fiction : (b.genre||[]).some(g=>fGen.has(g))).length/sub.length*100) : null; };
    const eraBuckets = [
      { era: `${minY}–${minY + Math.floor(span*0.25)}`, s: minY, e: minY + Math.floor(span*0.25) },
      { era: `${minY + Math.floor(span*0.25)+1}–${minY + Math.floor(span*0.5)}`, s: minY + Math.floor(span*0.25)+1, e: minY + Math.floor(span*0.5) },
      { era: `${minY + Math.floor(span*0.5)+1}–${minY + Math.floor(span*0.75)}`, s: minY + Math.floor(span*0.5)+1, e: minY + Math.floor(span*0.75) },
      { era: `${minY + Math.floor(span*0.75)+1}–${maxY}`, s: minY + Math.floor(span*0.75)+1, e: maxY },
    ];
    const fictionByEra = eraBuckets.map(({ era: e, s, e: end }) => ({ era: e, pct: eraFictionPct(s, end) })).filter(e => e.pct !== null);
    const peakFictionEra = fictionByEra.reduce((a,b) => a.pct > b.pct ? a : b, fictionByEra[0]);
    const lowFictionEra = fictionByEra.reduce((a,b) => a.pct < b.pct ? a : b, fictionByEra[0]);

    // Notable years — computed from actual volume, no hardcoded life events
    const yearCounts = Object.entries(stats.byYear).map(([y,c]) => ({ year: parseInt(y), count: c })).sort((a,b) => a.year - b.year);
    const yearAvg = yearCounts.reduce((s,y) => s+y.count, 0) / yearCounts.length;
    const notableYears = yearCounts.map(y => ({
      year: String(y.year),
      books: y.count,
      label: y.count >= yearAvg * 2 ? "Peak year" : y.count <= 3 ? "Low activity" : y.count > yearAvg * 1.3 ? "Active year" : y.count < yearAvg * 0.5 ? "Quiet year" : null,
    })).filter(y => y.label).sort((a,b) => b.books - a.books).slice(0, 5).sort((a,b) => a.year - b.year);

    // Discovery: top author concentrations from actual data
    const topAuthorChannels = loyal.slice(0, 4).map(([author, count]) => ({
      channel: author,
      example: `${count} books read`,
      color: G.gold,
    }));

    return {
      peakYear: stats.sortedYears[0], avgPerActive, maxGap, longestGapStart,
      fictionCount, nonFictionCount: books.length - fictionCount, fictionPct, graphicNovels, genreCount, genreEra,
      uniqueCountries, topCountries, indiaPct,
      loyal, sampledCount, booksFromLoyal, loyaltyRatio,
      challengingCount, challengePct, challengingAuthorsFromData,
      seriesCount, seriesPct,
      fictionByEra, peakFictionEra, lowFictionEra,
      notableYears, topAuthorChannels,
    };
  }, [books, stats]);

  const filteredBooks = useMemo(() =>
    books.filter(b => {
      if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false;
      if (libGenres.length > 0 && !(b.genre || []).some(g => libGenres.includes(g))) return false;
      if (libYears.length > 0 && !libYears.includes(String(b.year))) return false;
      if (libAuthors.length > 0 && !(b.authors || []).some(a => libAuthors.includes(a.name))) return false;
      return true;
    }).sort((a, b) => {
      if (libSort === "year") return b.year - a.year;
      if (libSort === "title") return a.title.localeCompare(b.title);
      if (libSort === "author") return a.author.localeCompare(b.author);
      return 0;
    }), [books, search, libGenres, libYears, libAuthors, libSort]);

  const allGenres = useMemo(() => Object.keys(GENRE_COLORS), []);
  const allYears = useMemo(() => Object.keys(stats.byYear).sort().reverse(), [stats]);
  const allAuthors = useMemo(() => [...new Set(books.flatMap(b => (b.authors || []).map(a => a.name)))].sort(), [books]);
  const allYearsList = useMemo(() => Object.keys(stats.byYearTracked).sort().map(Number), [stats]);

  const allYearsListFull = useMemo(() => Object.keys(stats.byYear).sort().map(Number), [stats]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const aiHeaders = () => ({
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  });

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setChatInput("");
    setChatLoading(true);
    try {
      const summary = buildBookContext();
      const fullList = books
        .map(b => `[${b.year}] "${b.title}" by ${b.author} | ${(b.genre||[]).join("/")}${b.pages ? " | " + b.pages + "pp" : ""}${b.series ? " | series: " + b.series : ""}${b.fiction !== undefined ? " | " + (b.fiction ? "fiction" : "non-fiction") : ""}${b.notes ? " | " + b.notes : ""}`)
        .join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1200,
          system: `You are an insightful personal reading assistant with full access to the user's reading database. Use the data below to answer questions accurately and specifically.

IMPORTANT CONTEXT: Year 2010 is a collective placeholder for all books read between 1998 and 2010 — not a single-year anomaly. Do not treat it as unusual.

--- DATABASE SUMMARY ---
${summary}

--- FULL BOOK LIST (${books.length} books) ---
${fullList}

Answer with specific references to books, authors, years, and patterns from the data. Be conversational, direct, and accurate. Never invent books or facts not present in the database.`,
          messages: updated.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || data.error?.message || "Sorry, try again." }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]); }
    finally { setChatLoading(false); }
  };


  const getChartRange = (id) => {
    const timeCharts = new Set(["yc", "fn", "ge"]);
    const defaultFrom = timeCharts.has(id) ? (allYearsList[0] ?? 2011) : (allYearsListFull[0] ?? 2010);
    const defaultTo = timeCharts.has(id) ? (allYearsList[allYearsList.length - 1] ?? 2026) : (allYearsListFull[allYearsListFull.length - 1] ?? 2026);
    return {
      from: chartRanges[id]?.from ?? defaultFrom,
      to: chartRanges[id]?.to ?? defaultTo,
    };
  };
  const setChartRange = (id, from, to) => setChartRanges(p => ({ ...p, [id]: { from, to } }));

  const autoFillBookDetails = async () => {
    if (!newBook.title.trim() || !newBook.author.trim()) { setAddMsg("Enter title and author first."); return; }
    setAutoFilling(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 200,
          system: `You are a book database. Given a book title and author, return ONLY valid JSON (no markdown) with: genre (one of: Fantasy, Sci-Fi, Thriller, Mystery, Literary Fiction, Historical Fiction, Non-Fiction, Graphic Novel, Memoir, Biography, Classic, Philosophy, Science, Self-Help, Travel, Horror, History), country (author's country of birth/nationality), year (original publication year as number), pages (approximate page count as number).`,
          messages: [{ role: "user", content: `Book: "${newBook.title}" by ${newBook.author}` }]
        })
      });
      const data = await res.json();
      const txt = data.content?.[0]?.text || "";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setNewBook(p => ({ ...p, genre: parsed.genre || p.genre, country: parsed.country || p.country, year: parsed.year || p.year, pages: parsed.pages ? String(parsed.pages) : p.pages }));
      setAddMsg("✓ Details auto-filled! Review and adjust if needed.");
    } catch { setAddMsg("Could not auto-fill. Please enter details manually."); }
    setAutoFilling(false);
    setTimeout(() => setAddMsg(""), 5000);
  };

  const generateSeriesRecap = async (seriesName) => {
    if (!seriesName || seriesLoading) return;
    setSeriesLoading(true);
    setSeriesRecap(null);
    const seriesBooks = books.filter(b => b.series === seriesName).sort((a, b) => (a.id - b.id));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1500,
          system: `You are a knowledgeable literary companion helping a reader catch up on a book series before continuing. Write vivid, engaging recaps — not dry plot summaries, but the kind of catch-up a friend would give you over coffee. Include key characters, major plot turns, how each book ends, and the most important things to remember going into the next book. Keep each book recap to 3–5 sentences.`,
          messages: [{ role: "user", content: `Please recap the "${seriesName}" series. The reader has read these books (in order): ${seriesBooks.map((b, i) => `${i+1}. ${b.title} (${b.year_read_end})`).join(", ")}. Give a short recap of each book and a "What to remember" section with the 3–5 most important things going into the next installment.` }]
        })
      });
      const data = await res.json();
      setSeriesRecap({ series: seriesName, books: seriesBooks, text: data.content?.[0]?.text || data.error?.message || "Could not generate recap." });
    } catch { setSeriesRecap({ series: seriesName, books: seriesBooks, text: "Connection error. Please check your API key and try again." }); }
    finally { setSeriesLoading(false); }
  };

  const buildBookContext = () => {
    const byYear = {}, byGenre = {}, byAuthor = {}, byCountry = {};
    books.forEach(b => {
      const yr = b.year_read_end || b.year;
      byYear[yr] = (byYear[yr] || 0) + 1;
      (b.genre || []).forEach(g => { byGenre[g] = (byGenre[g] || 0) + 1; });
      byAuthor[b.author] = (byAuthor[b.author] || 0) + 1;
      if (b.country) byCountry[b.country] = (byCountry[b.country] || 0) + 1;
    });
    const topAuthors = Object.entries(byAuthor).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([a,c])=>`${a}(${c})`).join(", ");
    const genres = Object.entries(byGenre).sort((a,b)=>b[1]-a[1]).map(([g,c])=>`${g}(${c})`).join(", ");
    const years = Object.entries(byYear).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([y,c])=>`${y}:${c}`).join(", ");
    const countries = Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([c,n])=>`${c}(${n})`).join(", ");
    const seriesList = [...new Set(books.filter(b=>b.series?.trim()).map(b=>b.series))].join(", ");
    const minYear = Math.min(...books.map(b=>b.year_read_start||b.year).filter(Boolean));
    const maxYear = Math.max(...books.map(b=>b.year_read_end||b.year).filter(Boolean));
    const fictionCount = books.filter(b=>b.fiction).length;
    return `READING DATABASE: ${books.length} books, ${minYear}–${maxYear}.
NOTE: Year 2010 is a collective entry representing all books read from 1998–2010. Not a single-year anomaly.
BOOKS BY YEAR: ${years}
TOP AUTHORS (name, count): ${topAuthors}
GENRES (name, count): ${genres}
COUNTRIES: ${countries}
SERIES READ: ${seriesList}
FICTION: ${fictionCount} (${Math.round(fictionCount/books.length*100)}%) | NON-FICTION: ${books.length-fictionCount}`;
  };

  const fetchAnalysisAI = async () => {
    if (analysisAILoading || !books.length || !apiKey) return;

    // Serve from cache if books haven't changed
    const cachedFp = localStorage.getItem("nairrative_analysis_fp");
    const cachedResult = localStorage.getItem("nairrative_analysis_ai");
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setAnalysisAI(JSON.parse(cachedResult)); return; } catch {}
    }

    setAnalysisAILoading(true);
    try {
      const ctx = buildBookContext();
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 2000,
          system: `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly these keys: temporal, genre, geographic, author, thematic, contextual, complexity, series, emotional, discovery. Each value is 2-3 sentences of specific, data-driven insight. Do not invent facts — base everything strictly on the data provided. IMPORTANT CONTEXT: The year 2010 in the data is a collective placeholder representing all books read between 1998 and 2010 — it is not a single-year anomaly or data error. Do not flag it as unusual volume or an outlier. Treat it as cumulative reading across those early years.`,
          messages: [{ role: "user", content: `${ctx}\n\nGenerate concise insights for each analysis dimension based strictly on this data.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        setAnalysisAI(result);
        localStorage.setItem("nairrative_analysis_ai", JSON.stringify(result));
        localStorage.setItem("nairrative_analysis_fp", booksFingerprint);
      }
    } catch(e) { console.error("Analysis AI error:", e); }
    setAnalysisAILoading(false);
  };

  const fetchIntentRecs = async (intentId, input = "") => {
    if (intentLoading[intentId]) return;
    setIntentLoading(p => ({ ...p, [intentId]: true }));
    const lastBook = books[books.length - 1];
    const lastAuthor = lastBook?.author || "Brandon Sanderson";
    const readTitles = new Set(books.map(b => b.title.toLowerCase()));
    const prompts = {
      "more-like": `The user's most recent read is "${lastBook?.title}" by ${lastAuthor}. Recommend 3 unread books with the same feel, themes, or writing style that this reader would love.`,
      "more-by-last": `The user's most recent author is ${lastAuthor}. Recommend 3 other books by ${lastAuthor} that the reader hasn't read yet. If all are read, recommend authors with very similar style.`,
      "similar-author": `Based on the reader loving ${lastAuthor}, recommend 3 books by authors with a very similar writing style, themes, or storytelling approach.`,
      "trending": `Recommend 3 books that are critically acclaimed, culturally buzzy, or award-shortlisted in 2024–2026 that fit this reader's taste profile.`,
      "challenge": `This reader favors accessible genre fiction. Recommend 3 genuinely challenging, rewarding reads — dense classics, experimental fiction, or demanding long-form non-fiction.`,
      "quick": `Recommend 3 books under 300 pages that are deeply rewarding given this reader's taste (thrillers, literary fiction, fantasy).`,
      "gaps": `This reader's library skews Western/Indian/anglophone. Recommend 3 books from underrepresented literary traditions — Japanese, African, Latin American, Nordic, Arabic, or Southeast Asian voices.`,
      "surprise": `Give 3 wildly unexpected book recommendations that this reader would never pick for themselves but would secretly love. Bold, surprising, off-pattern picks.`,
      "finish": `This reader has started several long series. Recommend 3 books that are either perfect re-entry points to a series or similar series with satisfying completions.`,
      "loved": `The user loved: "${input}". Recommend 3 books with similar appeal — themes, pacing, emotional tone, or narrative style.`,
      "authors-like": `The user loves authors like ${input}. Recommend 3 books by different authors with very similar style, subject matter, or storytelling sensibility.`,
      "mood": `The user is in the mood for: "${input}". Recommend 3 books that perfectly match this emotional register or atmosphere.`,
      "genre-pick": `Recommend 3 excellent books in the genre: "${input}". Mix a modern standout, a timeless classic, and an underrated gem.`,
      "topic": `Recommend 3 books about: "${input}". Cross genre if needed — fiction, non-fiction, memoir.`,
      "occasion": `Recommend 3 books perfect for: "${input}". Match tone, length, and engagement level to the occasion.`,
      "pair": `The user wants to pair a book with: "${input}" (a film, show, event, or experience). Recommend 3 ideal companion reads.`,
    };
    try {
      const useWebSearch = intentId === "trending" || intentId === "pair";
      const body = {
        model: "claude-sonnet-4-6", max_tokens: 900,
        system: `You are a precise book recommendation engine. Reader history: ${READING_CONTEXT}\n\nCRITICAL: The reader has already read ALL of these books — do NOT recommend any of them under any circumstances: ${[...readTitles].join(", ")}.\n\nOnly recommend books the reader has NOT read. Double-check each recommendation against the list above before including it.\n\n${prompts[intentId] || input}\n\nReturn ONLY a JSON array — no markdown, no explanation. Exactly 3 items. Each: {"title": "...", "author": "...", "year": 2024, "reason": "1-2 sentences why it fits this reader"}.`,
        messages: [{ role: "user", content: "JSON array only." }],
      };
      if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }];
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const txt = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      const m = txt.match(/\[[\s\S]*?\]/);
      const parsed = m ? JSON.parse(m[0]) : JSON.parse(txt.replace(/```json|```/g, "").trim());
      setIntentResults(p => ({ ...p, [intentId]: Array.isArray(parsed) ? parsed.slice(0, 3) : [] }));
    } catch (e) {
      setIntentResults(p => ({ ...p, [intentId]: [{ title: "Could not load", author: "", year: 0, reason: e?.message || "Check your API key and try again." }] }));
    }
    setIntentLoading(p => { const n = { ...p }; delete n[intentId]; return n; });
  };

  const addBook = async () => {
    if (!newBook.title.trim() || !newBook.author.trim()) { setAddMsg("Title and author are required."); return; }
    const yr = parseInt(newBook.year);
    // 1. Insert book
    const { data: book, error: bookErr } = await supabase.from("books").insert([{
      user_id: "5c8d1748-16ec-45a3-b57e-a8bdb7a7db78",
      title: newBook.title.trim(),
      year_read_start: yr, year_read_end: yr,
      genre: [newBook.genre],
      format: newBook.format || "Novel",
      fiction: newBook.fiction !== false,
      series: newBook.series || "",
      pages: newBook.pages ? parseInt(newBook.pages) : null,
      notes: newBook.notes || "",
      user_added: true,
    }]).select().single();
    if (bookErr) { setAddMsg("Error saving book. Check your connection."); return; }
    // 2. Find or create author
    let { data: author } = await supabase.from("authors").select().eq("name", newBook.author.trim()).maybeSingle();
    if (!author) {
      const { data: newAuthor, error: authErr } = await supabase.from("authors").insert([{ name: newBook.author.trim(), country: newBook.country || "" }]).select().single();
      if (authErr) { setAddMsg("Error saving author. Check your connection."); return; }
      author = newAuthor;
    }
    // 3. Link book to author
    await supabase.from("book_authors").insert([{ book_id: book.id, author_id: author.id, author_order: 1 }]);
    // 4. Update local state with normalized book
    const normalized = normalizeBook({ ...book, book_authors: [{ author_order: 1, authors: author }] });
    setBooks(prev => [...prev, normalized]);
    setNewBook({ title: "", author: "", year: 2026, genre: "Fantasy", country: "", pages: "", format: "Novel", series: "", notes: "", fiction: true });
    setAddMsg(`✓ "${newBook.title}" added to your library!`);
    setTimeout(() => setAddMsg(""), 4000);
  };

  const downloadCSV = () => {
    const rows = [["ID","Title","Author","Year Read Start","Year Read End","Genre","Country","Format","Pages","Series","Notes"], ...books.map(b => [b.id, `"${b.title}"`, `"${b.author}"`, b.year_read_start, b.year_read_end, `"${(b.genre||[]).join("/")}"`, b.country || "", b.format || "", b.pages || "", `"${b.series||""}"`, `"${b.notes||""}"`])];
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my_reading_list.csv" });
    a.click();
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my_reading_list.json" });
    a.click();
  };

  // ── STYLES ────────────────────────────────────────────────────────────────
  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${G.bg}; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: ${G.bg}; }
    ::-webkit-scrollbar-thumb { background: ${G.dimmed}; border-radius: 4px; }
    .tab-btn { cursor: pointer; padding: 8px 18px; border-radius: 6px; border: 1px solid ${G.goldDim}; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; transition: all 0.2s; white-space: nowrap; color: ${G.goldDim}; background: transparent; }
    .tab-btn:hover { color: ${G.gold}; border-color: ${G.gold}; }
    .tab-btn.active { background: ${G.gold}; border-color: ${G.gold}; color: #ffffff; font-weight: 600; }
    .stat-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 20px 24px; transition: border-color 0.2s; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .stat-card:hover { border-color: ${G.goldDim}; }
    .genre-pill { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }
    .recharts-wrapper svg { overflow: visible !important; }
    .input-dark { background: ${G.card2}; border: 1px solid ${G.border}; border-radius: 8px; color: ${G.text}; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%; outline: none; transition: border-color 0.2s; }
    .input-dark:focus { border-color: ${G.goldDim}; }
    .btn-gold { background: ${G.gold}; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-gold:hover { background: ${G.goldLight}; }
    .btn-ghost { background: transparent; color: ${G.muted}; border: 1px solid ${G.border}; border-radius: 8px; padding: 8px 16px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .btn-ghost:hover { color: ${G.text}; border-color: ${G.dimmed}; }
    .rec-card { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 12px; padding: 18px; transition: all 0.2s; }
    .rec-card:hover { border-color: ${G.goldDim}; transform: translateY(-1px); }
    .chat-input-wrap { display: flex; gap: 10px; }
    .lib-row { display: grid; grid-template-columns: 1fr 140px 100px 56px 64px; gap: 12px; padding: 10px 16px; border-bottom: 1px solid ${G.border}; align-items: center; transition: background 0.15s; }
    .lib-row:hover { background: ${G.card2}; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse { animation: pulse 1.5s infinite; }
  `;

  // ── TABS CONFIG ────────────────────────────────────────────────────────────
  const TABS = [
    { id: "overview", icon: "◎", label: "Overview" },
    { id: "analysis", icon: "▦", label: "Analysis" },
    { id: "library", icon: "≡", label: "Library" },
    { id: "add", icon: "+", label: "Add Book" },
    { id: "recs", icon: "✦", label: "Recommendations" },
    { id: "series", icon: "⊙", label: "Series Recap" },
    { id: "chat", icon: "◈", label: "AI Chat" },
  ];


  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{ padding: "28px 28px 0", background: G.bg }}>
        {/* Centered logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <img src="./nairrative.png" alt="Nairrative" style={{ width: 398, height: 113, mixBlendMode: "multiply" }} />
        </div>

        <div style={{ display: "flex", gap: 4, overflowX: "auto", justifyContent: "center" }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "24px 28px" }} className="fade-in">

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (() => {
          const cb = id => { const r = getChartRange(id); return books.filter(b => b.year >= r.from && b.year <= r.to); };
          const fGen = new Set(["Fantasy","Sci-Fi","Thriller","Mystery","Literary Fiction","Historical Fiction","Classic","Horror"]);

          const ycBooks = cb("yc");
          const ycData = Object.entries(ycBooks.reduce((a,b)=>{a[b.year]=(a[b.year]||0)+1;return a;},{})).sort((a,b)=>Number(a[0])-Number(b[0])).map(([year,count])=>({year,count}));
          const ycMax = Math.max(...ycData.map(d=>d.count),1);

          const gcBooks = cb("gc");
          const gcData = Object.entries(gcBooks.reduce((a,b)=>{(b.genre||[]).forEach(g=>{a[g]=(a[g]||0)+1;});return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([genre,count])=>({genre,count}));

          const fnBooks = cb("fn");
          const fnYrs = [...new Set(fnBooks.map(b=>b.year))].sort();
          const fnData = fnYrs.map(year=>{const yb=fnBooks.filter(b=>b.year===year);return{year,Fiction:yb.filter(b=>(b.genre||[]).some(g=>fGen.has(g))).length,"Non-Fiction":yb.filter(b=>!(b.genre||[]).some(g=>fGen.has(g))).length};});

          const geBooks = cb("ge");
          const geYrs = [...new Set(geBooks.map(b=>b.year))].sort();
          const geCount = geBooks.reduce((a,b)=>{(b.genre||[]).forEach(g=>{a[g]=(a[g]||0)+1;});return a;},{});
          const geTop5 = Object.entries(geCount).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([g])=>g);
          const geData = geYrs.map(year=>{const e={year};geTop5.forEach(g=>{e[g]=geBooks.filter(b=>b.year===year&&(b.genre||[]).includes(g)).length;});return e;});

          const acBooks = cb("ac");
          const acData = Object.entries(acBooks.reduce((a,b)=>{a[b.author]=(a[b.author]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([author,count])=>({author,count}));

          const coBooks = cb("co");
          const coData = Object.entries(coBooks.filter(b=>b.country).reduce((a,b)=>{a[b.country]=(a[b.country]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([country,count])=>({country,count}));

          const truncTick = (maxChars) => ({ x, y, payload, index }) => {
            if (index % 2 !== 0) return null;
            const full = String(payload.value);
            const label = full.length > maxChars ? full.slice(0, maxChars - 2) + '..' : full;
            return (
              <g>
                {label !== full && <title>{full}</title>}
                <text x={x} y={y} dy={4} textAnchor="end" fill={G.text} fontSize={10}>{label}</text>
              </g>
            );
          };

          const timeChartIds = new Set(["yc", "fn", "ge"]);
          const chartCard = (title, id, children) => (
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "18px 20px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text }}>{title}</div>
                <RangeFilter chartId={id} allYears={timeChartIds.has(id) ? allYearsList : allYearsListFull} ranges={chartRanges} onSet={setChartRange} />
              </div>
              {children}
            </div>
          );

          return (
          <div>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Books Read", value: stats.total, color: "#d97706" },
                { label: "Years Reading", value: stats.readingSpan, color: G.blue },
                { label: "Peak Year", value: `${stats.sortedYears[0]?.[0]} (${stats.sortedYears[0]?.[1]})`, color: "#0284c7" },
                { label: "#1 Author", value: stats.sortedAuthors[0]?.[0], sub: `${stats.sortedAuthors[0]?.[1]} books`, color: G.purple },
                { label: "Top Genre", value: stats.sortedGenres[0]?.[0], sub: `${stats.sortedGenres[0]?.[1]} books`, color: "#ff9f7f" },
                { label: "Authors Read", value: new Set(books.map(b => b.author)).size, color: "#db2777" },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 22, fontFamily: "'Playfair Display', serif", fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                  {s.sub && <div style={{ color: G.muted, fontSize: 11, marginTop: 4 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Books Per Year */}
              {chartCard("Reading Activity by Year", "yc",
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ycData} barSize={18}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {ycData.map((e, i) => <Cell key={i} fill={e.count === ycMax ? G.gold : G.goldDim} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Genre Breakdown */}
              {chartCard("Genre Breakdown", "gc",
                <div style={{ overflow: "visible" }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={gcData} layout="vertical" barSize={13} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="genre" axisLine={false} tickLine={false} width={110} interval={0} tick={truncTick(17)} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {gcData.map((e, i) => <Cell key={i} fill={GENRE_COLORS[e.genre] || G.muted} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Authors */}
              {chartCard("Top Authors", "ac",
                <div style={{ overflow: "visible" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={acData} layout="vertical" barSize={11} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="author" axisLine={false} tickLine={false} width={130} interval={0} tick={truncTick(20)} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {acData.map((_, i) => <Cell key={i} fill={`rgba(74, 158, 255, ${Math.max(0.25, 1 - i * 0.07)})`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Author Origins */}
              {chartCard("Author Origins", "co",
                <div style={{ overflow: "visible" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={coData} layout="vertical" barSize={11} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="country" axisLine={false} tickLine={false} width={90} interval={0} tick={truncTick(14)} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {coData.map((_, i) => <Cell key={i} fill={`rgba(20, 184, 166, ${Math.max(0.25, 1 - i * 0.08)})`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Fiction vs Non-Fiction */}
              {chartCard("Fiction vs Non-Fiction Over Time", "fn",
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={fnData}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend wrapperStyle={{ color: G.muted, fontSize: 11 }} />
                    <Area type="monotone" dataKey="Fiction" stackId="1" stroke={G.gold} fill={G.gold} fillOpacity={0.35} />
                    <Area type="monotone" dataKey="Non-Fiction" stackId="1" stroke={G.blue} fill={G.blue} fillOpacity={0.35} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Genre Evolution */}
              {chartCard("Genre Evolution", "ge",
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={geData} margin={{ bottom: 10 }}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend content={({ payload }) => (
                      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: "4px 16px" }}>
                          {payload.map(entry => (
                            <div key={entry.value} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: G.muted, whiteSpace: "nowrap" }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )} />
                    {geTop5.map(g => <Area key={g} type="monotone" dataKey={g} stackId="1" stroke={GENRE_COLORS[g]} fill={GENRE_COLORS[g]} fillOpacity={0.5} />)}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          );
        })()}

        {/* ── ANALYSIS ─────────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <div>
            {(() => {
              const minYear = Math.min(...books.map(b => b.year_read_start));
              const maxYear = Math.max(...books.map(b => b.year_read_end));
              const span = maxYear - minYear + 1;
              return (
                <div style={{ marginBottom: 24, textAlign: "center" }}>
                  <div style={{ color: G.muted, fontSize: 13 }}>Ten lenses into {stats.total} books across {span} years ({minYear}–present).</div>
                </div>
              );
            })()}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>

              {/* 1 · TEMPORAL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Temporal</span>
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
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.temporal ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 4 }}>{analysisAI.temporal}</div> : null}
              </div>

              {/* 2 · GENRE & FORM */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Genre & Form</span>
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
                      <span style={{ color: GENRE_COLORS[top] || G.text, fontWeight: 600 }}>{top}</span>
                    </div>
                  ))}
                </div>
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.genre ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 4 }}>{analysisAI.genre}</div> : null}
              </div>

              {/* 3 · GEOGRAPHIC & CULTURAL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.green}18`, color: G.green, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Geographic & Cultural</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Where Your Stories Come From</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.green, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.uniqueCountries}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>countries of origin</div>
                  </div>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.indiaPct}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>Indian authors</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {analysisInsights.topCountries.map(([country, count]) => (
                    <div key={country} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: G.text }}>{country}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: G.border, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${Math.round(count / (analysisInsights.topCountries[0]?.[1] || 1) * 100)}%`, height: "100%", background: G.green, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: G.muted, width: 20, textAlign: "right" }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.geographic ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 4 }}>{analysisAI.geographic}</div> : null}
              </div>

              {/* 4 · AUTHOR BEHAVIOR */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.purple}18`, color: G.purple, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Author Behavior</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Loyalty vs. Sampling</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.loyaltyRatio}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>from loyal authors (5+)</div>
                  </div>
                  <div>
                    <div style={{ color: G.red, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.sampledCount}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>one-time reads</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  {analysisInsights.loyal.slice(0, 5).map(([author, count]) => (
                    <div key={author} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: G.text }}>{author}</span>
                      <span style={{ fontSize: 11, color: G.gold, fontWeight: 600 }}>{count} books</span>
                    </div>
                  ))}
                </div>
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.author ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 4 }}>{analysisAI.author}</div> : null}
              </div>

              {/* 5 · THEMATIC */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Thematic</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Recurring Intellectual Preoccupations</div>
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.thematic ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75 }}>{analysisAI.thematic}</div> : null}
              </div>

              {/* 6 · SOCIAL & CONTEXTUAL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Social & Contextual</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Life Shapes the List</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {analysisInsights.notableYears.map(({ year, books: b, label }) => (
                    <div key={year} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ minWidth: 52 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: G.blue }}>{year}</div>
                        <div style={{ fontSize: 10, color: G.muted }}>{b} books</div>
                      </div>
                      <div style={{ fontSize: 11, background: `${G.blue}12`, color: G.blue, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.contextual ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>{analysisAI.contextual}</div> : null}
              </div>

              {/* 7 · COMPLEXITY & CHALLENGE */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.red}18`, color: G.red, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Complexity & Challenge</span>
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
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.complexity ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10, marginTop: 4 }}>{analysisAI.complexity}</div> : null}
              </div>

              {/* 8 · SERIES VS STANDALONE */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.green}18`, color: G.green, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Series vs. Standalone</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 12px" }}>Commitment Patterns</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                  <div>
                    <div style={{ color: G.green, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.seriesPct}%</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>in series</div>
                  </div>
                  <div>
                    <div style={{ color: G.gold, fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{analysisInsights.seriesCount}</div>
                    <div style={{ color: G.muted, fontSize: 10 }}>series books read</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  {[...new Set(books.filter(b => b.series?.trim()).map(b => b.series))].slice(0, 6).map(s => {
                    const count = books.filter(b => b.series === s).length;
                    return (
                      <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: G.text }}>{s}</span>
                        <span style={{ fontSize: 11, color: G.green, fontWeight: 600 }}>{count} books</span>
                      </div>
                    );
                  })}
                </div>
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.series ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>{analysisAI.series}</div> : null}
              </div>

              {/* 9 · EMOTIONAL ARC */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.purple}18`, color: G.purple, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Emotional Arc</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Mood Mapping by Era</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  {analysisInsights.fictionByEra.map(({ era, pct }) => (
                    <div key={era}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: G.text }}>{era}</span>
                        <span style={{ fontSize: 11, color: G.purple, fontWeight: 600 }}>{pct}% fiction</span>
                      </div>
                      <div style={{ height: 5, background: G.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(to right, ${G.purple}, ${G.gold})`, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.emotional ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>{analysisAI.emotional}</div> : null}
              </div>

              {/* 11 · DISCOVERY CHANNEL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Discovery Channel</span>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>How Books Find You</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {analysisInsights.topAuthorChannels.map(({ channel, example }) => (
                    <div key={channel} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: G.card2, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: G.text }}>{channel}</div>
                      <div style={{ fontSize: 11, color: G.gold, fontWeight: 600 }}>{example}</div>
                    </div>
                  ))}
                </div>
                {analysisAILoading ? <div style={{ fontSize: 11, color: G.dimmed }} className="pulse">Generating insight…</div> : analysisAI?.discovery ? <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.75, borderTop: `1px solid ${G.border}`, paddingTop: 10 }}>{analysisAI.discovery}</div> : null}
              </div>


            </div>
          </div>
        )}

        {/* ── LIBRARY ────────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div>
            {/* Single filter row */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <input className="input-dark" style={{ width: 200, flex: "0 0 auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              <MultiSelect options={allGenres} selected={libGenres} onChange={setLibGenres} placeholder="Genre" style={{ width: 148, flex: "0 0 auto" }} />
              <MultiSelect options={allYears} selected={libYears} onChange={setLibYears} placeholder="Year" style={{ width: 108, flex: "0 0 auto" }} />
              <MultiSelect options={allAuthors} selected={libAuthors} onChange={setLibAuthors} placeholder="Author" style={{ width: 180, flex: "0 0 auto" }} />
              <select className="input-dark" style={{ width: 128, flex: "0 0 auto" }} value={libSort} onChange={e => setLibSort(e.target.value)}>
                <option value="year">Sort: Year</option>
                <option value="title">Sort: Title</option>
                <option value="author">Sort: Author</option>
              </select>
              <span style={{ color: G.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filteredBooks.length} books</span>
              <div style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={downloadCSV}>↓ CSV</button>
              <button className="btn-ghost" onClick={downloadJSON}>↓ JSON</button>
            </div>

            {/* Table Header */}
            <div className="lib-row" style={{ background: G.card2, borderRadius: "8px 8px 0 0", borderBottom: `1px solid ${G.border}` }}>
              {["Title", "Author", "Genre", "Pages", "Year"].map(h => (
                <div key={h} style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 520, overflowY: "auto" }}>
              {filteredBooks.map(b => (
                <div key={b.id} className="lib-row">
                  <div style={{ fontSize: 13, fontWeight: 500, color: G.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: G.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.author}</div>
                  <div>{(b.genre||[]).map(g => <span key={g} className="genre-pill" style={{ background: `${GENRE_COLORS[g] || G.dimmed}20`, color: GENRE_COLORS[g] || G.muted, marginRight: 4 }}>{g}</span>)}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.pages || "—"}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.year}</div>
                </div>
              ))}
              {filteredBooks.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: G.muted }}>No books match your filters.</div>
              )}
            </div>
          </div>
        )}

        {/* ── ADD BOOK ───────────────────────────────────────────────────── */}
        {activeTab === "add" && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 6 }}>Log a New Book</div>
            <div style={{ color: G.muted, fontSize: 13, marginBottom: 24 }}>Add it to your permanent reading record</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Title *</div>
                <input className="input-dark" placeholder="e.g. The Name of the Wind" value={newBook.title} onChange={e => setNewBook(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Author *</div>
                <input className="input-dark" placeholder="e.g. Patrick Rothfuss" value={newBook.author} onChange={e => setNewBook(p => ({ ...p, author: e.target.value }))} />
              </div>

              <button className="btn-ghost" onClick={autoFillBookDetails} disabled={autoFilling || !newBook.title.trim() || !newBook.author.trim()}
                style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", borderColor: G.goldDim, color: autoFilling ? G.muted : G.gold }}>
                {autoFilling ? "Filling in details…" : "✦ Auto-fill Genre, Country & Pages via AI"}
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Year</div>
                  <input className="input-dark" type="number" min="1900" max="2030" value={newBook.year} onChange={e => setNewBook(p => ({ ...p, year: e.target.value }))} />
                </div>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Pages</div>
                  <input className="input-dark" type="number" min="1" placeholder="e.g. 350" value={newBook.pages} onChange={e => setNewBook(p => ({ ...p, pages: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Genre</div>
                  <select className="input-dark" value={newBook.genre} onChange={e => setNewBook(p => ({ ...p, genre: e.target.value }))}>
                    {Object.keys(GENRE_COLORS).map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Country of Author</div>
                  <input className="input-dark" placeholder="e.g. USA" value={newBook.country} onChange={e => setNewBook(p => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
              <button className="btn-gold" style={{ marginTop: 6 }} onClick={addBook}>Add to My Library</button>
              {addMsg && (
                <div style={{ padding: "12px 16px", borderRadius: 8, background: addMsg.startsWith("✓") ? "#1a2e1a" : "#2e1a1a", border: `1px solid ${addMsg.startsWith("✓") ? "#2d5a2d" : "#5a2d2d"}`, color: addMsg.startsWith("✓") ? G.green : G.red, fontSize: 13 }}>
                  {addMsg}
                </div>
              )}
            </div>

            {books.some(b => b.user_added) && (
              <div style={{ marginTop: 32 }}>
                <div style={{ color: G.muted, fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Added by You</div>
                {books.filter(b => b.user_added).reverse().map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</span>
                      <span style={{ color: G.muted, fontSize: 12, marginLeft: 8 }}>by {b.author}</span>
                    </div>
                    <span>{(b.genre||[]).map(g => <span key={g} className="genre-pill" style={{ background: `${GENRE_COLORS[g] || G.dimmed}20`, color: GENRE_COLORS[g] || G.muted, marginRight: 4 }}>{g}</span>)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECOMMENDATIONS ────────────────────────────────────────────── */}
        {activeTab === "recs" && (() => {
          const lastBook = books[books.length - 1];
          const allGenreOptions = Object.keys(GENRE_COLORS);

          const LENSES = [
            // Auto-load panels
            { id: "more-like", icon: "◈", title: "More Like Last Book", sub: `Based on "${lastBook?.title}"`, auto: true },
            { id: "more-by-last", icon: "◉", title: "More By Last Author", sub: `Everything by ${lastBook?.author}`, auto: true },
            { id: "similar-author", icon: "◎", title: "Books By Similar Author", sub: `Authors like ${lastBook?.author}`, auto: true },
            { id: "trending", icon: "⊛", title: "What's Trending", sub: "Culturally buzzy · award-listed · 2024–26", auto: true },
            { id: "challenge", icon: "△", title: "Challenge Me", sub: "Dense, difficult, demanding works", auto: true },
            { id: "quick", icon: "≡", title: "Quick Reads", sub: "Under 300 pages, deeply rewarding", auto: true },
            { id: "gaps", icon: "⊕", title: "Fill My Gaps", sub: "Traditions & voices not yet in your library", auto: true },
            { id: "surprise", icon: "✦", title: "Surprise Me", sub: "Wildly unexpected — off-pattern picks", auto: true },
            { id: "finish", icon: "⊙", title: "Finish the Series", sub: "Re-entry points or similar completable series", auto: true },
            // Input panels
            { id: "loved", icon: "◑", title: "If You Loved…", sub: "", auto: false, placeholder: "A book title…", inputLabel: "Enter a book you loved" },
            { id: "authors-like", icon: "◷", title: "Books By Authors Like…", sub: "", auto: false, placeholder: "An author name…", inputLabel: "Enter an author" },
            { id: "mood", icon: "◐", title: "Match My Mood", sub: "", auto: false, placeholder: "Describe the vibe…", inputLabel: "What are you in the mood for?" },
            { id: "genre-pick", icon: "▦", title: "By Genre", sub: "", auto: false, isDropdown: true, dropdownOptions: allGenreOptions, inputLabel: "Choose a genre" },
            { id: "topic", icon: "◫", title: "By Topic", sub: "", auto: false, placeholder: "AI, colonialism, ecology…", inputLabel: "Enter a topic or theme" },
            { id: "occasion", icon: "◇", title: "For the Occasion", sub: "", auto: false, placeholder: "Beach read, book club, long flight…", inputLabel: "What's the occasion?" },
            { id: "pair", icon: "⊞", title: "Pair It", sub: "Web-searched companion reads", auto: false, placeholder: "A film, show, event, or experience…", inputLabel: "Pair a book with…" },
          ];

          const RecList = ({ results, loading }) => {
            if (loading) return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: G.dimmed, fontSize: 11, minWidth: 14, marginTop: 1 }}>{i}.</span>
                    <div style={{ flex: 1 }}>
                      <div className="pulse" style={{ height: 12, width: "70%", background: G.border, borderRadius: 4, marginBottom: 4 }} />
                      <div style={{ height: 10, width: "50%", background: G.dimmed, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            );
            if (!results) return null;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {results.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: G.gold, fontSize: 11, fontFamily: "'Playfair Display', serif", minWidth: 14, marginTop: 2 }}>{i + 1}.</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: G.text, lineHeight: 1.4 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: G.gold, marginBottom: 2 }}>{r.author}{r.year ? ` · ${r.year}` : ""}</div>
                      {r.reason && <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.5 }}>{r.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>
            );
          };

          return (
            <div>
              <div style={{ marginBottom: 20, textAlign: "center" }}>
                <div style={{ color: G.muted, fontSize: 13 }}>16 lenses for discovery — auto-loaded panels refresh instantly, input panels respond to your query.</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {LENSES.map(lens => {
                  const results = intentResults[lens.id];
                  const loading = !!intentLoading[lens.id];
                  const input = intentInputs[lens.id] || "";
                  const canFetch = lens.auto || (lens.isDropdown ? !!input : !!input.trim());

                  return (
                    <div key={lens.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column" }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                          <span style={{ color: G.gold, fontSize: 13 }}>{lens.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: G.text }}>{lens.title}</span>
                        </div>
                        {(results || loading) && (
                          <button onClick={() => { setIntentResults(p => { const n={...p}; delete n[lens.id]; return n; }); fetchIntentRecs(lens.id, input); }}
                            style={{ background: "none", border: "none", color: G.muted, fontSize: 10, cursor: "pointer", padding: 0, lineHeight: 1 }} title="Refresh">↺</button>
                        )}
                      </div>
                      {lens.sub && <div style={{ fontSize: 10, color: G.muted, marginBottom: 8, paddingLeft: 20 }}>{lens.sub}</div>}

                      {/* Input for non-auto panels */}
                      {!lens.auto && (
                        <div style={{ marginBottom: 8 }}>
                          {lens.isDropdown ? (
                            <select className="input-dark" style={{ fontSize: 12, padding: "7px 10px" }}
                              value={input}
                              onChange={e => setIntentInputs(p => ({ ...p, [lens.id]: e.target.value }))}>
                              <option value="">— pick a genre —</option>
                              {lens.dropdownOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input className="input-dark" style={{ fontSize: 12 }} placeholder={lens.placeholder}
                              value={input}
                              onChange={e => setIntentInputs(p => ({ ...p, [lens.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === "Enter" && input.trim()) fetchIntentRecs(lens.id, input); }} />
                          )}
                          <button className="btn-gold" style={{ marginTop: 6, width: "100%", fontSize: 11, padding: "7px 0" }}
                            disabled={loading || !canFetch}
                            onClick={() => fetchIntentRecs(lens.id, input)}>
                            {loading ? "…" : "Get Picks"}
                          </button>
                        </div>
                      )}

                      {/* Results */}
                      <RecList results={results} loading={loading} />

                      {/* Empty state for auto panels still loading first time */}
                      {lens.auto && !results && !loading && (
                        <div style={{ fontSize: 11, color: G.dimmed, marginTop: 8 }}>
                          <button onClick={() => fetchIntentRecs(lens.id)} style={{ background: "none", border: `1px solid ${G.border}`, color: G.muted, fontSize: 11, borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}>Load picks</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── SERIES RECAP ──────────────────────────────────────────────── */}
        {activeTab === "series" && (() => {
          const allSeries = [...new Set(books.filter(b => b.series).map(b => b.series))].sort();
          const seriesCounts = allSeries.map(s => ({ name: s, count: books.filter(b => b.series === s).length }))
            .sort((a, b) => b.count - a.count);

          return (
            <div>
              <div style={{ marginBottom: 20, textAlign: "center" }}>
                <div style={{ color: G.muted, fontSize: 13 }}>Pick a series to get an AI catch-up before continuing — key characters, plot beats, and what to remember.</div>
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
                  {/* Series header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text, marginBottom: 4 }}>{selectedSeries}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {books.filter(b => b.series === selectedSeries).sort((a, b) => a.id - b.id).map(b => (
                          <span key={b.id} style={{ fontSize: 11, color: G.muted, background: G.card2, border: `1px solid ${G.border}`, borderRadius: 4, padding: "2px 8px" }}>{b.title}</span>
                        ))}
                      </div>
                    </div>
                    <button className="btn-gold" style={{ flexShrink: 0, marginLeft: 12 }} disabled={seriesLoading}
                      onClick={() => generateSeriesRecap(selectedSeries)}>
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
                <div style={{ textAlign: "center", padding: "40px 0", color: G.muted }}>
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
        })()}

        {/* ── CHAT ──────────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
            <div style={{ color: G.muted, fontSize: 12, marginBottom: 16, textAlign: "center" }}>Ask anything — patterns, recommendations, deep dives, what you've forgotten you read…</div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "82%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: m.role === "user" ? `${G.gold}18` : G.card2,
                    border: `1px solid ${m.role === "user" ? G.goldDim : G.border}`,
                    color: G.text, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap"
                  }}>
                    {m.role === "assistant" && <div style={{ color: G.gold, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>◈ Reading AI</div>}
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ padding: "12px 16px", background: G.card2, border: `1px solid ${G.border}`, borderRadius: "12px 12px 12px 2px" }}>
                    <div className="pulse" style={{ color: G.gold, fontSize: 13 }}>Thinking…</div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-wrap" style={{ borderTop: `1px solid ${G.border}`, paddingTop: 14 }}>
              <input className="input-dark" placeholder="Ask about your reading history, patterns, recommendations…"
                value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} />
              <button className="btn-gold" onClick={sendChat} disabled={chatLoading} style={{ whiteSpace: "nowrap" }}>Send</button>
            </div>

            {/* Suggestion chips */}
            {messages.length === 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {["What were my peak reading years?", "Which authors have I read the most?", "Analyze my genre evolution", "What's my fiction vs non-fiction ratio?", "What books did I read in 2021?", "Suggest what to read next"].map(s => (
                  <button key={s} className="btn-ghost" style={{ fontSize: 11 }} onClick={() => { setChatInput(s); }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ padding: "16px 28px", marginTop: 24, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: G.dimmed }}>© {new Date().getFullYear()} Viswas Nair · All rights reserved</div>
      </div>
    </div>
  );
}