import { useState, useMemo, useEffect } from "react";
import G from "../constants/theme";

const HALL_VISIBLE = 5;
const HALL_INTERVAL = 3000;

function CoverRow({ label, books, genreMap, openEditModal, session }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (books.length <= HALL_VISIBLE) return;
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setOffset(o => (o + 1) % books.length);
        setFade(true);
      }, 300);
    }, HALL_INTERVAL);
    return () => clearInterval(id);
  }, [books.length]);

  if (!books.length) return null;

  const visible = Array.from({ length: Math.min(HALL_VISIBLE, books.length) }, (_, i) => books[(offset + i) % books.length]);

  return (
    <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: G.dimmed, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, paddingBottom: 4, transition: "opacity 0.3s", opacity: fade ? 1 : 0 }}>
        {visible.map(b => {
          const color = (b.genre?.[0] && genreMap[b.genre[0]]) || G.muted;
          const isHovered = hoveredId === b.id;
          return (
            <div key={b.id}
              onMouseEnter={() => setHoveredId(b.id)} onMouseLeave={() => setHoveredId(null)}
              onClick={() => session && openEditModal(b)}
              style={{ position: "relative", width: 56, height: 80, flexShrink: 0, borderRadius: 4, overflow: "hidden",
                border: `1px solid ${G.border}`, background: `${color}22`, cursor: session ? "pointer" : "default",
                transition: "transform 0.15s", transform: isHovered ? "translateY(-3px)" : "none" }}>
              {b.cover_url
                ? <img src={b.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", color, opacity: 0.4 }}>{b.title[0]}</span>
                  </div>
              }
              {isHovered && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "5px 4px" }}>
                  <div style={{ fontSize: 9, color: "#fff", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontWeight: 600 }}>{b.title}</div>
                  {b.description && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.75)", lineHeight: 1.3, marginTop: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{b.description}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function primaryColor(b, genreMap) {
  return (b.genre?.[0] && genreMap[b.genre[0]]) || G.muted;
}

// ── Timeline mosaic view ──────────────────────────────────────────────────────
function MosaicView({ filtered, genreMap, session, openEditModal }) {
  const [hoveredId, setHoveredId] = useState(null);
  const hovered = hoveredId ? filtered.find(b => b.id === hoveredId) : null;

  const byYear = useMemo(() => {
    const map = {};
    for (const b of filtered) {
      const y = b.year_read_end || b.year || "?";
      if (!map[y]) map[y] = [];
      map[y].push(b);
    }
    return Object.entries(map).sort((a, b) => (parseInt(b[0]) || 0) - (parseInt(a[0]) || 0));
  }, [filtered]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {byYear.map(([year, bks]) => (
        <div key={year}>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
            {year === "2010" ? "pre-2011" : year}
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
      {/* Hover info strip */}
      <div style={{ minHeight: 32, marginTop: 12, padding: "8px 12px", background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, fontSize: 12, display: "flex", gap: 10, alignItems: "center", transition: "opacity 0.15s", opacity: hovered ? 1 : 0 }}>
        {hovered && <>
          <span style={{ fontWeight: 600, color: G.text, flexShrink: 0 }}>{hovered.title}</span>
          <span style={{ color: G.muted, flexShrink: 0 }}>by {hovered.author}</span>
          {hovered.description
            ? <span style={{ color: G.muted, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>— {hovered.description}</span>
            : <span style={{ color: G.dimmed }}>· {hovered.year_read_end || ""}</span>
          }
        </>}
      </div>
    </div>
  );
}

// ── BookshelfTab ──────────────────────────────────────────────────────────────
export default function BookshelfTab({ books, genreMap, openEditModal, session }) {
  const hallBooks = useMemo(() => books.filter(b => b.rating === "transformative" || b.rating === "loved"), [books]);

  const sorted = useMemo(() =>
    [...books].sort((a, b) => (a.year_read_end || 0) - (b.year_read_end || 0) || a.title.localeCompare(b.title)),
  [books]);

  return (
    <div>
      <CoverRow label="Hall of Fame" books={hallBooks} genreMap={genreMap} openEditModal={openEditModal} session={session} />
      <MosaicView filtered={sorted} genreMap={genreMap} session={session} openEditModal={openEditModal} />
    </div>
  );
}
