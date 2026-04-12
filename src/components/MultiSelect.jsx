import { useState, useRef, useEffect } from "react";
import G from "../constants/theme";

export default function MultiSelect({ options, selected, onChange, placeholder, style }) {
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
