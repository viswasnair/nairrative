import G from "../constants/theme";
import MultiSelect from "./MultiSelect";

export default function BookModal({
  editingBook,
  bookDraft,
  setBookDraft,
  bookChatInputRef,
  bookChatLoading,
  bookChatPending,
  bookSaving,
  bookMsg,
  newGenreInput,
  setNewGenreInput,
  newGenreOpen,
  setNewGenreOpen,
  newGenreSaving,
  genreList,
  chatFillBook,
  applyPending,
  setBookChatPending,
  addGenre,
  saveBook,
  deleteBook,
  onClose,
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.text }}>{editingBook ? "Edit Book" : "Add Book"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: G.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Chat prompt */}
        <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>✦ Describe the book — AI will fill in the details</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input-dark" style={{ flex: 1, fontSize: 12 }} placeholder='e.g. "Dune by Frank Herbert, 1965 sci-fi epic"'
              ref={bookChatInputRef} defaultValue=""
              onKeyDown={e => e.key === "Enter" && chatFillBook()} />
            <button className="btn-gold" style={{ padding: "8px 14px", fontSize: 12, flexShrink: 0 }} onClick={chatFillBook} disabled={bookChatLoading}>
              {bookChatLoading ? "…" : "Fill"}
            </button>
          </div>
          {bookChatPending && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: `${G.gold}12`, border: `1px solid ${G.goldDim}`, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: G.text, fontWeight: 600, marginBottom: 4 }}>"{bookChatPending.title}" by {bookChatPending.authors?.map(a => a.name).join(" & ")}</div>
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
                <input className="input-dark" style={{ flex: 2, fontSize: 12 }} placeholder="Author name" value={a.name}
                  onChange={e => setBookDraft(p => { const au = [...p.authors]; au[i] = { ...au[i], name: e.target.value }; return { ...p, authors: au }; })} />
                {bookDraft.authors.length > 1 && (
                  <button onClick={() => setBookDraft(p => ({ ...p, authors: p.authors.filter((_, j) => j !== i) }))}
                    style={{ background: "none", border: "none", color: G.muted, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                )}
              </div>
            ))}
            <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => setBookDraft(p => ({ ...p, authors: [...p.authors, { name: "" }] }))}>+ Add author</button>
          </div>

          {/* Genres */}
          <div>
            <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>Genres</div>
            <MultiSelect options={genreList} selected={bookDraft.genres} onChange={v => setBookDraft(p => ({ ...p, genres: v }))} placeholder="Select genres…" style={{ width: "100%" }} />
            {!newGenreOpen
              ? <button onClick={() => setNewGenreOpen(true)} style={{ background: "none", border: "none", color: G.muted, fontSize: 11, cursor: "pointer", padding: "6px 0 0", textDecoration: "underline" }}>+ Add new genre</button>
              : <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input autoFocus className="input-dark" style={{ flex: 1, fontSize: 12 }} placeholder="New genre name…"
                    value={newGenreInput} onChange={e => setNewGenreInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addGenre(); if (e.key === "Escape") { setNewGenreOpen(false); setNewGenreInput(""); } }} />
                  <button className="btn-gold" style={{ padding: "6px 12px", fontSize: 12 }} onClick={addGenre} disabled={newGenreSaving}>{newGenreSaving ? "…" : "Add"}</button>
                  <button onClick={() => { setNewGenreOpen(false); setNewGenreInput(""); }}
                    style={{ background: "none", border: "none", color: G.muted, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
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
  );
}
