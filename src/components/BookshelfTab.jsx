import { useState, useMemo, useEffect, useRef } from "react";
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
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", padding: "5px 4px" }}>
                  <div style={{ fontSize: 9, color: "#fff", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>{b.title}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

const u = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

// Foil/accent colour per genre — used for the embossed ornament
const ACCENT = {
  "Fantasy":           "#d4af37", "Romantasy":        "#f9a8d4",
  "Science Fiction":   "#7dd3fc", "Dystopian":        "#93c5fd",
  "Thriller":          "#f87171", "Legal Thriller":   "#f87171", "Medical Thriller":"#f87171",
  "Mystery":           "#fcd34d", "Horror":           "#f87171",
  "Romance":           "#fda4af", "Literary Fiction": "#e8d5a3",
  "Historical Fiction":"#d4af37", "Classic":          "#e8d5a3",
  "Biography":         "#d4af37", "Memoir":           "#e8d5a3",
  "Philosophy":        "#c4b5fd", "Spirituality":     "#ddd6fe",
  "Non-Fiction":       "#e8d5a3", "History":          "#d4af37",
  "Self-Help":         "#bbf7d0", "Psychology":       "#99f6e4",
  "Graphic Novel":     "#f472b6", "Poetry":           "#c4b5fd",
  "Mythology":         "#fcd34d", "Economics":        "#fdba74",
  "Environment":       "#86efac", "Politics":         "#fca5a5",
  "Business":          "#fde68a", "Sociology":        "#99f6e4",
  "Popular Science":   "#7dd3fc", "Essays":           "#e8d5a3",
};

// Centred embossed ornament SVGs — one per genre, 24×34 viewbox, single foil colour
const ORNAMENT = {
  "Fantasy":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><path d="M14 2C9 2 5 6 5 12C5 18 9 22 14 22C11 20 9 16 9 12C9 8 11 4 14 2Z" fill="${a}" opacity="0.82"/><circle cx="5" cy="28" r="1.4" fill="${a}" opacity="0.72"/><circle cx="12" cy="31" r="0.9" fill="${a}" opacity="0.62"/><circle cx="19" cy="28" r="1.4" fill="${a}" opacity="0.72"/></svg>`,
  "Romance":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><path d="M12 26C6 19 1 15 1 9C1 5 4 2 7.5 2C9.2 2 10.7 2.9 12 4.2C13.3 2.9 14.8 2 16.5 2C20 2 23 5 23 9C23 15 18 19 12 26Z" fill="${a}" opacity="0.8"/></svg>`,
  "Horror":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><path d="M14 2C9 2 5 5 5 10C5 15 9 19 14 19C11 17 9 14 9 10C9 6 11 4 14 2Z" fill="${a}" opacity="0.72"/><line x1="12" y1="21" x2="12" y2="32" stroke="${a}" stroke-width="1.5" opacity="0.52"/><line x1="12" y1="24" x2="6" y2="29" stroke="${a}" stroke-width="1.5" stroke-linecap="round" opacity="0.48"/><line x1="12" y1="24" x2="18" y2="29" stroke="${a}" stroke-width="1.5" stroke-linecap="round" opacity="0.48"/></svg>`,
  "Mystery":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><circle cx="9" cy="12" r="8" fill="none" stroke="${a}" stroke-width="2.2" opacity="0.78"/><circle cx="9" cy="12" r="3" fill="${a}" opacity="0.48"/><line x1="15.5" y1="18.5" x2="22" y2="27" stroke="${a}" stroke-width="3.8" stroke-linecap="round" opacity="0.72"/></svg>`,
  "Science Fiction":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><circle cx="12" cy="14" r="6.5" fill="${a}" opacity="0.18"/><circle cx="12" cy="14" r="6.5" fill="none" stroke="${a}" stroke-width="1.8" opacity="0.75"/><ellipse cx="12" cy="14" rx="12" ry="4" fill="none" stroke="${a}" stroke-width="1.3" opacity="0.65"/><circle cx="4" cy="4" r="1.2" fill="${a}" opacity="0.75"/><circle cx="20" cy="3" r="1" fill="${a}" opacity="0.68"/><circle cx="21" cy="28" r="0.9" fill="${a}" opacity="0.52"/></svg>`,
  "Thriller":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><circle cx="12" cy="15" r="10" fill="none" stroke="${a}" stroke-width="1.2" opacity="0.52"/><circle cx="12" cy="15" r="6" fill="none" stroke="${a}" stroke-width="1.2" opacity="0.58"/><circle cx="12" cy="15" r="2.2" fill="${a}" opacity="0.75"/><line x1="12" y1="2" x2="12" y2="7" stroke="${a}" stroke-width="2" stroke-linecap="round" opacity="0.68"/><line x1="12" y1="23" x2="12" y2="28" stroke="${a}" stroke-width="2" stroke-linecap="round" opacity="0.68"/><line x1="2" y1="15" x2="7" y2="15" stroke="${a}" stroke-width="2" stroke-linecap="round" opacity="0.68"/><line x1="17" y1="15" x2="22" y2="15" stroke="${a}" stroke-width="2" stroke-linecap="round" opacity="0.68"/></svg>`,
  "Literary Fiction":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><path d="M3 5C3 5 12 4 12 4C12 4 21 5 21 5L21 27C21 27 12 26 12 26C12 26 3 27 3 27Z" fill="none" stroke="${a}" stroke-width="1.6" opacity="0.68"/><line x1="12" y1="4" x2="12" y2="27" stroke="${a}" stroke-width="1.4" opacity="0.62"/><line x1="4" y1="11" x2="11" y2="11" stroke="${a}" stroke-width="1" opacity="0.48"/><line x1="4" y1="16" x2="11" y2="16" stroke="${a}" stroke-width="1" opacity="0.4"/><line x1="4" y1="21" x2="11" y2="21" stroke="${a}" stroke-width="1" opacity="0.48"/><line x1="13" y1="11" x2="20" y2="11" stroke="${a}" stroke-width="1" opacity="0.48"/><line x1="13" y1="16" x2="20" y2="16" stroke="${a}" stroke-width="1" opacity="0.4"/><line x1="13" y1="21" x2="20" y2="21" stroke="${a}" stroke-width="1" opacity="0.48"/></svg>`,
  "Historical Fiction":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><circle cx="12" cy="13" r="11" fill="none" stroke="${a}" stroke-width="1" opacity="0.45"/><line x1="12" y1="2" x2="12" y2="24" stroke="${a}" stroke-width="1.6" opacity="0.68"/><line x1="1" y1="13" x2="23" y2="13" stroke="${a}" stroke-width="1.6" opacity="0.68"/><line x1="4.3" y1="5.3" x2="19.7" y2="20.7" stroke="${a}" stroke-width="1" opacity="0.4"/><line x1="4.3" y1="20.7" x2="19.7" y2="5.3" stroke="${a}" stroke-width="1" opacity="0.4"/><polygon points="12,0 13.5,3.5 12,2.3 10.5,3.5" fill="${a}" opacity="0.9"/><circle cx="12" cy="13" r="2.5" fill="${a}" opacity="0.65"/></svg>`,
  "Biography":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><ellipse cx="12" cy="11" rx="7" ry="9" fill="none" stroke="${a}" stroke-width="1.8" opacity="0.65"/><circle cx="12" cy="9" r="3.5" fill="${a}" opacity="0.42"/><path d="M5 20C4 25 5 30 12 32C19 30 20 25 19 20" fill="none" stroke="${a}" stroke-width="1.6" opacity="0.58" stroke-linecap="round"/></svg>`,
  "Philosophy":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><polygon points="12,2 23,22 1,22" fill="none" stroke="${a}" stroke-width="2" opacity="0.75"/><ellipse cx="12" cy="14" rx="5" ry="4" fill="none" stroke="${a}" stroke-width="1.3" opacity="0.65"/><circle cx="12" cy="14" r="2" fill="${a}" opacity="0.75"/></svg>`,
  "Classic":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><rect x="3" y="2" width="18" height="3.5" rx="1.5" fill="${a}" opacity="0.55"/><line x1="7" y1="5.5" x2="7" y2="27" stroke="${a}" stroke-width="2.8" stroke-linecap="round" opacity="0.55"/><line x1="17" y1="5.5" x2="17" y2="27" stroke="${a}" stroke-width="2.8" stroke-linecap="round" opacity="0.55"/><line x1="12" y1="5.5" x2="12" y2="27" stroke="${a}" stroke-width="1.5" stroke-linecap="round" opacity="0.38"/><rect x="2" y="27" width="20" height="3" fill="${a}" opacity="0.55"/><rect x="1" y="30" width="22" height="3" rx="1.5" fill="${a}" opacity="0.48"/></svg>`,
  "Non-Fiction":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><rect x="2" y="20" width="5" height="12" fill="${a}" opacity="0.58" rx="1"/><rect x="9" y="12" width="5" height="20" fill="${a}" opacity="0.52" rx="1"/><rect x="16" y="16" width="6" height="16" fill="${a}" opacity="0.58" rx="1"/><line x1="1" y1="32" x2="23" y2="32" stroke="${a}" stroke-width="1.8" opacity="0.68"/><circle cx="4.5" cy="8" r="2" fill="${a}" opacity="0.52"/><circle cx="11.5" cy="3" r="2" fill="${a}" opacity="0.52"/><circle cx="19" cy="6" r="2" fill="${a}" opacity="0.52"/><line x1="4.5" y1="8" x2="11.5" y2="3" stroke="${a}" stroke-width="1.2" opacity="0.44"/><line x1="11.5" y1="3" x2="19" y2="6" stroke="${a}" stroke-width="1.2" opacity="0.44"/></svg>`,
  "Graphic Novel":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><rect x="1" y="2" width="22" height="16" rx="2.5" fill="none" stroke="${a}" stroke-width="2" opacity="0.75"/><line x1="12" y1="2" x2="12" y2="18" stroke="${a}" stroke-width="1.4" opacity="0.55"/><line x1="1" y1="10" x2="23" y2="10" stroke="${a}" stroke-width="1.4" opacity="0.55"/><path d="M8 18 L8 25 L15 18Z" fill="${a}" opacity="0.7"/></svg>`,
  "Poetry":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><path d="M17 2 Q21 9 17 18 Q14 25 13 33" stroke="${a}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/><path d="M13 7 Q18 1 22 4 Q18 11 13 7Z" fill="${a}" opacity="0.78"/><circle cx="8" cy="15" r="1.5" fill="${a}" opacity="0.52"/><circle cx="7" cy="23" r="1.2" fill="${a}" opacity="0.46"/></svg>`,
  "Mythology":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><path d="M12 2 l2 6 l6 0 l-5 3.5 l2 6 l-5-3.5 l-5 3.5 l2-6 l-5-3.5 l6 0z" fill="${a}" opacity="0.78"/><line x1="12" y1="21" x2="12" y2="32" stroke="${a}" stroke-width="1.6" opacity="0.58"/><line x1="12" y1="25" x2="6" y2="30" stroke="${a}" stroke-width="1.6" stroke-linecap="round" opacity="0.52"/><line x1="12" y1="25" x2="18" y2="30" stroke="${a}" stroke-width="1.6" stroke-linecap="round" opacity="0.52"/></svg>`,
  "_default":
    (a)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34"><path d="M12 3 L21 17 L12 31 L3 17Z" fill="none" stroke="${a}" stroke-width="1.8" opacity="0.65"/><circle cx="12" cy="17" r="2.5" fill="${a}" opacity="0.65"/></svg>`,
};

["Legal Thriller","Medical Thriller"].forEach(g => { ORNAMENT[g]=ORNAMENT["Thriller"]; ACCENT[g]=ACCENT["Thriller"]; });
["Memoir","Essays"].forEach(g => { ORNAMENT[g]=ORNAMENT["Literary Fiction"]; });
["History","Economics","Business","Politics","Sociology","Psychology","Popular Science","Systems"].forEach(g => { ORNAMENT[g]=ORNAMENT["Non-Fiction"]; });
["Dystopian","Romantasy"].forEach(g => { ORNAMENT[g]=ORNAMENT["Fantasy"]; });
["Spirituality","Self-Help","Environment"].forEach(g => { ORNAMENT[g]=ORNAMENT["_default"]; });

const hexLuminance = (hex) => {
  const c = hex.replace("#","");
  const r = parseInt(c.slice(0,2),16)/255, g = parseInt(c.slice(2,4),16)/255, b = parseInt(c.slice(4,6),16)/255;
  const toL = x => x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055,2.4);
  return 0.2126*toL(r) + 0.7152*toL(g) + 0.0722*toL(b);
};

const spineTextColor = (hex) => hexLuminance(hex) > 0.35 ? "rgba(0,0,0,0.82)" : "#ffffff";

// Real bookbinding look: dark end-bands + accent ruling line + centred ornament
const getSpineStyle = (genre, primary) => {
  const a = ACCENT[genre] || "#e8d5a3";
  const ornUrl = u((ORNAMENT[genre] || ORNAMENT["_default"])(a));
  const d = "rgba(0,0,0,0.3)";
  // top band: dark with accent ruling line at inner edge (bottom of band)
  const topBand = `linear-gradient(to bottom,${d} 0%,${d} 76%,${a}cc 76%,${a}cc 100%)`;
  // bottom band: accent ruling line at inner edge (top of band)
  const botBand = `linear-gradient(to bottom,${a}cc 0%,${a}cc 24%,${d} 24%,${d} 100%)`;
  return {
    background: primary,
    backgroundImage: `${topBand},${botBand},${ornUrl}`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "top,bottom,center",
    backgroundSize: "100% 13px,100% 13px,22px 34px",
  };
};

// ── Spine / Shelf view ────────────────────────────────────────────────────────
const BOOK_W = 26, BOOK_GAP = 3;

function SpineView({ filtered, genreMap, session, openEditModal }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hovered = hoveredId ? filtered.find(b => b.id === hoveredId) : null;

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => (a.year_read_end || a.year || 0) - (b.year_read_end || b.year || 0)),
  [filtered]);

  const rows = useMemo(() => {
    if (!containerWidth) return [sorted];
    const perRow = Math.max(1, Math.floor((containerWidth + BOOK_GAP) / (BOOK_W + BOOK_GAP)));
    const out = [];
    for (let i = 0; i < sorted.length; i += perRow) out.push(sorted.slice(i, i + perRow));
    return out;
  }, [sorted, containerWidth]);

  const bookHeight = (b) => 120 + (b.id % 5) * 8;

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {rows.map((books, rowIdx) => (
        <div key={rowIdx}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: BOOK_GAP, padding: "8px 0 0" }}>
            {books.map(b => {
              const isHovered = hoveredId === b.id;
              const hasCover = !!b.cover_url;
              const showCover = isHovered && hasCover;
              const genre = b.genre?.[0] || "Other";
              const color = genreMap[genre] || G.muted;
              const spineStyle = getSpineStyle(genre, color);
              const titleColor = spineTextColor(color.length === 7 ? color : G.muted);
              const h = bookHeight(b);
              let bgStyle;
              if (showCover) {
                bgStyle = { background: `url(${b.cover_url}) center/cover` };
              } else if (hasCover) {
                bgStyle = { backgroundImage: `url(${b.cover_url})`, backgroundSize: "auto 100%", backgroundPosition: "center", backgroundRepeat: "no-repeat" };
              } else {
                bgStyle = spineStyle;
              }
              return (
                <div key={b.id}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => session && openEditModal(b)}
                  title={`${b.title} — ${b.author}`}
                  style={{
                    width: isHovered ? (hasCover ? 90 : 40) : BOOK_W,
                    height: h,
                    borderRadius: isHovered ? 4 : "2px 2px 0 0",
                    ...bgStyle,
                    cursor: session ? "pointer" : "default",
                    transition: "width 0.15s ease, box-shadow 0.15s ease",
                    overflow: "hidden", flexShrink: 0,
                    boxShadow: isHovered ? "3px 0 10px rgba(0,0,0,0.3)" : "2px 0 4px rgba(0,0,0,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {!hasCover && (
                    <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)",
                      fontSize: 9, color: titleColor, fontWeight: 500, textAlign: "center",
                      overflow: "hidden", whiteSpace: "nowrap", maxHeight: "90%", padding: "0 2px" }}>
                      {b.title}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Shelf plank */}
          <div style={{ height: 12, background: `linear-gradient(180deg, ${G.card2} 0%, ${G.border} 100%)`, borderTop: `2px solid ${G.dimmed}`, borderRadius: "0 0 3px 3px", boxShadow: "0 4px 8px rgba(0,0,0,0.12)", marginBottom: 28 }} />
        </div>
      ))}
      {/* Hover info strip */}
      <div style={{ minHeight: 32, padding: "8px 12px", background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, fontSize: 12, display: "flex", gap: 10, alignItems: "center", transition: "opacity 0.15s", opacity: hovered ? 1 : 0 }}>
        {hovered && <>
          <span style={{ fontWeight: 600, color: G.text }}>{hovered.title}</span>
          <span style={{ color: G.muted }}>by {hovered.author}</span>
          {hovered.year_read_end && <span style={{ color: G.dimmed }}>· {hovered.year_read_end}</span>}
          {hovered.genre?.[0] && <span style={{ color: genreMap[hovered.genre[0]] || G.dimmed }}>· {hovered.genre[0]}</span>}
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
