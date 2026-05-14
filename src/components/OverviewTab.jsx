import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid, Legend, PieChart, Pie, LineChart, Line } from "recharts";
import G from "../constants/theme";
import RangeFilter from "./RangeFilter";
import DarkTooltip from "./DarkTooltip";

const FORMAT_COLORS = { "Novel": "#2d6a4f", "Graphic Novel": "#06d6a0", "Non-Fiction": "#4a9eff", "Novella": "#c9a84c", "Short Stories": "#e06c75", "Play": "#c3a6ff", "Unknown": "#b2bec3" };
const ARCHETYPE_COLORS = { "Hero's Journey": "#d97706", "Overcoming the Monster": "#e06c75", "Quest": "#4a9eff", "Voyage and Return": "#06b6d4", "Rebirth": "#2d6a4f", "Rags to Riches": "#f59e0b", "Tragedy": "#a855f7", "Comedy": "#ec4899", "Ensemble Drama": "#b87333" };
const MOOD_PALETTE = ["#e06c75", "#4a9eff", "#d97706", "#06b6d4", "#a855f7", "#2d6a4f"];

const TIME_CHART_IDS = new Set(["yc", "fn", "ge", "al", "mt"]);

export default function OverviewTab({ books, booksLoading, stats, genreMap, allYearsList, allYearsListFull, chartRanges, getChartRange, setChartRange, onChartClick }) {
  if (booksLoading) return (
    <div>
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 24 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="stat-card" style={{ padding: "12px 14px" }}>
            <div className="pulse" style={{ height: 9, width: "70%", background: G.border, borderRadius: 4, marginBottom: 8 }} />
            <div className="pulse" style={{ height: 18, width: "50%", background: G.border, borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div className="chart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "18px 20px", height: 300 }}>
            <div className="pulse" style={{ height: 13, width: "40%", background: G.border, borderRadius: 4, marginBottom: 20 }} />
            <div className="pulse" style={{ height: 200, width: "100%", background: G.border, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    </div>
  );
  const {
    ycData, ycMax, gcData, fnData,
    geData, geTop5, acData, coData, alData,
    fmData, moData, arData, thData, mtData, mtTopMoods,
    dominantMood, topTheme, topArchetype,
  } = useMemo(() => {
    const cb = id => { const r = getChartRange(id); return books.filter(b => b.year >= r.from && b.year <= r.to); };

    const ycBooks = cb("yc");
    const ycCounts = ycBooks.reduce((acc, book) => { acc[book.year] = (acc[book.year] || 0) + 1; return acc; }, {});
    const ycRange = getChartRange("yc");
    const ycData = [];
    for (let y = ycRange.from; y <= ycRange.to; y++) ycData.push({ year: y, count: ycCounts[y] || 0 });
    const ycMax = Math.max(...ycData.map(d => d.count), 1);

    const gcBooks = cb("gc");
    const gcCounts = gcBooks.reduce((acc, book) => { (book.genre || []).forEach(g => { acc[g] = (acc[g] || 0) + 1; }); return acc; }, {});
    const gcData = Object.entries(gcCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([genre, count]) => ({ genre, count }));

    const fnBooks = cb("fn");
    const fnRange = getChartRange("fn");
    const fnData = [];
    for (let y = fnRange.from; y <= fnRange.to; y++) {
      const yearBooks = fnBooks.filter(book => book.year === y);
      fnData.push({ year: y, Fiction: yearBooks.filter(b => b.fiction).length, "Non-Fiction": yearBooks.filter(b => b.fiction === false).length });
    }

    const geBooks = cb("ge");
    const geRange = getChartRange("ge");
    const geYrs = [];
    for (let y = geRange.from; y <= geRange.to; y++) geYrs.push(y);
    const geCount = geBooks.reduce((acc, book) => { (book.genre || []).forEach(g => { acc[g] = (acc[g] || 0) + 1; }); return acc; }, {});
    const geTop5 = Object.entries(geCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);
    const geData = geYrs.map(year => {
      const entry = { year };
      geTop5.forEach(g => { entry[g] = geBooks.filter(book => book.year === year && (book.genre || []).includes(g)).length; });
      return entry;
    });

    const acBooks = cb("ac");
    const acCounts = acBooks.reduce((acc, book) => { acc[book.author] = (acc[book.author] || 0) + 1; return acc; }, {});
    const acData = Object.entries(acCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([author, count]) => ({ author, count }));

    const coBooks = cb("co");
    const coCounts = coBooks.filter(book => book.country).reduce((acc, book) => { acc[book.country] = (acc[book.country] || 0) + 1; return acc; }, {});
    const coData = Object.entries(coCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, count]) => ({ country, count }));

    const alBooks = cb("al");
    const alRange = getChartRange("al");
    const alData = [];
    // 2010 is a collective placeholder for 1998–2010 and would skew avg length; start from 2011
    for (let y = Math.max(alRange.from, 2011); y <= alRange.to; y++) {
      const yearBooks = alBooks.filter(book => book.year === y && book.pages);
      alData.push({ year: y, avg: yearBooks.length ? Math.round(yearBooks.reduce((sum, book) => sum + book.pages, 0) / yearBooks.length) : null });
    }

    const fmBooks = cb("fm");
    const fmCounts = fmBooks.reduce((acc, book) => { const f = book.format || "Unknown"; acc[f] = (acc[f] || 0) + 1; return acc; }, {});
    const fmData = Object.entries(fmCounts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value, color: FORMAT_COLORS[name] || G.muted }));

    const moBooks = cb("mo");
    const moCounts = moBooks.filter(book => book.mood).reduce((acc, book) => { acc[book.mood] = (acc[book.mood] || 0) + 1; return acc; }, {});
    const moData = Object.entries(moCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([mood, count]) => ({ mood, count }));

    const arBooks = cb("ar");
    const arCounts = arBooks.filter(book => book.archetype).reduce((acc, book) => { acc[book.archetype] = (acc[book.archetype] || 0) + 1; return acc; }, {});
    const arData = Object.entries(arCounts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value, color: ARCHETYPE_COLORS[name] || G.muted }));

    const thBooks = cb("th");
    const thCounts = thBooks.reduce((acc, book) => { (book.theme || []).forEach(t => { acc[t] = (acc[t] || 0) + 1; }); return acc; }, {});
    const thData = Object.entries(thCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([theme, count]) => ({ theme, count }));

    const mtBooks = cb("mt");
    const mtRange = getChartRange("mt");
    const mtYrs = [];
    for (let y = Math.max(mtRange.from, 2011); y <= mtRange.to; y++) mtYrs.push(y);
    const mtMoodCount = mtBooks.filter(book => book.mood).reduce((acc, book) => { acc[book.mood] = (acc[book.mood] || 0) + 1; return acc; }, {});
    const mtTopMoods = Object.entries(mtMoodCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([mood]) => mood);
    const mtData = mtYrs.map(year => {
      const entry = { year };
      mtTopMoods.forEach(mood => { entry[mood] = mtBooks.filter(book => book.year === year && book.mood === mood).length; });
      return entry;
    });

    const dominantMoodCounts = {};
    books.forEach(book => { if (book.mood) dominantMoodCounts[book.mood] = (dominantMoodCounts[book.mood] || 0) + 1; });
    const dominantMood = Object.entries(dominantMoodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const topThemeCounts = {};
    books.forEach(book => (book.theme || []).forEach(t => { topThemeCounts[t] = (topThemeCounts[t] || 0) + 1; }));
    const topTheme = Object.entries(topThemeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const topArchetypeCounts = {};
    books.forEach(book => { if (book.archetype) topArchetypeCounts[book.archetype] = (topArchetypeCounts[book.archetype] || 0) + 1; });
    const topArchetype = Object.entries(topArchetypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return {
      ycData, ycMax, gcData, fnData,
      geData, geTop5, acData, coData, alData,
      fmData, moData, arData, thData, mtData, mtTopMoods,
      dominantMood, topTheme, topArchetype,
    };
  }, [books, getChartRange]);

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

  const chartCard = (title, id, children) => (
    <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "18px 20px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: G.text }}>{title}</div>
        <RangeFilter chartId={id} allYears={TIME_CHART_IDS.has(id) ? allYearsList : allYearsListFull} ranges={chartRanges} onSet={setChartRange} />
      </div>
      {children}
    </div>
  );

  return (
    <div>

      {/* Stat Cards — 6-column grid, 2 rows */}
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Books Read", value: stats.total, color: "#d97706" },
          { label: "Authors Read", value: new Set(books.map(b => b.author)).size, color: "#db2777" },
          { label: "Books / Year", value: stats.readingSpan ? Math.round(stats.total / stats.readingSpan) : "—", color: "#0e9488" },
          { label: "Pages / Book", value: (() => { const withPages = books.filter(b => b.pages); return withPages.length ? Math.round(withPages.reduce((s,b) => s + b.pages, 0) / withPages.length).toLocaleString() : "—"; })(), color: "#f59e0b" },
          { label: "Pages / Day", value: (() => { const totalPages = books.filter(b => b.pages).reduce((s,b) => s + b.pages, 0); return stats.readingSpan && totalPages ? (totalPages / (stats.readingSpan * 365)).toFixed(1) : "—"; })(), color: "#06b6d4" },
          { label: "Years Reading", value: stats.readingSpan, color: G.blue },
          { label: "Peak Year", value: `${stats.sortedYears[0]?.[0]} (${stats.sortedYears[0]?.[1]})`, color: "#0284c7" },
          { label: "#1 Author", value: stats.sortedAuthors[0]?.[0], color: G.purple },
          { label: "Top Genre", value: stats.sortedGenres[0]?.[0], color: "#ff9f7f" },
          { label: "Dominant Mood", value: dominantMood, color: "#a855f7" },
          { label: "Top Theme", value: topTheme, color: "#b87333" },
          { label: "Top Archetype", value: topArchetype, color: "#06d6a0" },
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
          <ResponsiveContainer width="100%" height={245}>
            <BarChart data={ycData} barSize={18}>
              <CartesianGrid stroke={G.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} onClick={onChartClick ? (d) => onChartClick({ years: [d.year] }) : undefined} style={onChartClick ? { cursor: "pointer" } : undefined}>
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
                <Bar dataKey="count" radius={[0, 4, 4, 0]} onClick={onChartClick ? (d) => onChartClick({ genres: [d.genre] }) : undefined} style={onChartClick ? { cursor: "pointer" } : undefined}>
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
                <Bar dataKey="count" radius={[0, 4, 4, 0]} onClick={onChartClick ? (d) => onChartClick({ authors: [d.author] }) : undefined} style={onChartClick ? { cursor: "pointer" } : undefined}>
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
                <Bar dataKey="count" radius={[0, 4, 4, 0]} onClick={onChartClick ? (d) => onChartClick({ countries: [d.country] }) : undefined} style={onChartClick ? { cursor: "pointer" } : undefined}>
                  {coData.map((_, i) => <Cell key={i} fill={`rgba(20, 184, 166, ${Math.max(0.25, 1 - i * 0.08)})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fiction vs Non-Fiction */}
        {chartCard("Fiction vs Non-Fiction Over Time", "fn",
          <div style={{ display: "flex", flexDirection: "column" }}>
            <ResponsiveContainer width="100%" height={210} style={onChartClick ? { cursor: "pointer" } : undefined}>
              <AreaChart data={fnData} onClick={onChartClick ? (d) => { if (d?.activePayload?.[0]) onChartClick({ years: [d.activePayload[0].payload.year] }); } : undefined}>
                <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="Fiction" stackId="1" stroke={G.gold} fill={G.gold} fillOpacity={0.35} />
                <Area type="monotone" dataKey="Non-Fiction" stackId="1" stroke={G.blue} fill={G.blue} fillOpacity={0.35} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "8px 0" }}>
              {[["Fiction", G.gold], ["Non-Fiction", G.blue]].map(([label, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: G.muted }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Genre Evolution */}
        {chartCard("Genre Evolution", "ge",
          <div style={{ display: "flex", flexDirection: "column" }}>
            <ResponsiveContainer width="100%" height={210} style={onChartClick ? { cursor: "pointer" } : undefined}>
              <AreaChart data={geData} onClick={onChartClick ? (d) => { if (d?.activePayload?.[0]) onChartClick({ years: [d.activePayload[0].payload.year] }); } : undefined}>
                <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                {geTop5.map(g => <Area key={g} type="monotone" dataKey={g} stackId="1" stroke={genreMap[g]} fill={genreMap[g]} fillOpacity={0.5} />)}
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: "4px 16px" }}>
                {geTop5.map(g => (
                  <div key={g} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: genreMap[g], flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: G.muted, whiteSpace: "nowrap" }}>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Avg Book Length Over Time */}
        {chartCard("Avg Book Length Over Time", "al",
          <ResponsiveContainer width="100%" height={245} style={onChartClick ? { cursor: "pointer" } : undefined}>
            <LineChart data={alData} onClick={onChartClick ? (d) => { if (d?.activePayload?.[0]) onChartClick({ years: [d.activePayload[0].payload.year] }); } : undefined}>
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
                <Pie data={fmData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} onClick={onChartClick ? (d) => onChartClick({ formats: [d.name] }) : undefined} style={onChartClick ? { cursor: "pointer" } : undefined}>
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

        {/* Mood Breakdown */}
        {chartCard("Mood Breakdown", "mo",
          <div style={{ overflow: "visible" }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={moData} layout="vertical" barSize={13} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="mood" axisLine={false} tickLine={false} width={110} interval={0} tick={truncTick(17)} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} onClick={onChartClick ? (d) => onChartClick({ moods: [d.mood] }) : undefined} style={onChartClick ? { cursor: "pointer" } : undefined}>
                  {moData.map((_, i) => <Cell key={i} fill={`rgba(168, 85, 247, ${Math.max(0.25, 1 - i * 0.07)})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Archetype Distribution */}
        {chartCard("Archetype Distribution", "ar",
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={arData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} onClick={onChartClick ? (d) => onChartClick({ archetypes: [d.name] }) : undefined} style={onChartClick ? { cursor: "pointer" } : undefined}>
                  {arData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 8 }}>
              {arData.map(e => (
                <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: G.muted }}>{e.name}</span>
                  <span style={{ fontSize: 10, color: G.dimmed }}>{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Themes */}
        {chartCard("Top Themes", "th",
          <div style={{ overflow: "visible" }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={thData} layout="vertical" barSize={13} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={G.border} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="theme" axisLine={false} tickLine={false} width={110} interval={0} tick={truncTick(17)} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} onClick={onChartClick ? (d) => onChartClick({ themes: [d.theme] }) : undefined} style={onChartClick ? { cursor: "pointer" } : undefined}>
                  {thData.map((_, i) => <Cell key={i} fill={`rgba(184, 115, 51, ${Math.max(0.25, 1 - i * 0.07)})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Mood Over Time */}
        {chartCard("Mood Over Time", "mt",
          <div style={{ display: "flex", flexDirection: "column" }}>
            <ResponsiveContainer width="100%" height={210} style={onChartClick ? { cursor: "pointer" } : undefined}>
              <AreaChart data={mtData} onClick={onChartClick ? (d) => { if (d?.activePayload?.[0]) onChartClick({ years: [d.activePayload[0].payload.year] }); } : undefined}>
                <CartesianGrid stroke={G.border} strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: G.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                {mtTopMoods.map((m, i) => <Area key={m} type="monotone" dataKey={m} stackId="1" stroke={MOOD_PALETTE[i]} fill={MOOD_PALETTE[i]} fillOpacity={0.5} />)}
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", justifyContent: "center" }}>
                {mtTopMoods.map((m, i) => (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: MOOD_PALETTE[i], flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: G.muted, whiteSpace: "nowrap" }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
