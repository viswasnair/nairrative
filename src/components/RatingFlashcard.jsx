import { useState, useEffect, useCallback, useRef } from "react";
import G from "../constants/theme";

const TIERS = [
  { value: "transformative", label: "Transformative", desc: "Changed how I think",       key: "1", color: G.gold   },
  { value: "loved",          label: "Loved",          desc: "Will recommend to everyone", key: "2", color: G.blue  },
  { value: "enjoyed",        label: "Enjoyed",        desc: "Good read, no regrets",      key: "3", color: G.green },
  { value: "meh",            label: "Meh",            desc: "Fine but forgettable",        key: "4", color: G.muted },
  { value: "dont_remember",  label: "Don't Remember", desc: "Can't recall much about it",  key: "5", color: G.purple },
  { value: "dropped",        label: "Dropped",        desc: "Didn't finish",               key: "6", color: G.copper },
  { value: "didnt_like",     label: "Didn't Like",    desc: "Not for me",                  key: "7", color: G.red  },
];

const RATING_ORDER = ["transformative", "loved", "enjoyed", "meh", "dont_remember", "dropped", "didnt_like"];

export default function RatingFlashcard({ books, updateBookRating, onClose }) {
  const queueRef = useRef(
    books.filter(b => !b.rating).sort((a, b) => (b.year_read_end || 0) - (a.year_read_end || 0) || b.id - a.id)
  );
  const queue = queueRef.current;

  const [index, setIndex] = useState(0);
  const [rated, setRated] = useState(0);
  const [flash, setFlash] = useState(null);

  const total = queue.length;
  const book = queue[index];

  const advance = useCallback((chosenRating) => {
    if (!book) return;
    if (chosenRating) {
      updateBookRating(book.id, chosenRating);
      if (!book.rating) setRated(r => r + 1);
      const tier = TIERS.find(t => t.value === chosenRating);
      setFlash(tier?.color);
      setTimeout(() => setFlash(null), 300);
    }
    setIndex(i => i + 1);
  }, [book, updateBookRating]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(null); return; }
      const tier = TIERS.find(t => t.key === e.key);
      if (tier) advance(tier.value);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, onClose]);

  const done = index >= total;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: G.card, border: `1px solid ${G.border}`, borderRadius: 16,
        width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden",
        position: "relative",
        boxShadow: flash ? `0 0 0 3px ${flash}` : "none",
        transition: "box-shadow 0.2s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${G.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: G.text, marginBottom: 6 }}>Rate Your Library</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Progress bar */}
              <div style={{ flex: 1, height: 4, background: G.card2, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: G.gold, borderRadius: 2, width: `${total ? (index / total) * 100 : 0}%`, transition: "width 0.2s" }} />
              </div>
              <span style={{ fontSize: 11, color: G.muted, whiteSpace: "nowrap" }}>
                {done ? `${rated} rated this session` : `${index + 1} / ${total}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: G.muted, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", maxHeight: "calc(90vh - 80px)" }}>
          {done ? (
            /* Done state */
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text, marginBottom: 8 }}>All done!</div>
              <div style={{ fontSize: 13, color: G.muted, marginBottom: 24 }}>
                You rated {rated} book{rated !== 1 ? "s" : ""} this session.
                {total - rated > 0 && ` ${total - rated} still unrated.`}
              </div>
              <button className="btn-gold" onClick={onClose}>Close</button>
            </div>
          ) : (
            <>
              {/* Book card */}
              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                {/* Cover */}
                <div style={{
                  flexShrink: 0, width: 80, height: 116, borderRadius: 5,
                  overflow: "hidden", border: `1px solid ${G.border}`,
                  background: (() => { const c = book.genre?.[0]; return c ? `${G.muted}22` : G.card2; })(),
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {book.cover_url
                    ? <img src={book.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                    : <span style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", color: G.dimmed }}>{book.title[0]}</span>
                  }
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: G.text, lineHeight: 1.3, marginBottom: 6 }}>{book.title}</div>
                  <div style={{ fontSize: 13, color: G.muted, marginBottom: 8 }}>{book.author}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {book.year_read_end && <span style={{ fontSize: 11, color: G.dimmed }}>{book.year_read_end}</span>}
                    {(book.genre || []).slice(0, 2).map(g => (
                      <span key={g} style={{ fontSize: 11, color: G.muted }}>· {g}</span>
                    ))}
                    {book.pages && <span style={{ fontSize: 11, color: G.dimmed }}>· {book.pages}pp</span>}
                  </div>
                  {/* Current rating badge */}
                  {book.rating && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: G.muted }}>Currently: </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: TIERS.find(t => t.value === book.rating)?.color || G.muted }}>
                        {TIERS.find(t => t.value === book.rating)?.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tier buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {TIERS.map(t => (
                  <button key={t.value}
                    onClick={() => advance(t.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px", borderRadius: 10,
                      border: `1px solid ${book.rating === t.value ? t.color : G.border}`,
                      background: book.rating === t.value ? `${t.color}12` : G.card2,
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "border-color 0.1s, background 0.1s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.background = `${t.color}0e`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = book.rating === t.value ? t.color : G.border; e.currentTarget.style.background = book.rating === t.value ? `${t.color}12` : G.card2; }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: `${t.color}22`, border: `1px solid ${t.color}60`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: t.color, fontWeight: 700 }}>{t.key}</span>
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.color }}>{t.label}</span>
                      <span style={{ fontSize: 11, color: G.muted, marginLeft: 8 }}>{t.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Skip */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={() => advance(null)}
                  style={{ background: "none", border: "none", color: G.muted, fontSize: 12, cursor: "pointer", padding: "4px 8px" }}>
                  Skip  <span style={{ fontSize: 10, color: G.dimmed }}>(Space)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
