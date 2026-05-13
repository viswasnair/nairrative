import { useState, Fragment } from "react";
import G from "../constants/theme";
import MultiSelect from "./MultiSelect";
import { downloadCSV, downloadJSON } from "../lib/bookUtils";
import BookshelfTab from "./BookshelfTab";

const RATING_META = {
  transformative: { label: "Transformative", color: G.gold   },
  loved:          { label: "Loved",          color: G.blue   },
  enjoyed:        { label: "Enjoyed",        color: G.green  },
  meh:            { label: "Meh",            color: G.muted  },
  dont_remember:  { label: "Don't Remember", color: G.purple },
  dropped:        { label: "Dropped",        color: G.copper },
  didnt_like:     { label: "Didn't Like",    color: G.red    },
};

const LIB_SUBTABS = [
  { id: "list",      label: "List" },
  { id: "bookshelf", label: "Bookshelf" },
];

export default function LibraryTab({
  books, session, genreMap, filteredBooks,
  search, setSearch,
  libGenres, setLibGenres,
  libYears, setLibYears,
  libAuthors, setLibAuthors,
  libCountries, setLibCountries,
  libFormats, setLibFormats,
  libMoods, setLibMoods,
  libArchetypes, setLibArchetypes,
  libThemes, setLibThemes,
  libSort, setLibSort,
  allGenres, allYears, allAuthors, allCountries, allFormats,
  allMoods, allArchetypes, allThemes,
  openAddModal, openEditModal, openRatingMode,
}) {
  const [subTab, setSubTab] = useState("list");
  const [hoveredBook, setHoveredBook] = useState(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Count active secondary filters — drives the badge and auto-expand
  const secondaryCount = libAuthors.length + libCountries.length + libFormats.length
    + libMoods.length + libArchetypes.length + libThemes.length;
  // Panel auto-opens when a chart click fires a secondary filter
  const panelOpen = showMoreFilters || secondaryCount > 0;

  return (
    <div>
      {/* Subtab nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 24 }}>
        {LIB_SUBTABS.map((t, i) => (
          <Fragment key={t.id}>
            {i > 0 && <span style={{ color: G.dimmed, fontSize: 12, userSelect: "none" }}>·</span>}
            <button className="subtab-btn" onClick={() => setSubTab(t.id)}
              style={{ background: "none", border: "none", padding: "4px 8px", cursor: "pointer", fontSize: 13, fontWeight: subTab === t.id ? 600 : 400, color: subTab === t.id ? G.gold : G.muted, fontFamily: "'DM Sans', sans-serif" }}>
              {t.label}
            </button>
          </Fragment>
        ))}
      </div>

      {subTab === "bookshelf" && (
        <BookshelfTab books={books} genreMap={genreMap} openEditModal={openEditModal} session={session} />
      )}

      {subTab === "list" && (
        <div>
          {/* Primary filter row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: panelOpen ? 6 : 16 }}>
            <input className="input-dark" style={{ width: 190, flex: "0 0 auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            <MultiSelect options={allGenres} selected={libGenres} onChange={setLibGenres} placeholder="Genre" style={{ width: 130, flex: "0 0 auto" }} />
            <MultiSelect options={allYears} selected={libYears} onChange={setLibYears} placeholder="Year" style={{ width: 100, flex: "0 0 auto" }} />
            <select className="input-dark" style={{ width: 130, flex: "0 0 auto" }} value={libSort} onChange={e => setLibSort(e.target.value)}>
              <option value="year">Sort: Year</option>
              <option value="title">Sort: Title</option>
              <option value="author">Sort: Author</option>
              <option value="rating">Sort: Rating</option>
            </select>
            {/* More / Less toggle — amber when secondary filters are active */}
            <button
              onClick={secondaryCount === 0 ? () => setShowMoreFilters(v => !v) : undefined}
              title={secondaryCount > 0 ? "Clear secondary filters to collapse" : ""}
              style={{
                flex: "0 0 auto", background: secondaryCount > 0 ? `${G.gold}18` : "none",
                border: `1px solid ${secondaryCount > 0 ? G.gold : G.border}`,
                color: secondaryCount > 0 ? G.gold : G.muted,
                borderRadius: 6, padding: "5px 10px",
                cursor: secondaryCount === 0 ? "pointer" : "default",
                fontSize: 12, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
              }}
            >
              {secondaryCount > 0 ? `▼ Filters · ${secondaryCount}` : (showMoreFilters ? "▲ Less" : "▼ More")}
            </button>
            <button className="btn-gold" style={{ padding: "7px 16px", fontSize: 12, opacity: session ? 1 : 0.35, cursor: session ? "pointer" : "not-allowed" }} onClick={() => session && openAddModal()}>+ Add Book</button>
            <span style={{ color: G.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filteredBooks.length} books</span>
            <div style={{ flex: 1 }} />
            <button className="btn-ghost" onClick={() => downloadCSV(books)}>↓ CSV</button>
            <button className="btn-ghost" onClick={() => downloadJSON(books)}>↓ JSON</button>
            <button className="btn-ghost" style={{ opacity: session ? 1 : 0.35, cursor: session ? "pointer" : "not-allowed" }} onClick={() => session && openRatingMode()}>⚡ Rate Library</button>
          </div>

          {/* Secondary filter panel — Author, Country, Format, Mood, Archetype, Theme */}
          {panelOpen && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16, paddingTop: 8, borderTop: `1px solid ${G.border}` }}>
              <MultiSelect options={allAuthors} selected={libAuthors} onChange={setLibAuthors} placeholder="Author" style={{ width: 160, flex: "0 0 auto" }} />
              <MultiSelect options={allCountries} selected={libCountries} onChange={setLibCountries} placeholder="Country" style={{ width: 130, flex: "0 0 auto" }} />
              <MultiSelect options={allFormats} selected={libFormats} onChange={setLibFormats} placeholder="Format" style={{ width: 120, flex: "0 0 auto" }} />
              <MultiSelect options={allMoods} selected={libMoods} onChange={setLibMoods} placeholder="Mood" style={{ width: 120, flex: "0 0 auto" }} />
              <MultiSelect options={allArchetypes} selected={libArchetypes} onChange={setLibArchetypes} placeholder="Archetype" style={{ width: 140, flex: "0 0 auto" }} />
              <MultiSelect options={allThemes} selected={libThemes} onChange={setLibThemes} placeholder="Theme" style={{ width: 130, flex: "0 0 auto" }} />
            </div>
          )}

          {/* Scrollable table wrapper */}
          <div className="lib-scroll-wrap" style={{ borderRadius: 8, border: `1px solid ${G.border}` }}>
          <div className="lib-inner">

          {/* Table Header */}
          <div className="lib-row" style={{ background: G.card2, borderRadius: "8px 8px 0 0", borderBottom: `1px solid ${G.border}` }}>
            {["", "Title", "Author", "Genre", "Format", "Type", "Pages", "Start", "End", "Rating", ""].map((h, i) => (
              <div key={i} style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div className="lib-table-wrap" style={{ background: G.card, borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 520, overflowY: "auto" }}>
            {filteredBooks.map(b => {
              const rm = b.rating ? RATING_META[b.rating] : null;
              return (
                <div key={b.id} className="lib-row" onMouseEnter={() => setHoveredBook(b)} onMouseLeave={() => setHoveredBook(null)}>
                  <div style={{ width: 34, height: 48, borderRadius: 3, overflow: "hidden", background: G.card2, border: `1px solid ${G.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {b.cover_url
                      ? <img src={b.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                      : <span style={{ fontSize: 12, color: G.dimmed }}>□</span>
                    }
                  </div>
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
                  <div>
                    {rm
                      ? <span style={{ fontSize: 10, fontWeight: 600, color: rm.color, background: `${rm.color}18`, padding: "2px 7px", borderRadius: 10, border: `1px solid ${rm.color}40`, whiteSpace: "nowrap" }}>{rm.label}</span>
                      : <span style={{ fontSize: 11, color: G.dimmed }}>—</span>
                    }
                  </div>
                  <button onClick={() => session && openEditModal(b)} style={{ background: "none", border: "none", color: session ? G.muted : G.dimmed, cursor: session ? "pointer" : "not-allowed", fontSize: 13, padding: 0 }} title={session ? "Edit" : "Sign in to edit"}>✎</button>
                </div>
              );
            })}
            {filteredBooks.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: G.muted }}>No books match your filters.</div>
            )}
          </div>
          </div>{/* end lib-inner */}
          </div>{/* end lib-scroll-wrap */}

          {/* Description hover strip */}
          <div style={{ minHeight: 36, marginTop: 8, padding: "8px 12px", background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, fontSize: 12, display: "flex", gap: 10, alignItems: "center", transition: "opacity 0.15s", opacity: hoveredBook ? 1 : 0 }}>
            {hoveredBook && <>
              <span style={{ fontWeight: 600, color: G.text, flexShrink: 0 }}>{hoveredBook.title}</span>
              {hoveredBook.description
                ? <span style={{ color: G.muted, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hoveredBook.description}</span>
                : <span style={{ color: G.dimmed, fontStyle: "italic" }}>No description yet.</span>
              }
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
