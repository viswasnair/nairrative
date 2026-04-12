import G from "../constants/theme";

export default function RangeFilter({ chartId, allYears, ranges, onSet }) {
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
