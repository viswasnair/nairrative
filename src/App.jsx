import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, Legend, LabelList,
  PieChart, Pie, LineChart, Line
} from "recharts";

// ── THEME ──────────────────────────────────────────────────────────────────
const G = {
  gold: "#2d6a4f", goldLight: "#3d8a66", goldDim: "#6aab8a",
  copper: "#c0522a",
  blue: "#2563eb", red: "#dc2626", green: "#0e9488", purple: "#7c3aed",
  bg: "#f7f8fa", card: "#ffffff", card2: "#f0f2f6", border: "#e4e7ed",
  text: "#111827", muted: "#6b7280", dimmed: "#d1d5db", hover: "#e8eaef",
};


const READING_CONTEXT = `This reader has consumed 345 books across 17 years (2010–2026). Key patterns:

TOP AUTHORS: Brandon Sanderson (many books – Mistborn, Stormlight Archive, Skyward, Cosmere novellas), Sidney Sheldon (thrillers), Sarah J. Maas (ACOTAR series), Rebecca Yarros (Empyrean series), J.K. Rowling (Harry Potter), Christopher Paolini (Eragon), Ken Follett (Kingsbridge), Agatha Christie (mysteries), Amish Tripathi (Indian mythology fantasy), Robert Jordan (Wheel of Time), Dan Brown (thrillers), Andy Weir (sci-fi), Walter Isaacson (biographies), Yuval Noah Harari (non-fiction), Perumal Murugan (Indian literary), Arundhati Roy (Indian literary), Appupen (Indian graphic novels).

GENRES (ranked): Thriller (~83 books) > Literary Fiction (~55) > Fantasy (~54) > Sci-Fi (~47) > Biography (~19) > Popular Science (~17) > History (~17) > Philosophy (~9) > Politics (~8) > Historical Fiction (~8) > Mystery (~6) > Economics (~5) > Graphic Novel (~5) > Non-Fiction (~5) > Psychology (~3) > Self-Help (~2) > Horror (~1) > Business (~1).

CRITICAL NOTE ON 2010: The year 2010 in this database is a collective placeholder representing ALL books read between 1998 and 2010 — roughly 12 years of reading before annual tracking began. It is NOT a single year with unusually high volume. Do not describe it as a peak year, anomaly, or outlier. Never say the reader read 130 books in 2010.

YEAR HIGHLIGHTS: Pre-2011 (collective 1998–2010 reading, entered as a single block before annual tracking began), 2011-2014 (fantasy exploration), 2015-2017 (diverse non-fiction phase), 2018-19 (literary fiction surge), 2020-21 (pandemic reading peak – 24+40 books), 2022 (sudden drop to 3), 2023-24 (hiatus), 2025-26 (comeback with romantasy – ACOTAR + Empyrean).

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
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div onClick={() => { setOpen(o => !o); setSearch(""); }} style={{ background: G.card2, border: `1px solid ${open ? G.goldDim : G.border}`, borderRadius: 8, color: selected.length ? G.text : G.muted, padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, userSelect: "none", transition: "border-color 0.2s" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{label}</span>
        <span style={{ color: G.muted, fontSize: 10, flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${G.border}` }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} onClick={e => e.stopPropagation()}
              placeholder="Search…" style={{ width: "100%", background: G.card2, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {selected.length > 0 && (
              <div onClick={() => onChange([])} style={{ padding: "7px 14px", fontSize: 11, color: G.gold, cursor: "pointer", borderBottom: `1px solid ${G.border}` }}>✕ Clear all</div>
            )}
            {filtered.length === 0 && <div style={{ padding: "10px 14px", fontSize: 12, color: G.muted }}>No matches</div>}
            {filtered.map(o => (
              <div key={o} onClick={() => toggle(o)} style={{ padding: "8px 14px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: selected.includes(o) ? G.text : G.muted, background: selected.includes(o) ? `${G.gold}10` : "transparent" }}>
                <div style={{ width: 14, height: 14, border: `1px solid ${selected.includes(o) ? G.gold : G.border}`, borderRadius: 3, background: selected.includes(o) ? G.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: "#000", fontWeight: 700 }}>
                  {selected.includes(o) && "✓"}
                </div>
                {o}
              </div>
            ))}
          </div>
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
  const [session, setSession] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [genreList, setGenreList] = useState([]);
  const [genreMap, setGenreMap] = useState({});
  const [search, setSearch] = useState("");
  const [libGenres, setLibGenres] = useState([]);
  const [libYears, setLibYears] = useState([]);
  const [libAuthors, setLibAuthors] = useState([]);
  const [libSort, setLibSort] = useState("title");
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
  const [panelPrompts, setPanelPrompts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nairrative_panel_prompts") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    supabase.from("panel_prompts").select("data").eq("id", 1).single()
      .then(({ data }) => {
        if (data?.data) {
          setPanelPrompts(data.data);
          localStorage.setItem("nairrative_panel_prompts", JSON.stringify(data.data));
        }
      }).catch(() => {});
  }, []);
  const [editingPanel, setEditingPanel] = useState(null);
  const [viewingPanel, setViewingPanel] = useState(null);
  const [panelLoading, setPanelLoading] = useState({});
  const [intentInputs, setIntentInputs] = useState({
    "loved": "God's Debris",
    "authors-like": "Elif Shafak",
    "mood": "fear of fascism",
    "genre-pick": "Science Fiction",
    "topic": "AI",
    "pair": "Dhurandar",
  });
  const [intentResults, setIntentResults] = useState({});
  const [intentLoading, setIntentLoading] = useState({});
  const [refreshCounts, setRefreshCounts] = useState({});
  const EMPTY_DRAFT = { title: "", authors: [{ name: "" }], genres: [], yearStart: new Date().getFullYear(), yearEnd: new Date().getFullYear(), format: "Novel", fiction: true, series: "", pages: "", notes: "" };
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookDraft, setBookDraft] = useState(EMPTY_DRAFT);
  const [bookChatInput, setBookChatInput] = useState("");
  const [bookChatLoading, setBookChatLoading] = useState(false);
  const [bookChatPending, setBookChatPending] = useState(null);
  const [bookSaving, setBookSaving] = useState(false);
  const [bookMsg, setBookMsg] = useState("");
  const [newGenreInput, setNewGenreInput] = useState("");
  const [newGenreOpen, setNewGenreOpen] = useState(false);
  const [newGenreSaving, setNewGenreSaving] = useState(false);
  const apiKey = true; // key lives server-side via Netlify function
  const [seriesRecap, setSeriesRecap] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState("Wheel of Time");
  const chatEndRef = useRef(null);
  const prevRecsFingerprint = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:wght@300;400;600&family=Lora:ital,wght@0,400;0,700;1,400&family=DM+Serif+Display:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Fraunces:ital,wght@0,300;1,300&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const login = async () => {
    setLoginLoading(true); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message);
    else { setShowLoginModal(false); setLoginEmail(""); setLoginPassword(""); }
    setLoginLoading(false);
  };

  const logout = async () => { await supabase.auth.signOut(); };

  useEffect(() => {
    supabase.from("genres").select("name, color, sort_order").order("sort_order").then(({ data }) => {
      if (data) {
        setGenreList(data.map(g => g.name));
        setGenreMap(Object.fromEntries(data.map(g => [g.name, g.color])));
      }
    });
  }, []);

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
    "genre-pick": genreList,
    "topic": ["artificial intelligence", "Indian history", "climate and environment", "espionage", "philosophy of mind", "exploration and adventure"],
    "occasion": ["a long flight", "book club", "summer reading", "a lazy weekend", "gift for a friend who loves thrillers", "something to read before bed"],
    "pair": ["Oppenheimer (film)", "Shogun (TV series)", "a trip to Japan", "watching the World Cup", "Interstellar (film)", "reading about WW2"],
  };

  // Fingerprint catches adds, removes, and edits to title/year/genre
  const booksFingerprint = useMemo(() =>
    books.map(b => `${b.id}|${b.title}|${b.year}|${(b.genre||[]).join('')}`).join(','),
  [books]);

  // Load analysis: localStorage → Supabase → seed fallback. No auto-regenerate.
  useEffect(() => {
    if (activeTab !== "analysis" || !books.length) return;
    const cachedFp = localStorage.getItem("nairrative_analysis_fp");
    const cachedResult = localStorage.getItem("nairrative_analysis_ai");
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setAnalysisAI(JSON.parse(cachedResult)); return; } catch {}
    }
    // Try Supabase for cross-device persistence
    supabase.from("analysis_cache").select("data").eq("id", 1).single()
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
  }, [activeTab, booksFingerprint]);

  // Load recs from cache on tab switch (no API call)
  useEffect(() => {
    if (activeTab !== "recs" || !books.length) return;
    const cachedFp = localStorage.getItem("nairrative_recs_fp");
    const cachedResult = localStorage.getItem("nairrative_recs");
    if (cachedFp === booksFingerprint && cachedResult) {
      try { setIntentResults(JSON.parse(cachedResult)); return; } catch {}
    }
    supabase.from("recs_cache").select("data").eq("id", 1).single()
      .then(({ data }) => {
        if (data?.data) {
          setIntentResults(data.data);
          localStorage.setItem("nairrative_recs", JSON.stringify(data.data));
          localStorage.setItem("nairrative_recs_fp", booksFingerprint);
        } else if (Object.keys(SEED_RECS).length) {
          setIntentResults(SEED_RECS);
        }
      })
      .catch(() => { if (Object.keys(SEED_RECS).length) setIntentResults(SEED_RECS); });
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regenerate auto recs when books change (skip initial load)
  useEffect(() => {
    if (!booksFingerprint) return;
    if (prevRecsFingerprint.current === null) { prevRecsFingerprint.current = booksFingerprint; return; }
    if (prevRecsFingerprint.current === booksFingerprint) return;
    prevRecsFingerprint.current = booksFingerprint;
    setIntentResults({});
    localStorage.removeItem("nairrative_recs");
    localStorage.removeItem("nairrative_recs_fp");
    AUTO_RECS.forEach((id, i) => setTimeout(() => fetchIntentRecs(id), i * 2000));
  }, [booksFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const fictionCount = books.filter(b => b.fiction === true).length;
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

    // Mood mapping by era — derived from genre groupings
    const MOOD_GENRES = {
      "Dark & Tense":  ["Thriller", "Legal Thriller", "Medical Thriller", "Mystery", "Horror", "Dystopian", "Politics"],
      "Imaginative":   ["Fantasy", "Romantasy", "Science Fiction", "Historical Fiction", "Graphic Novel", "Mythology"],
      "Reflective":    ["Literary Fiction", "Classic", "Philosophy", "Spirituality", "Memoir", "Essays", "Poetry"],
      "Informative":   ["Biography", "Popular Science", "History", "Non-Fiction", "Economics", "Self-Help", "Environment", "Systems", "Sociology", "Psychology", "Business"],
    };
    const MOOD_COLORS = { "Dark & Tense": "#e06c75", "Imaginative": "#4a9eff", "Reflective": "#c3a6ff", "Informative": "#ffd166" };
    const bookMood = b => { const g = b.genre || []; for (const [m, tags] of Object.entries(MOOD_GENRES)) { if (g.some(t => tags.includes(t))) return m; } return null; };
    const allBookYears = [...new Set(books.map(b => b.year))].sort((a,b) => a-b);
    const minY = allBookYears[0] ?? 2011;
    const maxY = allBookYears[allBookYears.length - 1] ?? new Date().getFullYear();
    const span = maxY - minY;
    const eraBuckets = [
      { era: `${minY}–${minY + Math.floor(span*0.25)}`, s: minY, e: minY + Math.floor(span*0.25) },
      { era: `${minY + Math.floor(span*0.25)+1}–${minY + Math.floor(span*0.5)}`, s: minY + Math.floor(span*0.25)+1, e: minY + Math.floor(span*0.5) },
      { era: `${minY + Math.floor(span*0.5)+1}–${minY + Math.floor(span*0.75)}`, s: minY + Math.floor(span*0.5)+1, e: minY + Math.floor(span*0.75) },
      { era: `${minY + Math.floor(span*0.75)+1}–${maxY}`, s: minY + Math.floor(span*0.75)+1, e: maxY },
    ];
    const moodByEra = eraBuckets.map(({ era: e, s, e: end }) => {
      const sub = era(s, end).filter(b => bookMood(b));
      if (!sub.length) return null;
      const counts = {};
      sub.forEach(b => { const m = bookMood(b); counts[m] = (counts[m] || 0) + 1; });
      const dominant = Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];
      return { era: e, dominant, counts, total: sub.length };
    }).filter(Boolean);
    const fictionByEra = moodByEra; const peakFictionEra = null; const lowFictionEra = null;

    // Notable years — computed from actual volume, no hardcoded life events
    const yearCounts = Object.entries(stats.byYear).map(([y,c]) => ({ year: parseInt(y), count: c })).filter(y => y.year >= 2011).sort((a,b) => a.year - b.year);
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
      fictionByEra: moodByEra, peakFictionEra: null, lowFictionEra: null,
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

  const allGenres = genreList;
  const allYears = useMemo(() => Object.keys(stats.byYear).sort().reverse(), [stats]);
  const allAuthors = useMemo(() => [...new Set(books.flatMap(b => (b.authors || []).map(a => a.name)))].sort(), [books]);
  const allYearsList = useMemo(() => Object.keys(stats.byYearTracked).sort().map(Number), [stats]);

  const allYearsListFull = useMemo(() => Object.keys(stats.byYear).sort().map(Number), [stats]);

  const readTitlesString = useMemo(() =>
    books.slice(-200).map(b => b.title.toLowerCase().replace(/^(the|a|an) /i, "")).join("; "),
  [books]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const aiHeaders = () => ({
    "Content-Type": "application/json",
  });
  const CLAUDE_URL = "/api/claude";

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
      const res = await fetch(CLAUDE_URL, {
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

  const openAddModal = () => { setEditingBook(null); setBookDraft(EMPTY_DRAFT); setBookChatInput(""); setBookChatPending(null); setBookMsg(""); setShowBookModal(true); };
  const openEditModal = (b) => {
    setEditingBook(b);
    setBookDraft({
      title: b.title || "",
      authors: b.authors?.length ? b.authors.map(a => ({ name: a.name || "" })) : [{ name: b.author || "" }],
      genres: b.genre || [],
      yearStart: b.year_read_start || b.year || new Date().getFullYear(),
      yearEnd: b.year_read_end || b.year || new Date().getFullYear(),
      format: b.format || "Novel",
      fiction: b.fiction !== false,
      series: b.series || "",
      pages: b.pages ? String(b.pages) : "",
      notes: b.notes || "",
    });
    setBookChatInput(""); setBookChatPending(null); setBookMsg(""); setShowBookModal(true);
  };

  const chatFillBook = async () => {
    if (!bookChatInput.trim() || bookChatLoading) return;
    setBookChatLoading(true);
    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 400,
          system: `You are a book database assistant. Given a natural language description of a book, extract and return ONLY valid JSON (no markdown) with these fields: title (string), authors (array of {name, country}), genres (array, pick from: Fantasy, Sci-Fi, Thriller, Mystery, Literary Fiction, Historical Fiction, Non-Fiction, Graphic Novel, Memoir, Biography, Classic, Philosophy, Popular Science, Self-Help, Travel, Horror, History, Politics, Economics, Psychology, Business), fiction (boolean), format (MUST be exactly one of these values, no others allowed: "Novel", "Novella", "Short Stories", "Graphic Novel", "Non-Fiction", "Play"), series (string or ""), pages (number or null), year (original publication year as number).`,
          messages: [{ role: "user", content: bookChatInput }]
        })
      });
      const data = await res.json();
      const txt = data.content?.[0]?.text || "";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      setBookChatPending(parsed);
    } catch { setBookMsg("Could not parse. Try: 'Dune by Frank Herbert, sci-fi novel'."); }
    setBookChatLoading(false);
  };

  const applyPending = () => {
    if (!bookChatPending) return;
    setBookDraft(p => ({
      ...p,
      title: bookChatPending.title || p.title,
      authors: bookChatPending.authors?.length ? bookChatPending.authors : p.authors,
      genres: bookChatPending.genres?.length ? bookChatPending.genres : p.genres,
      fiction: bookChatPending.fiction !== undefined ? bookChatPending.fiction : p.fiction,
      format: bookChatPending.format || p.format,
      series: bookChatPending.series || p.series,
      pages: bookChatPending.pages ? String(bookChatPending.pages) : p.pages,
      yearStart: bookChatPending.year || p.yearStart,
      yearEnd: bookChatPending.year || p.yearEnd,
    }));
    setBookChatPending(null);
    setBookChatInput("");
  };

  const addGenre = async () => {
    const name = newGenreInput.trim();
    if (!name) return;
    if (genreList.includes(name)) { setNewGenreInput(""); setNewGenreOpen(false); return; }
    setNewGenreSaving(true);
    let color = "#a0a0a0";
    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 16,
          messages: [{ role: "user", content: `Pick a single hex color code that visually represents the "${name}" book genre. Consider the mood and tone of the genre. Reply with only the hex code (e.g. #a29bfe), nothing else. Avoid colors already used for similar genres: ${Object.entries(genreMap).map(([g,c])=>g+':'+c).join(', ')}` }]
        })
      });
      const data = await res.json();
      const hex = data.content?.[0]?.text?.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) color = hex;
    } catch { /* fallback to default */ }
    const sortOrder = genreList.length + 1;
    const { data, error } = await supabase.from("genres").insert([{ name, color, sort_order: sortOrder }]).select().single();
    if (!error && data) {
      setGenreList(prev => [...prev, name].sort());
      setGenreMap(prev => ({ ...prev, [name]: color }));
      setBookDraft(p => ({ ...p, genres: [...p.genres, name] }));
    }
    setNewGenreInput(""); setNewGenreOpen(false); setNewGenreSaving(false);
  };

  const saveBook = async () => {
    const { title, authors, genres, yearStart, yearEnd, format, fiction, series, pages, notes } = bookDraft;
    if (!title.trim() || !authors[0]?.name?.trim()) { setBookMsg("Title and at least one author are required."); return; }
    setBookSaving(true);
    try {
      const ys = parseInt(yearStart);
      const ye = parseInt(yearEnd);
      if (isNaN(ys) || isNaN(ye) || ys > ye) { setBookMsg("Year Start must be ≤ Year End."); setBookSaving(false); return; }
      if (editingBook) {
        // UPDATE existing book
        const { error } = await supabase.from("books").update({ title: title.trim(), year_read_start: ys, year_read_end: ye, genre: genres, format, fiction, series: series || "", pages: pages ? parseInt(pages) : null, notes: notes || "" }).eq("id", editingBook.id);
        if (error) throw error;
        await supabase.from("book_authors").delete().eq("book_id", editingBook.id);
        for (let i = 0; i < authors.length; i++) {
          const aName = authors[i].name.trim(); if (!aName) continue;
          const { data: au, error: auErr } = await supabase.from("authors").upsert([{ name: aName }], { onConflict: "name", ignoreDuplicates: false }).select().single();
          if (auErr || !au) throw new Error(`Could not resolve author: ${aName}`);
          if (!au.country) {
            const country = await lookupAuthorCountry(aName);
            if (country) await supabase.from("authors").update({ country }).eq("id", au.id);
          }
          await supabase.from("book_authors").insert([{ book_id: editingBook.id, author_id: au.id, author_order: i + 1 }]);
        }
        const updatedAuthors = authors.filter(a => a.name.trim()).map((a, i) => ({ author_order: i + 1, authors: { id: 0, name: a.name, country: a.country } }));
        const normalized = normalizeBook({ ...editingBook, title: title.trim(), year_read_start: ys, year_read_end: ye, genre: genres, format, fiction, series, pages: pages ? parseInt(pages) : null, notes, book_authors: updatedAuthors });
        setBooks(prev => prev.map(b => b.id === editingBook.id ? normalized : b));
        setBookMsg("✓ Book updated!");
      } else {
        // INSERT new book
        const { data: book, error: bookErr } = await supabase.from("books").insert([{ user_id: session.user.id, title: title.trim(), year_read_start: ys, year_read_end: ye, genre: genres, format, fiction, series: series || "", pages: pages ? parseInt(pages) : null, notes: notes || "", user_added: true }]).select().single();
        if (bookErr) throw bookErr;
        const bookAuthors = [];
        for (let i = 0; i < authors.length; i++) {
          const aName = authors[i].name.trim(); if (!aName) continue;
          const { data: au, error: auErr } = await supabase.from("authors").upsert([{ name: aName }], { onConflict: "name", ignoreDuplicates: false }).select().single();
          if (auErr || !au) throw new Error(`Could not resolve author: ${aName}`);
          if (!au.country) {
            const country = await lookupAuthorCountry(aName);
            if (country) {
              await supabase.from("authors").update({ country }).eq("id", au.id);
              au.country = country;
            }
          }
          await supabase.from("book_authors").insert([{ book_id: book.id, author_id: au.id, author_order: i + 1 }]);
          bookAuthors.push({ author_order: i + 1, authors: au });
        }
        setBooks(prev => [...prev, normalizeBook({ ...book, book_authors: bookAuthors })]);
        setBookMsg("✓ Book added!");
        setTimeout(() => fetchAnalysisAI(), 2000); // regenerate in background after state settles
      }
      setTimeout(() => { setShowBookModal(false); setBookMsg(""); }, 1200);
    } catch (e) { console.error("saveBook error:", e); setBookMsg(`Error: ${e?.message || JSON.stringify(e)}`); }
    setBookSaving(false);
  };

  const deleteBook = async () => {
    if (!editingBook) return;
    setBookSaving(true);
    try {
      await supabase.from("book_authors").delete().eq("book_id", editingBook.id);
      const { error } = await supabase.from("books").delete().eq("id", editingBook.id);
      if (error) throw error;
      setBooks(prev => prev.filter(b => b.id !== editingBook.id));
      setShowBookModal(false);
    } catch (e) { console.error("deleteBook error:", e); setBookMsg(`Error: ${e?.message || JSON.stringify(e)}`); }
    setBookSaving(false);
  };

  const lookupAuthorCountry = async (authorName) => {
    try {
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", max_tokens: 20,
          messages: [{ role: "user", content: `What country is the author "${authorName}" from? Reply with only the ISO 3166-1 short country name (e.g. "United Kingdom" not "UK", "United States" not "USA", "Czechia" not "Czech Republic"). If unknown, reply "Unknown".` }]
        })
      });
      const data = await res.json();
      return data.content?.[0]?.text?.trim() || null;
    } catch { return null; }
  };

  const generateSeriesRecap = async (seriesName) => {
    if (!seriesName || seriesLoading) return;
    setSeriesLoading(true);
    setSeriesRecap(null);
    const seriesBooks = books.filter(b => b.series === seriesName).sort((a, b) => (a.id - b.id));
    try {
      const res = await fetch(CLAUDE_URL, {
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

  const saveAnalysisToSupabase = async (data) => {
    try {
      await supabase.from("analysis_cache").upsert({ id: 1, fingerprint: booksFingerprint, data });
    } catch(e) { console.error("Failed to save analysis to Supabase:", e); }
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
    const dimensions = ["temporal", "genre", "geographic", "author", "thematic", "contextual", "complexity", "emotional", "discovery"];
    const ctx = buildBookContext();
    const fullList = books
      .map(b => `[${b.year_read_end || b.year}] "${b.title}" by ${b.author} | ${(b.genre||[]).join("/")}${b.pages ? " | " + b.pages + "pp" : ""}${b.series ? " | series: " + b.series : ""}${b.fiction !== undefined ? " | " + (b.fiction ? "fiction" : "non-fiction") : ""}${b.notes ? " | notes: " + b.notes : ""}`)
      .join("\n");
    const result = {};
    for (const dimension of dimensions) {
      try {
        const effectivePrompt = panelPrompts[dimension]?.trim() || DEFAULT_PANEL_PROMPTS[dimension] || "";
        const customInstruction = effectivePrompt ? `\n\nFocus: ${effectivePrompt}` : "";
        const res = await fetch(CLAUDE_URL, {
          method: "POST", headers: aiHeaders(),
          body: JSON.stringify({
            model: "claude-sonnet-4-6", max_tokens: 350,
            system: `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly one key: "${dimension}". Write 3-4 concise sentences focused on patterns and arc — not catalogues of titles or authors. Mention at most 1-2 specific examples to ground the observation. Do not invent facts.${customInstruction}\n\nCRITICAL: Year 2010 is a placeholder for all books read 1998–2010. Never describe it as a peak or anomaly.`,
            messages: [{ role: "user", content: `${ctx}\n\n--- FULL BOOK LIST (${books.length} books) ---\n${fullList}\n\nGenerate insight for the "${dimension}" dimension only.` }]
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
      } catch(e) { console.error(`Analysis AI error (${dimension}):`, e); }
    }
    localStorage.setItem("nairrative_analysis_ai", JSON.stringify(result));
    localStorage.setItem("nairrative_analysis_fp", booksFingerprint);
    saveAnalysisToSupabase(result);
    setAnalysisAILoading(false);
  };

  const saveRecsToSupabase = async (data) => {
    try {
      await supabase.from("recs_cache").upsert({ id: 1, fingerprint: booksFingerprint, data });
    } catch(e) { console.error("Failed to save recs to Supabase:", e); }
  };

  const fetchIntentRecs = async (intentId, input = "") => {
    if (intentLoading[intentId]) return;
    setIntentLoading(p => ({ ...p, [intentId]: true }));
    const rc = (refreshCounts[intentId] || 0) + 1;
    setRefreshCounts(p => ({ ...p, [intentId]: rc }));
    const lastBook = books[books.length - 1];
    const lastAuthor = lastBook?.author || "Brandon Sanderson";
    const seriesList = [...new Set(books.filter(b => b.series?.trim()).map(b => b.series))];
    const randomSeries = seriesList[Math.floor(Math.random() * seriesList.length)] || "Wheel of Time";
    const today = new Date().toISOString().slice(0, 10);
    const variationNote = rc > 1 ? ` This is refresh #${rc} — you MUST pick a completely different book from any prior recommendation for this lens.` : "";
    const prompts = {
      "more-like": `The user's most recent read is "${lastBook?.title}" by ${lastAuthor}. Recommend 1 unread book with the same feel, themes, or writing style that this reader would love.${variationNote}`,
      "more-by-last": `The user's most recent author is ${lastAuthor}. Recommend 1 other book by ${lastAuthor} that the reader hasn't read yet. If all are read, recommend 1 book by an author with very similar style.${variationNote}`,
      "similar-author": `Based on the reader loving ${lastAuthor}, recommend 1 book by an author with a very similar writing style, themes, or storytelling approach.${variationNote}`,
      "trending": `Today is ${today}. Recommend 1 book that is critically acclaimed, culturally buzzy, or award-shortlisted in 2024–2026 that fits this reader's taste profile. Use web search to verify it is actually available and well-reviewed.${variationNote}`,
      "challenge": `This reader favors accessible genre fiction. Recommend 1 genuinely challenging, rewarding read — dense classic, experimental fiction, or demanding long-form non-fiction.${variationNote}`,
      "quick": `Recommend 1 book under 300 pages that is deeply rewarding given this reader's taste (thrillers, literary fiction, fantasy).${variationNote}`,
      "gaps": `This reader's library skews Western/Indian/anglophone. Recommend 1 book from an underrepresented literary tradition — Japanese, African, Latin American, Nordic, Arabic, or Southeast Asian voices.${variationNote}`,
      "surprise": `Give 1 wildly unexpected book recommendation that this reader would never pick for themselves but would secretly love. Bold, surprising, off-pattern pick.${variationNote}`,
      "finish": `This reader has read books from the series "${randomSeries}". Recommend 1 book that is either the next unread entry in this series or a very similar series with satisfying completions.${variationNote}`,
      "loved": `The user loved: "${input}". Recommend 1 book with similar appeal — themes, pacing, emotional tone, or narrative style.${variationNote}`,
      "authors-like": `The user loves authors like ${input}. Recommend 1 book by a different author with very similar style, subject matter, or storytelling sensibility.${variationNote}`,
      "mood": `The user is in the mood for: "${input}". Recommend 1 book that perfectly matches this emotional register or atmosphere.${variationNote}`,
      "genre-pick": `Recommend 1 excellent book in the genre: "${input}". Today is ${today} — consider recent releases as well as classics.${variationNote}`,
      "topic": `Recommend 1 book about: "${input}". Cross genre if needed — fiction, non-fiction, memoir. Today is ${today}.${variationNote}`,
      "occasion": `Recommend 1 book perfect for: "${input}". Match tone, length, and engagement level to the occasion.${variationNote}`,
      "pair": `The user wants to pair a book with: "${input}" (a film, show, event, or experience). Recommend 1 ideal companion read.${variationNote}`,
    };
    try {
      const useWebSearch = intentId === "trending" || intentId === "pair";
      const body = {
        model: "claude-haiku-4-5-20251001", max_tokens: 400,
        system: `You are a precise book recommendation engine. Today is ${today}. Reader history:\n${buildBookContext()}\n\nDo NOT recommend any of these already-read titles: ${readTitlesString}.\n\nOnly recommend unread books published up to ${today}.\n\n${prompts[intentId] || input}\n\nReturn ONLY a JSON array — no markdown, no explanation. Exactly 1 item. Format: [{"title": "...", "author": "...", "year": 2024, "reason": "1-2 sentences why it fits this reader"}].`,
        messages: [{ role: "user", content: "JSON array only." }],
      };
      if (useWebSearch) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }];
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || data.error.type || JSON.stringify(data.error));
      const txt = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      const m = txt.match(/\[[\s\S]*?\]/);
      const parsed = m ? JSON.parse(m[0]) : JSON.parse(txt.replace(/```json|```/g, "").trim());
      setIntentResults(prev => {
        const updated = { ...prev, [intentId]: Array.isArray(parsed) ? parsed.slice(0, 1) : [] };
        localStorage.setItem("nairrative_recs", JSON.stringify(updated));
        localStorage.setItem("nairrative_recs_fp", booksFingerprint);
        saveRecsToSupabase(updated);
        return updated;
      });
    } catch (e) {
      console.error("fetchIntentRecs error:", e);
      setIntentResults(p => ({ ...p, [intentId]: [{ title: "Could not load", author: "", reason: e?.message || "Unknown error — check console for details." }] }));
    }
    setIntentLoading(p => { const n = { ...p }; delete n[intentId]; return n; });
  };

  const addBook = async () => {
    if (!newBook.title.trim() || !newBook.author.trim()) { setAddMsg("Title and author are required."); return; }
    const yr = parseInt(newBook.year);
    // 1. Insert book
    const { data: book, error: bookErr } = await supabase.from("books").insert([{
      user_id: session.user.id,
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
    .lib-row { display: grid; grid-template-columns: 2fr 150px 110px 90px 90px 50px 56px 56px 32px; gap: 10px; padding: 9px 14px; border-bottom: 1px solid ${G.border}; align-items: center; transition: background 0.15s; }
    .cell-clip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lib-row:hover { background: ${G.card2}; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .modal-box { background: ${G.card}; border: 1px solid ${G.border}; border-radius: 16px; width: 100%; max-width: 540px; max-height: 88vh; overflow-y: auto; padding: 28px; position: relative; }
    .modal-box::-webkit-scrollbar { width: 4px; } .modal-box::-webkit-scrollbar-track { background: transparent; } .modal-box::-webkit-scrollbar-thumb { background: ${G.dimmed}; border-radius: 4px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.3s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse { animation: pulse 1.5s infinite; }
    .burger-btn { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 4px; }
    @media (max-width: 640px) {
      .tab-nav { display: none !important; }
      .burger-btn { display: flex !important; }
      .page-header { padding: 16px 16px 0 !important; }
      .page-content { padding: 16px !important; }
      .header-logo { width: 200px !important; height: auto !important; }
      .kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
      .chart-grid { grid-template-columns: 1fr !important; }
      .rec-grid { grid-template-columns: 1fr !important; }
      .analysis-grid { grid-template-columns: 1fr !important; }
      .lib-table-wrap { overflow-x: auto; }
    }
  `;

  // ── TABS CONFIG ────────────────────────────────────────────────────────────
  const TABS = [
    { id: "overview", icon: "◎", label: "Overview" },
    { id: "analysis", icon: "▦", label: "Analysis" },
    { id: "library", icon: "≡", label: "Library" },
    { id: "recs", icon: "✦", label: "Recommendations" },
    { id: "series", icon: "⊙", label: "Series Recap" },
    { id: "chat", icon: "◈", label: "AI Chat" },
  ];


  const SEED_ANALYSIS = {"temporal":"This reading life unfolds in three acts. The pre-2010 period is defined by completionist consumption of Anglo-American genre fiction — thrillers, medical procedurals, and canonical science fiction devoured in bulk. The 2011–2016 transition pivots toward epic fantasy, with Sanderson's Cosmere becoming the new long-term commitment, while non-fiction begins appearing as intellectual curiosity grows. The most dramatic shift comes in 2019–2021: a concentrated turn toward Indian literary fiction, political non-fiction, economics, and climate writing — reading repurposed as a tool for understanding systems rather than escapism. The 2025–2026 entries introduce romantasy for the first time, a genre absent from the prior 350 books, suggesting either a shift in taste or a new reading influence. Sanderson is the only constant threading through every era.","genre":"Genre evolution here traces a clear arc: from plot-driven thriller and science fiction machinery in the early years, through an extended fantasy commitment in the 2010s, toward a diverse mix of literary fiction, political non-fiction, and economics by 2021. The pre-2010 reading is anchored in institutional thrillers — legal, medical, espionage — and classic SF. Fantasy enters around 2011 and becomes dominant, driven by long-form series investment. Literary fiction and serious non-fiction arrive meaningfully only in the later years, representing a shift from entertainment to inquiry. The 2025–2026 romantasy pivot is the single most genre-disruptive development, introducing romance as a primary narrative engine for the first time.","thematic":"The library traces a journey from individual exceptionalism toward systemic thinking. Early reading celebrates lone protagonists who bend the world through will — thriller heroes, maverick scientists, Rand's idealists. A quieter counter-thread of philosophical and spiritual reading (eastern philosophy, self-help) runs alongside. By 2019–2021, the dominant concern shifts: economics, caste, climate, political power — systems that shape lives rather than individuals who transcend them. The fiction reflects this too: Sanderson's rule-bound magic systems mirror the non-fiction turn toward structural thinking, while the recent romantasy marks another evolution — emotional vulnerability and connection treated as sources of power, a worldview the earlier reading self would have resisted.","contextual":"The reading history reflects a reader whose interests evolved alongside life experience. The early years consumed genre fiction voraciously and systematically. The 2011–2016 period shows a quieter, more selective phase with fantasy as the anchor. Around 2019, something shifted — a concentrated engagement with Indian literature and politics, global economics, climate, and memoir suggests a period of active self-education and civic awakening. The 2020 memoir cluster reads like a search for models of conviction during uncertain times. The 2025–2026 romantasy phase is the most surprising turn, pointing to either an expansion of emotional appetite or the influence of a new reading context entirely.","complexity":"The intellectual arc moves from high-readability genre fiction toward more demanding literary and non-fiction territory, though not in a straight line. The early years prioritize propulsive plotting over structural ambition. Complexity seeds appear early — philosophical fiction, canonical SF — but the real inflection comes in 2019–2021 with long, dense literary novels alongside rigorous non-fiction in economics, caste theory, and systems thinking. The 2025–2026 romantasy pivot represents a deliberate step back toward emotional immersion over intellectual challenge, which is itself a form of maturity — the comfort to oscillate rather than always climb.","emotional":"The emotional register shifts markedly over time. Early reading is dominated by detached, plot-driven fiction where intellectual suspense substitutes for empathic engagement. The philosophical reading of that era similarly prizes self-sufficiency. The turn comes gradually: Indian literary fiction about suffering and social cruelty, memoir as a vehicle for real interiority, and eventually Dostoevsky and Kristof in the same year — books that insist emotional life is not a weakness but the substance of moral experience. The romantasy of 2025–2026 completes the arc: stories built around longing and vulnerability, from a reader who once processed the world almost entirely through genre machinery.","discovery":"The most revealing pattern is the shift from wholesale author consumption to more curated, thematically driven reading. The early phase systematically exhausted entire backlists once an author was discovered. By the 2010s, series commitment replaced author loyalty as the organizing principle. The 2019–2021 period shows a reader following ideas across books and authors rather than chasing a single writer — economics leads to more economics, Indian politics to more Indian politics. The 2025–2026 romantasy surge breaks the pattern entirely, representing a genre with no precedent in the prior reading history and suggesting the library has entered a genuinely new phase."};

  // Populated by: node scripts/generate-recs.mjs 2>$null (PowerShell) or ANTHROPIC_API_KEY=... node scripts/generate-recs.mjs (Git Bash)
  const SEED_RECS = {"more-like":[{"title":"Piranesi","author":"Susanna Clarke","year":2020,"reason":"Like Yumi, it places you in an inventive dreamlike world where the protagonist pieces together truth through artful observation — mysterious, quietly emotional, and unlike anything else in the genre."}],"more-by-last":[{"title":"Rhythm of War","author":"Brandon Sanderson","year":2020,"reason":"The natural next Stormlight read after Dawnshard — book four deepens Kaladin's mental health arc and gives the Fused a perspective that reframes everything before it."}],"similar-author":[{"title":"Promise of Blood","author":"Brian McClellan","year":2013,"reason":"McClellan was Sanderson's student and delivers the same meticulous magic systems and political intrigue, set in a gunpowder-fantasy world that feels immediately distinct."}],"trending":[{"title":"James","author":"Percival Everett","year":2024,"reason":"The 2024 Pulitzer winner reimagines Huckleberry Finn from Jim's perspective — sharp, layered, and one of the most discussed literary novels in recent years."}],"challenge":[{"title":"2666","author":"Roberto Bolaño","year":2004,"reason":"A five-part masterwork spanning continents and decades — demanding but transformative, and one of the most ambitious novels of the past twenty years."}],"quick":[{"title":"The Vegetarian","author":"Han Kang","year":2007,"reason":"At 188 pages it is one of the most unsettling and beautifully constructed novels in contemporary literary fiction — stays with you for months."}],"gaps":[{"title":"The Memory Police","author":"Yoko Ogawa","year":1994,"reason":"A quiet Japanese masterpiece about memory, loss, and disappearance — Ogawa's prose is deceptively spare and the dread accumulates without you noticing."}],"surprise":[{"title":"Lincoln in the Bardo","author":"George Saunders","year":2017,"reason":"A Booker Prize-winning novel told through ghosts and historical fragments — nothing in your library resembles it, and it is quietly devastating."}],"finish":[{"title":"Red Seas Under Red Skies","author":"Scott Lynch","year":2007,"reason":"You read The Lies of Locke Lamora and stopped — this second Gentleman Bastard entry takes Locke and Jean to a casino city and a pirate ship, with all the wit and plotting of the first."}],"loved":[{"title":"Zen and the Art of Motorcycle Maintenance","author":"Robert Pirsig","year":1974,"reason":"Like God's Debris, it wraps a deep philosophical inquiry into an accessible narrative journey — Pirsig's meditation on quality, rationality, and meaning is one of the great mind-expanding reads."}],"authors-like":[{"title":"My Name is Red","author":"Orhan Pamuk","year":1998,"reason":"Pamuk shares Shafak's Istanbul roots, lyrical density, and interest in the tension between Eastern tradition and Western modernity — told through multiple voices across a murder mystery set in Ottoman miniature art."}],"mood":[{"title":"They Thought They Were Free","author":"Milton Mayer","year":1955,"reason":"Mayer interviewed ordinary Germans after WWII and asked how they let it happen — the answers are quietly terrifying and more relevant now than ever."}],"genre-pick":[{"title":"Project Hail Mary","author":"Andy Weir","year":2021,"reason":"A lone astronaut wakes up with no memory on a desperate mission to save Earth — propulsive, clever, and one of the most purely enjoyable science fiction novels in years."}],"topic":[{"title":"Klara and the Sun","author":"Kazuo Ishiguro","year":2021,"reason":"Narrated by an AI solar-powered companion observing human behaviour with alien precision — Ishiguro's quietest novel asks the deepest questions about consciousness, love, and what it means to be human."}],"pair":[{"title":"The Spy Who Came in from the Cold","author":"John le Carré","year":1963,"reason":"The definitive spy thriller companion to Dhurandhar — le Carré's bleak, morally ambiguous world of double agents and institutional betrayal is exactly the register the film operates in."}]};

const DEFAULT_PANEL_PROMPTS = {
    temporal: "Analyse reading pace and volume over time. Note key shifts and how habits evolved. Keep it concise — 3-4 sentences, no exhaustive author lists.",
    genre: "Examine how genre preferences shifted across eras. Identify dominant genres and notable transitions. Keep it concise — 3-4 sentences, focus on patterns not catalogues.",
    thematic: "Surface the 2-3 most significant recurring themes or intellectual preoccupations across the library. Keep it concise — 3-4 sentences.",
    contextual: "Connect reading choices to life phases and context. Keep it concise — 3-4 sentences, focus on the narrative arc not individual books.",
    complexity: "Evaluate the balance between challenging and accessible reading over time. Keep it concise — 3-4 sentences, mention at most one or two specific examples.",
    emotional: "Map the emotional arc of the library across eras. Keep it concise — 3-4 sentences, describe the shift in register without listing many titles.",
  };

  const updatePanelPrompt = (dimension, value) => {
    setPanelPrompts(p => {
      const updated = { ...p, [dimension]: value };
      localStorage.setItem("nairrative_panel_prompts", JSON.stringify(updated));
      return updated;
    });
  };

  const savePanelPromptsToSupabase = (prompts) => {
    supabase.from("panel_prompts").upsert({ id: 1, data: prompts }).catch(() => {});
  };

  const regeneratePanel = async (dimension) => {
    if (panelLoading[dimension]) return;
    setPanelLoading(p => ({ ...p, [dimension]: true }));
    try {
      const ctx = buildBookContext();
      const fullList = books
        .map(b => `[${b.year_read_end || b.year}] "${b.title}" by ${b.author} | ${(b.genre||[]).join("/")}${b.pages ? " | " + b.pages + "pp" : ""}${b.series ? " | series: " + b.series : ""}${b.fiction !== undefined ? " | " + (b.fiction ? "fiction" : "non-fiction") : ""}${b.notes ? " | notes: " + b.notes : ""}`)
        .join("\n");
      const effectivePrompt = panelPrompts[dimension]?.trim() || DEFAULT_PANEL_PROMPTS[dimension] || "";
      const customInstruction = effectivePrompt ? `\n\nFocus: ${effectivePrompt}` : "";
      const res = await fetch(CLAUDE_URL, {
        method: "POST", headers: aiHeaders(),
        body: JSON.stringify({
          model: "claude-opus-4-6", max_tokens: 400,
          system: `You are analyzing a personal reading database. Return ONLY a valid JSON object with exactly one key: "${dimension}". Write 3-4 concise sentences — surface a non-obvious pattern or insight. Mention at most 1-2 specific authors or titles as illustrative examples; do not catalogue books. Do not invent facts.${customInstruction}\n\nCRITICAL: Year 2010 is a placeholder for all books read 1998–2010. Never describe it as a peak or anomaly.`,
          messages: [{ role: "user", content: `${ctx}\n\n--- FULL BOOK LIST (${books.length} books) ---\n${fullList}\n\nGenerate insight for the "${dimension}" dimension only.` }]
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
    } catch(e) { console.error("Panel regenerate error:", e); }
    setPanelLoading(p => ({ ...p, [dimension]: false }));
    savePanelPromptsToSupabase(panelPrompts);
    setEditingPanel(null);
  };

  const renderEditIcon = (dimension) => {
    if (session) return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button onClick={() => regeneratePanel(dimension)} title="Refresh with Opus" style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>↻</button>
        <button onClick={() => { setEditingPanel(editingPanel === dimension ? null : dimension); setViewingPanel(null); }} title="Edit prompt" style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>✎</button>
      </div>
    );
    return (
      <button onClick={() => setViewingPanel(viewingPanel === dimension ? null : dimension)} title="View prompt" style={{ background: "none", border: "none", cursor: "pointer", color: G.muted, fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}>⊙</button>
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
              <button onClick={() => { savePanelPromptsToSupabase(panelPrompts); setEditingPanel(null); }} style={{ background: "none", border: `1px solid ${G.border}`, borderRadius: 5, color: G.muted, fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>Save</button>
              <button onClick={() => regeneratePanel(dimension)} style={{ background: G.gold, border: "none", borderRadius: 5, color: "#000", fontSize: 11, fontWeight: 600, padding: "4px 12px", cursor: "pointer" }}>Regenerate</button>
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

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: G.bg, color: G.text, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* HEADER */}
      <div className="page-header" style={{ padding: "28px 28px 0", background: G.bg }}>
        {/* Logo row */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16, position: "relative" }}>
          <img src="/nairrative.png" alt="Nairrative" className="header-logo" style={{ width: 398, height: 113, mixBlendMode: "multiply" }} />
          <div style={{ position: "absolute", right: 0, top: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {/* Burger — mobile only */}
            <button className="burger-btn" onClick={() => setMobileMenuOpen(o => !o)}
              title="Menu" style={{ color: G.muted }}>
              <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
              <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
              <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
            </button>
            {/* Lock */}
            <button onClick={() => session ? logout() : setShowLoginModal(true)}
              title={session ? "Sign out" : "Sign in"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 1, color: session ? G.gold : G.dimmed }}>
              {session
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Desktop tab bar */}
        <div className="tab-nav" style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 4, width: "fit-content", margin: "0 auto" }}>
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}>
                <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, background: G.card, borderBottom: `1px solid ${G.border}`, padding: "8px 16px 12px", marginTop: 8 }}>
            {TABS.map(t => (
              <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => { setActiveTab(t.id); setMobileMenuOpen(false); }}>
                <span style={{ marginRight: 8 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="fade-in page-content" style={{ padding: "24px 28px" }}>

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (() => {
          const cb = id => { const r = getChartRange(id); return books.filter(b => b.year >= r.from && b.year <= r.to); };

          const ycBooks = cb("yc");
          const ycData = Object.entries(ycBooks.reduce((a,b)=>{a[b.year]=(a[b.year]||0)+1;return a;},{})).sort((a,b)=>Number(a[0])-Number(b[0])).map(([year,count])=>({year,count}));
          const ycMax = Math.max(...ycData.map(d=>d.count),1);

          const gcBooks = cb("gc");
          const gcData = Object.entries(gcBooks.reduce((a,b)=>{(b.genre||[]).forEach(g=>{a[g]=(a[g]||0)+1;});return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([genre,count])=>({genre,count}));

          const fnBooks = cb("fn");
          const fnYrs = [...new Set(fnBooks.map(b=>b.year))].sort();
          const fnData = fnYrs.map(year=>{const yb=fnBooks.filter(b=>b.year===year);return{year,Fiction:yb.filter(b=>b.fiction).length,"Non-Fiction":yb.filter(b=>b.fiction===false).length};});

          const geBooks = cb("ge");
          const geYrs = [...new Set(geBooks.map(b=>b.year))].sort();
          const geCount = geBooks.reduce((a,b)=>{(b.genre||[]).forEach(g=>{a[g]=(a[g]||0)+1;});return a;},{});
          const geTop5 = Object.entries(geCount).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([g])=>g);
          const geData = geYrs.map(year=>{const e={year};geTop5.forEach(g=>{e[g]=geBooks.filter(b=>b.year===year&&(b.genre||[]).includes(g)).length;});return e;});

          const acBooks = cb("ac");
          const acData = Object.entries(acBooks.reduce((a,b)=>{a[b.author]=(a[b.author]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([author,count])=>({author,count}));

          const coBooks = cb("co");
          const coData = Object.entries(coBooks.filter(b=>b.country).reduce((a,b)=>{a[b.country]=(a[b.country]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([country,count])=>({country,count}));

          const alBooks = cb("al");
          const alYrs = [...new Set(alBooks.filter(b=>b.pages&&b.year>2010).map(b=>b.year))].sort();
          const alData = alYrs.map(year => { const yb = alBooks.filter(b=>b.year===year&&b.pages); return yb.length ? { year, avg: Math.round(yb.reduce((s,b)=>s+b.pages,0)/yb.length) } : null; }).filter(Boolean);

          const fmBooks = cb("fm");
          const fmCounts = fmBooks.reduce((a,b)=>{ const f=b.format||"Unknown"; a[f]=(a[f]||0)+1; return a; },{});
          const FORMAT_COLORS = { "Novel": "#2d6a4f", "Graphic Novel": "#06d6a0", "Non-Fiction": "#4a9eff", "Novella": "#c9a84c", "Short Stories": "#e06c75", "Play": "#c3a6ff", "Unknown": "#b2bec3" };
          const fmData = Object.entries(fmCounts).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value,color:FORMAT_COLORS[name]||G.muted}));

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

          const timeChartIds = new Set(["yc", "fn", "ge", "al"]);
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
            <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Books Read", value: stats.total, color: "#d97706" },
                { label: "Authors Read", value: new Set(books.map(b => b.author)).size, color: "#db2777" },
                { label: "Books / Year", value: (() => { const activeYears = Object.keys(stats.byYearTracked).filter(y => Number(y) > 2010).length; return activeYears ? Math.round(books.filter(b => b.year > 2010).length / activeYears) : "—"; })(), color: "#0e9488" },
                { label: "Pages / Book", value: (() => { const withPages = books.filter(b => b.pages); return withPages.length ? Math.round(withPages.reduce((s,b) => s + b.pages, 0) / withPages.length).toLocaleString() : "—"; })(), color: "#f59e0b" },
                { label: "Countries", value: Object.keys(stats.byCountry).length, color: "#06b6d4" },
                { label: "Years Reading", value: stats.readingSpan, color: G.blue },
                { label: "Peak Year", value: `${stats.sortedYears[0]?.[0]} (${stats.sortedYears[0]?.[1]})`, color: "#0284c7" },
                { label: "#1 Author", value: stats.sortedAuthors[0]?.[0], color: G.purple },
                { label: "Top Genre", value: stats.sortedGenres[0]?.[0], color: "#ff9f7f" },
              ].map((s, i) => (
                <div key={i} className="stat-card" style={{ padding: "12px 14px" }}>
                  <div style={{ color: G.muted, fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ color: s.color, fontSize: 18, fontFamily: "'Playfair Display', serif", fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                  {s.sub && <div style={{ color: G.muted, fontSize: 10, marginTop: 3 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            <div className="chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
                        {gcData.map((e, i) => <Cell key={i} fill={genreMap[e.genre] || G.muted} />)}
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
                    {geTop5.map(g => <Area key={g} type="monotone" dataKey={g} stackId="1" stroke={genreMap[g]} fill={genreMap[g]} fillOpacity={0.5} />)}
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Avg Book Length Over Time */}
              {chartCard("Avg Book Length Over Time", "al",
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={alData}>
                    <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} unit=" pp" />
                    <Tooltip content={<DarkTooltip />} formatter={v => [`${v} pages`, "Avg length"]} />
                    <Line type="monotone" dataKey="avg" stroke={G.gold} strokeWidth={2} dot={{ fill: G.gold, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Format Breakdown */}
              {chartCard("Format Breakdown", "fm",
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={fmData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {fmData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 8 }}>
                    {fmData.slice(0, 5).map(e => (
                      <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: G.muted }}>{e.name}</span>
                        <span style={{ fontSize: 10, color: G.dimmed }}>{e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                  <div style={{ color: G.muted, fontSize: 13 }}>{Object.keys(DEFAULT_PANEL_PROMPTS).length} lenses into {stats.total} books across {span} years ({minYear}–present).</div>
                </div>
              );
            })()}
            <div className="analysis-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>

              {/* 1 · TEMPORAL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Temporal</span>{renderEditIcon("temporal")}</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Genre & Form</span>{renderEditIcon("genre")}</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ background: `${G.gold}18`, color: G.gold, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Thematic</span>{renderEditIcon("thematic")}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Recurring Intellectual Preoccupations</div>
                {renderInsight("thematic", false)}
              </div>

              {/* 6 · SOCIAL & CONTEXTUAL */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ background: `${G.blue}18`, color: G.blue, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Social & Contextual</span>{renderEditIcon("contextual")}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Life Shapes the List</div>
                {renderInsight("contextual")}
              </div>

              {/* 7 · COMPLEXITY & CHALLENGE */}
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ background: `${G.red}18`, color: G.red, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Complexity & Challenge</span>{renderEditIcon("complexity")}</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ background: `${G.purple}18`, color: G.purple, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>Emotional Arc</span>{renderEditIcon("emotional")}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text, margin: "10px 0 14px" }}>Mood Mapping by Era</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                  {analysisInsights.fictionByEra.map(({ era, dominant, counts, total }) => (
                    <div key={era}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: G.text, fontWeight: 600 }}>{era}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: { "Dark & Tense": "#e06c75", "Imaginative": "#4a9eff", "Reflective": "#c3a6ff", "Informative": "#ffd166" }[dominant] }}>{dominant}</span>
                      </div>
                      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
                        {Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([mood, c]) => (
                          <div key={mood} title={`${mood}: ${c}`} style={{ width: `${Math.round(c/total*100)}%`, background: { "Dark & Tense": "#e06c75", "Imaginative": "#4a9eff", "Reflective": "#c3a6ff", "Informative": "#ffd166" }[mood], borderRadius: 2 }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {renderInsight("emotional")}
              </div>



            </div>
          </div>
        )}

        {/* ── LIBRARY ────────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div>
            {/* Filter row */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <input className="input-dark" style={{ width: 190, flex: "0 0 auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              <MultiSelect options={allGenres} selected={libGenres} onChange={setLibGenres} placeholder="Genre" style={{ width: 130, flex: "0 0 auto" }} />
              <MultiSelect options={allYears} selected={libYears} onChange={setLibYears} placeholder="Year" style={{ width: 100, flex: "0 0 auto" }} />
              <MultiSelect options={allAuthors} selected={libAuthors} onChange={setLibAuthors} placeholder="Author" style={{ width: 160, flex: "0 0 auto" }} />
              <select className="input-dark" style={{ width: 120, flex: "0 0 auto" }} value={libSort} onChange={e => setLibSort(e.target.value)}>
                <option value="year">Sort: Year</option>
                <option value="title">Sort: Title</option>
                <option value="author">Sort: Author</option>
              </select>
              <span style={{ color: G.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filteredBooks.length} books</span>
              <div style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={downloadCSV}>↓ CSV</button>
              <button className="btn-ghost" onClick={downloadJSON}>↓ JSON</button>
              <button className="btn-gold" style={{ padding: "7px 16px", fontSize: 12, opacity: session ? 1 : 0.35, cursor: session ? "pointer" : "not-allowed" }} onClick={() => session && openAddModal()}>+ Add Book</button>
            </div>

            {/* Table Header */}
            <div className="lib-row" style={{ background: G.card2, borderRadius: "8px 8px 0 0", borderBottom: `1px solid ${G.border}` }}>
              {["Title", "Author", "Genre", "Format", "Type", "Pages", "Start", "End", ""].map(h => (
                <div key={h} style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="lib-table-wrap" style={{ background: G.card, border: `1px solid ${G.border}`, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 520, overflowY: "auto" }}>
              {filteredBooks.map(b => (
                <div key={b.id} className="lib-row">
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <a href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(b.title + " " + b.author)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 500, color: G.text, textDecoration: "none" }} onMouseOver={e=>e.target.style.color=G.gold} onMouseOut={e=>e.target.style.color=G.text}>{b.title}</a>
                  </div>
                  <div title={b.author} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: G.muted }}>
                    {(b.authors?.length ? b.authors : [{ name: b.author }]).map((a, i) => (
                      <span key={i}>
                        {i > 0 && <span style={{ color: G.dimmed }}>, </span>}
                        <a href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(a.name)}`} target="_blank" rel="noopener noreferrer" style={{ color: G.muted, textDecoration: "none" }} onMouseOver={e=>e.target.style.color=G.gold} onMouseOut={e=>e.target.style.color=G.muted}>{a.name}</a>
                      </span>
                    ))}
                  </div>
                  <div title={(b.genre||[]).join(", ")} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: G.muted }}>
                    {(b.genre||[]).map((g, i) => (
                      <span key={g}>{i > 0 && <span style={{ color: G.dimmed }}>, </span>}<span style={{ color: genreMap[g]||G.muted }}>{g}</span></span>
                    ))}
                  </div>
                  <div className="cell-clip" title={b.format || "—"} style={{ fontSize: 11, color: G.muted }}>{b.format || "—"}</div>
                  <div className="cell-clip" title={b.fiction !== undefined ? (b.fiction ? "Fiction" : "Non-Fiction") : "—"} style={{ fontSize: 11, color: b.fiction ? G.blue : G.copper }}>{b.fiction !== undefined ? (b.fiction ? "Fiction" : "Non-Fiction") : "—"}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.pages || "—"}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.year_read_start || "—"}</div>
                  <div style={{ fontSize: 12, color: G.muted }}>{b.year_read_end || "—"}</div>
                  <button onClick={() => session && openEditModal(b)} style={{ background: "none", border: "none", color: session ? G.muted : G.dimmed, cursor: session ? "pointer" : "not-allowed", fontSize: 13, padding: 0 }} title={session ? "Edit" : "Sign in to edit"}>✎</button>
                </div>
              ))}
              {filteredBooks.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: G.muted }}>No books match your filters.</div>
              )}
            </div>
          </div>
        )}

        {/* ── BOOK MODAL (Add / Edit) ─────────────────────────────────────── */}
        {showBookModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBookModal(false); }}>
            <div className="modal-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text }}>{editingBook ? "Edit Book" : "Add Book"}</div>
                <button onClick={() => setShowBookModal(false)} style={{ background: "none", border: "none", color: G.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>

              {/* Chat prompt */}
              <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>✦ Describe the book — AI will fill in the details</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input-dark" style={{ flex: 1, fontSize: 12 }} placeholder='e.g. "Dune by Frank Herbert, 1965 sci-fi epic"'
                    value={bookChatInput} onChange={e => setBookChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && chatFillBook()} />
                  <button className="btn-gold" style={{ padding: "8px 14px", fontSize: 12, flexShrink: 0 }} onClick={chatFillBook} disabled={bookChatLoading || !bookChatInput.trim()}>
                    {bookChatLoading ? "…" : "Fill"}
                  </button>
                </div>
                {bookChatPending && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: `${G.gold}12`, border: `1px solid ${G.goldDim}`, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: G.text, fontWeight: 600, marginBottom: 4 }}>"{bookChatPending.title}" by {bookChatPending.authors?.map(a=>a.name).join(" & ")}</div>
                    <div style={{ fontSize: 11, color: G.muted, marginBottom: 8 }}>{bookChatPending.genres?.join(", ")} · {bookChatPending.fiction ? "Fiction" : "Non-Fiction"} · {bookChatPending.format} · {bookChatPending.year}{bookChatPending.pages ? ` · ${bookChatPending.pages}pp` : ""}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-gold" style={{ fontSize: 11, padding: "5px 12px" }} onClick={applyPending}>Apply to form</button>
                      <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setBookChatPending(null)}>Dismiss</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Title *</div>
                  <input className="input-dark" value={bookDraft.title} onChange={e => setBookDraft(p => ({ ...p, title: e.target.value }))} placeholder="Book title" />
                </div>

                {/* Authors */}
                <div>
                  <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Authors *</div>
                  {bookDraft.authors.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <input className="input-dark" style={{ flex: 2, fontSize: 12 }} placeholder="Author name" value={a.name} onChange={e => setBookDraft(p => { const au=[...p.authors]; au[i]={...au[i],name:e.target.value}; return {...p,authors:au}; })} />

                      {bookDraft.authors.length > 1 && <button onClick={() => setBookDraft(p => ({ ...p, authors: p.authors.filter((_,j)=>j!==i) }))} style={{ background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:16,padding:"0 4px" }}>×</button>}
                    </div>
                  ))}
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setBookDraft(p => ({ ...p, authors: [...p.authors, { name: "" }] }))}>+ Add author</button>
                </div>

                {/* Genres */}
                <div>
                  <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Genres</div>
                  <MultiSelect options={genreList} selected={bookDraft.genres} onChange={v => setBookDraft(p => ({ ...p, genres: v }))} placeholder="Select genres…" style={{ width: "100%" }} />
                  {!newGenreOpen
                    ? <button onClick={() => setNewGenreOpen(true)} style={{ background: "none", border: "none", color: G.muted, fontSize: 11, cursor: "pointer", padding: "6px 0 0", textDecoration: "underline" }}>+ Add new genre</button>
                    : <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <input autoFocus className="input-dark" style={{ flex: 1, fontSize: 12 }} placeholder="New genre name…" value={newGenreInput} onChange={e => setNewGenreInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addGenre(); if (e.key === "Escape") { setNewGenreOpen(false); setNewGenreInput(""); }}} />
                        <button className="btn-gold" style={{ padding: "6px 12px", fontSize: 12 }} onClick={addGenre} disabled={newGenreSaving}>{newGenreSaving ? "…" : "Add"}</button>
                        <button onClick={() => { setNewGenreOpen(false); setNewGenreInput(""); }} style={{ background: "none", border: "none", color: G.muted, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
                      </div>
                  }
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Read Year Start</div>
                    <input className="input-dark" type="number" min="1900" max="2030" value={bookDraft.yearStart} onChange={e => setBookDraft(p => ({ ...p, yearStart: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Read Year End</div>
                    <input className="input-dark" type="number" min="1900" max="2030" value={bookDraft.yearEnd} onChange={e => setBookDraft(p => ({ ...p, yearEnd: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Pages</div>
                    <input className="input-dark" type="number" min="1" placeholder="e.g. 350" value={bookDraft.pages} onChange={e => setBookDraft(p => ({ ...p, pages: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Format</div>
                    <select className="input-dark" value={bookDraft.format} onChange={e => setBookDraft(p => ({ ...p, format: e.target.value }))}>
                      {["Novel", "Novella", "Short Stories", "Graphic Novel", "Non-Fiction", "Play"].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Type</div>
                    <select className="input-dark" value={bookDraft.fiction ? "fiction" : "nonfiction"} onChange={e => setBookDraft(p => ({ ...p, fiction: e.target.value === "fiction" }))}>
                      <option value="fiction">Fiction</option>
                      <option value="nonfiction">Non-Fiction</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Series</div>
                  <input className="input-dark" placeholder="Series name (optional)" value={bookDraft.series} onChange={e => setBookDraft(p => ({ ...p, series: e.target.value }))} />
                </div>

                {bookMsg && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: bookMsg.startsWith("✓") ? `${G.green}18` : `${G.red}18`, color: bookMsg.startsWith("✓") ? G.green : G.red, fontSize: 12 }}>{bookMsg}</div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="btn-gold" style={{ flex: 1 }} onClick={saveBook} disabled={bookSaving}>
                    {bookSaving ? "Saving…" : editingBook ? "Save Changes" : "Add to Library"}
                  </button>
                  {editingBook && (
                    <button onClick={() => { if (window.confirm(`Delete "${editingBook.title}"? This cannot be undone.`)) deleteBook(); }}
                      disabled={bookSaving}
                      style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${G.red}40`, background: "none", color: G.red, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RECOMMENDATIONS ────────────────────────────────────────────── */}
        {activeTab === "recs" && (() => {
          const lastBook = books[books.length - 1];
          const allGenreOptions = genreList;

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
            { id: "pair", icon: "⊞", title: "Pair It", sub: "Web-searched companion reads", auto: false, placeholder: "A film, show, event, or experience…", inputLabel: "Pair a book with…" },
          ];

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
                        {(results || loading) && (
                          <button onClick={() => { setIntentResults(p => { const n={...p}; delete n[lens.id]; return n; }); fetchIntentRecs(lens.id, input); }}
                            style={{ background: "none", border: "none", color: G.muted, fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }} title="Refresh">↺</button>
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
                                onChange={e => { const v = e.target.value; setIntentInputs(p => ({ ...p, [lens.id]: v })); if (v) fetchIntentRecs(lens.id, v); }}>
                                <option value="">— pick a genre —</option>
                                {lens.dropdownOptions.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input className="input-dark" style={{ fontSize: 12, paddingRight: 32, flex: 1 }} placeholder={lens.placeholder}
                                value={input}
                                onChange={e => setIntentInputs(p => ({ ...p, [lens.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter" && input.trim()) fetchIntentRecs(lens.id, input); }} />
                            )}
                            {!lens.isDropdown && (
                              <button
                                onClick={() => canFetch && !loading && fetchIntentRecs(lens.id, input)}
                                disabled={loading || !canFetch}
                                title="Get pick"
                                style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: canFetch && !loading ? "pointer" : "not-allowed", color: canFetch && !loading ? G.gold : G.dimmed, fontSize: 14, lineHeight: 1, padding: 0 }}>
                                {loading ? "…" : "→"}
                              </button>
                            )}
                          </div>
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
        {activeTab === "chat" && !session && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: G.muted }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: G.text, marginBottom: 8 }}>Sign in to use AI Chat</div>
            <div style={{ fontSize: 13 }}>This feature is only available to the library owner.</div>
          </div>
        )}
        {activeTab === "chat" && session && (
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

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowLoginModal(false); setLoginError(""); } }}>
          <div className="modal-box" style={{ maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text }}>Sign In</div>
              <button onClick={() => { setShowLoginModal(false); setLoginError(""); }} style={{ background: "none", border: "none", color: G.muted, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input className="input-dark" type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} autoFocus />
              <input className="input-dark" type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
              {loginError && <div style={{ color: G.red, fontSize: 12 }}>{loginError}</div>}
              <button className="btn-gold" onClick={login} disabled={loginLoading}>{loginLoading ? "Signing in…" : "Sign In"}</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ padding: "16px 28px", marginTop: 24, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: G.dimmed }}>© {new Date().getFullYear()} Viswas Nair · All rights reserved</div>
      </div>
    </div>
  );
}