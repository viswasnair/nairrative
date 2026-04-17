import { useState, useMemo } from "react";
import G from "../constants/theme";

const VIEWS = [
  { id: "grid",   label: "Grid" },
  { id: "spine",  label: "Shelf" },
  { id: "mosaic", label: "Timeline" },
];

function primaryColor(b, genreMap) {
  return (b.genre?.[0] && genreMap[b.genre[0]]) || G.muted;
}

// ── Grid view ─────────────────────────────────────────────────────────────────
function GridView({ filtered, genreMap, session, openEditModal }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 16 }}>
      {filtered.map(b => {
        const color = primaryColor(b, genreMap);
        return (
          <div key={b.id}
            onClick={() => session && openEditModal(b)}
            title={`${b.title} — ${b.author}`}
            style={{ cursor: session ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Cover */}
            <div style={{
              width: "100%", paddingBottom: "145%", position: "relative",
              borderRadius: 4, overflow: "hidden",
              border: `1px solid ${G.border}`,
              background: `${color}22`,
              transition: "box-shadow 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              {b.cover_url
                ? <img src={b.cover_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.target.style.display = "none"; }} />
                : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 32, fontFamily: "'Playfair Display', serif", color, opacity: 0.4 }}>{b.title[0]}</span>
                  </div>
              }
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: G.text, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{b.title}</div>
            <div style={{ fontSize: 10, color: G.muted, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{b.author}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Spine / Shelf view ────────────────────────────────────────────────────────
function SpineView({ filtered, genreMap, session, openEditModal }) {
  const [hoveredId, setHoveredId] = useState(null);
  const hovered = hoveredId ? filtered.find(b => b.id === hoveredId) : null;

  return (
    <div>
      {/* Scrollable shelf */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, minWidth: "max-content", padding: "8px 4px 0" }}>
          {filtered.map(b => {
            const isHovered = hoveredId === b.id;
            const color = primaryColor(b, genreMap);
            const showCover = isHovered && b.cover_url;
            return (
              <div key={b.id}
                onMouseEnter={() => setHoveredId(b.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => session && openEditModal(b)}
                title={`${b.title} — ${b.author}`}
                style={{
                  width: isHovered ? (b.cover_url ? 90 : 40) : 22,
                  height: 150,
                  borderRadius: isHovered ? 4 : 3,
                  background: showCover ? `url(${b.cover_url}) center/cover` : color,
                  cursor: session ? "pointer" : "default",
                  transition: "width 0.15s ease, box-shadow 0.15s ease",
                  overflow: "hidden",
                  flexShrink: 0,
                  boxShadow: isHovered ? "2px 4px 12px rgba(0,0,0,0.25)" : "1px 1px 3px rgba(0,0,0,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                {!showCover && (
                  <span style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    fontSize: 9,
                    color: "rgba(255,255,255,0.9)",
                    fontWeight: 500,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    maxHeight: "88%",
                    padding: "0 2px",
                  }}>
                    {b.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Shelf plank */}
        <div style={{ height: 10, background: `linear-gradient(180deg, ${G.card2} 0%, ${G.border} 100%)`, borderTop: `2px solid ${G.dimmed}`, borderRadius: "0 0 4px 4px" }} />
      </div>

      {/* Info strip below shelf */}
      <div style={{ marginTop: 12, minHeight: 38, padding: "10px 14px", background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, fontSize: 12, display: "flex", gap: 10, alignItems: "center", transition: "opacity 0.15s", opacity: hovered ? 1 : 0 }}>
        {hovered && <>
          <span style={{ fontWeight: 600, color: G.text }}>{hovered.title}</span>
          <span style={{ color: G.muted }}>by {hovered.author}</span>
          {hovered.year_read_end && <span style={{ color: G.dimmed }}>· {hovered.year_read_end}</span>}
          {hovered.genre?.[0] && <span style={{ color: primaryColor(hovered, genreMap) }}>· {hovered.genre[0]}</span>}
          {hovered.pages && <span style={{ color: G.dimmed }}>· {hovered.pages}pp</span>}
        </>}
      </div>
    </div>
  );
}

// ── Timeline mosaic view ──────────────────────────────────────────────────────
function MosaicView({ filtered, genreMap, session, openEditModal }) {
  const [hoveredId, setHoveredId] = useState(null);

  const byYear = useMemo(() => {
    const map = {};
    for (const b of filtered) {
      const y = b.year_read_end || b.year || "?";
      if (!map[y]) map[y] = [];
      map[y].push(b);
    }
    return Object.entries(map).sort((a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0));
  }, [filtered]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {byYear.map(([year, bks]) => (
        <div key={year}>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
            {year}
            <span style={{ fontWeight: 400, color: G.dimmed, letterSpacing: 0 }}>· {bks.length} book{bks.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {bks.map(b => {
              const isHovered = hoveredId === b.id;
              const color = primaryColor(b, genreMap);
              const w = Math.min(Math.max(b.pages ? Math.round(b.pages / 8) : 55, 40), 100);
              return (
                <div key={b.id}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => session && openEditModal(b)}
                  title={`${b.title} — ${b.author}${b.pages ? ` (${b.pages}pp)` : ""}`}
                  style={{
                    width: w,
                    height: 80,
                    borderRadius: 3,
                    overflow: "hidden",
                    cursor: session ? "pointer" : "default",
                    border: `1px solid ${isHovered ? color : G.border}`,
                    background: `${color}28`,
                    transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
                    transform: isHovered ? "translateY(-3px)" : "none",
                    boxShadow: isHovered ? "0 4px 10px rgba(0,0,0,0.12)" : "none",
                    flexShrink: 0,
                    position: "relative",
                  }}>
                  {b.cover_url
                    ? <img src={b.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={e => { e.target.style.display = "none"; }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 6px" }}>
                        <span style={{ fontSize: 10, color, fontWeight: 600, textAlign: "center", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{b.title}</span>
                      </div>
                  }
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── BookshelfTab ──────────────────────────────────────────────────────────────
export default function BookshelfTab({ books, genreMap, openEditModal, session }) {
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return books
      .filter(b => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .sort((a, b) => (a.year_read_end || 0) - (b.year_read_end || 0) || a.title.localeCompare(b.title));
  }, [books, search]);

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <input className="input-dark" style={{ width: 200, flex: "0 0 auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {VIEWS.map(v => (
            <button key={v.id}
              className={`tab-btn ${view === v.id ? "active" : ""}`}
              style={{ fontSize: 12, padding: "6px 14px" }}
              onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <span style={{ color: G.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filtered.length} books</span>
      </div>

      {view === "grid"   && <GridView   filtered={filtered} genreMap={genreMap} session={session} openEditModal={openEditModal} />}
      {view === "spine"  && <SpineView  filtered={filtered} genreMap={genreMap} session={session} openEditModal={openEditModal} />}
      {view === "mosaic" && <MosaicView filtered={filtered} genreMap={genreMap} session={session} openEditModal={openEditModal} />}
    </div>
  );
}
