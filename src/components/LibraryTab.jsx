import G from "../constants/theme";
import MultiSelect from "./MultiSelect";
import { downloadCSV, downloadJSON } from "../lib/bookUtils";

const RATING_META = {
  transformative: { label: "Transformative", color: G.gold },
  loved:          { label: "Loved",          color: G.blue },
  enjoyed:        { label: "Enjoyed",        color: G.green },
  meh:            { label: "Meh",            color: G.muted },
  dropped:        { label: "Dropped",        color: G.red },
};

export default function LibraryTab({
  books, session, genreMap, filteredBooks,
  search, setSearch,
  libGenres, setLibGenres,
  libYears, setLibYears,
  libAuthors, setLibAuthors,
  libSort, setLibSort,
  allGenres, allYears, allAuthors,
  openAddModal, openEditModal, openRatingMode,
}) {
  return (
    <div>
      {/* Filter row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <input className="input-dark" style={{ width: 190, flex: "0 0 auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        <MultiSelect options={allGenres} selected={libGenres} onChange={setLibGenres} placeholder="Genre" style={{ width: 130, flex: "0 0 auto" }} />
        <MultiSelect options={allYears} selected={libYears} onChange={setLibYears} placeholder="Year" style={{ width: 100, flex: "0 0 auto" }} />
        <MultiSelect options={allAuthors} selected={libAuthors} onChange={setLibAuthors} placeholder="Author" style={{ width: 160, flex: "0 0 auto" }} />
        <select className="input-dark" style={{ width: 130, flex: "0 0 auto" }} value={libSort} onChange={e => setLibSort(e.target.value)}>
          <option value="year">Sort: Year</option>
          <option value="title">Sort: Title</option>
          <option value="author">Sort: Author</option>
          <option value="rating">Sort: Rating</option>
        </select>
        <span style={{ color: G.muted, fontSize: 12, whiteSpace: "nowrap" }}>{filteredBooks.length} books</span>
        <div style={{ flex: 1 }} />
        <button className="btn-ghost" onClick={() => downloadCSV(books)}>↓ CSV</button>
        <button className="btn-ghost" onClick={() => downloadJSON(books)}>↓ JSON</button>
        <button className="btn-ghost" style={{ opacity: session ? 1 : 0.35, cursor: session ? "pointer" : "not-allowed" }} onClick={() => session && openRatingMode()}>⚡ Rate Library</button>
        <button className="btn-gold" style={{ padding: "7px 16px", fontSize: 12, opacity: session ? 1 : 0.35, cursor: session ? "pointer" : "not-allowed" }} onClick={() => session && openAddModal()}>+ Add Book</button>
      </div>

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
            <div key={b.id} className="lib-row">
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
    </div>
  );
}
