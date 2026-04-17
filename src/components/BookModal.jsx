import { useEffect, useState } from "react";
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
  authorSuggestions,
  checkAuthorSuggestion,
  acceptAuthorSuggestion,
  dismissAuthorSuggestion,
  genreSuggestion,
  acceptGenreSuggestion,
  dismissGenreSuggestion,
}) {
  const [coverResults, setCoverResults] = useState([]);
  const [coverSearching, setCoverSearching] = useState(false);
  const [coverSearched, setCoverSearched] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteInput, setPasteInput] = useState("");

  useEffect(() => {
    setCoverResults([]);
    setCoverSearched(false);
    setPasteMode(false);
    setPasteInput("");
  }, [bookDraft.title]);

  const searchCovers = async () => {
    const title = bookDraft.title?.trim();
    const author = bookDraft.authors?.[0]?.name?.trim();
    if (!title) return;
    setCoverSearching(true);
    setCoverResults([]);
    try {
      const params = new URLSearchParams({ fields: "cover_i,title", limit: 20 });
      params.set("title", title);
      if (author) params.set("author", author);
      const res = await fetch(`https://openlibrary.org/search.json?${params}`);
      const data = await res.json();
      const ids = [...new Set(
        (data.docs || []).filter(d => d.cover_i).map(d => d.cover_i)
      )].slice(0, 9);
      setCoverResults(ids);
    } catch { /* silently fail */ }
    setCoverSearching(false);
    setCoverSearched(true);
  };

  const applyPasteUrl = () => {
    const url = pasteInput.trim();
    if (url) setBookDraft(p => ({ ...p, cover_url: url }));
    setPasteMode(false);
    setPasteInput("");
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
      <div className="modal-scroll">
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
              <div key={i}>
                <div style={{ display: "flex", gap: 6, marginBottom: authorSuggestions?.[i] ? 4 : 6 }}>
                  <input className="input-dark" style={{ flex: 2, fontSize: 12 }} placeholder="Author name" value={a.name}
                    onChange={e => setBookDraft(p => { const au = [...p.authors]; au[i] = { ...au[i], name: e.target.value }; return { ...p, authors: au }; })}
                    onBlur={e => checkAuthorSuggestion(i, e.target.value)} />
                  {bookDraft.authors.length > 1 && (
                    <button onClick={() => setBookDraft(p => ({ ...p, authors: p.authors.filter((_, j) => j !== i) }))}
                      style={{ background: "none", border: "none", color: G.muted, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                  )}
                </div>
                {authorSuggestions?.[i]?.length > 0 && (
                  <div style={{ fontSize: 11, color: G.red, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    Did you mean:
                    {authorSuggestions[i].map(s => (
                      <button key={s} onClick={() => acceptAuthorSuggestion(i, s)}
                        style={{ background: "none", border: "none", color: G.red, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                        {s}
                      </button>
                    ))}
                    <button onClick={() => dismissAuthorSuggestion(i)}
                      style={{ background: "none", border: "none", color: G.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Keep mine</button>
                  </div>
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
              : <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input autoFocus className="input-dark" style={{ flex: 1, fontSize: 12 }} placeholder="New genre name…"
                      value={newGenreInput} onChange={e => { setNewGenreInput(e.target.value); dismissGenreSuggestion(); }}
                      onKeyDown={e => { if (e.key === "Enter") addGenre(); if (e.key === "Escape") { setNewGenreOpen(false); setNewGenreInput(""); dismissGenreSuggestion(); } }} />
                    <button className="btn-gold" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => addGenre()} disabled={newGenreSaving}>{newGenreSaving ? "…" : "Add"}</button>
                    <button onClick={() => { setNewGenreOpen(false); setNewGenreInput(""); dismissGenreSuggestion(); }}
                      style={{ background: "none", border: "none", color: G.muted, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
                  </div>
                  {genreSuggestion?.length > 0 && (
                    <div style={{ fontSize: 11, color: G.red, marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      Did you mean:
                      {genreSuggestion.map(s => (
                        <button key={s} onClick={() => acceptGenreSuggestion(s)}
                          style={{ background: "none", border: "none", color: G.red, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                          {s}
                        </button>
                      ))}
                      <button onClick={() => { dismissGenreSuggestion(); addGenre(true); }}
                        style={{ background: "none", border: "none", color: G.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Add as new anyway</button>
                    </div>
                  )}
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

          {/* Rating */}
          <div>
            <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Rating</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { value: "transformative", label: "Transformative", color: G.gold   },
                { value: "loved",          label: "Loved",          color: G.blue   },
                { value: "enjoyed",        label: "Enjoyed",        color: G.green  },
                { value: "meh",            label: "Meh",            color: G.muted  },
                { value: "dont_remember",  label: "Don't Remember", color: G.purple },
                { value: "dropped",        label: "Dropped",        color: G.copper },
                { value: "didnt_like",     label: "Didn't Like",    color: G.red    },
              ].map(t => {
                const active = bookDraft.rating === t.value;
                return (
                  <button key={t.value}
                    onClick={() => setBookDraft(p => ({ ...p, rating: active ? "" : t.value }))}
                    style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${active ? t.color : G.border}`,
                      background: active ? `${t.color}18` : "transparent",
                      color: active ? t.color : G.muted,
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cover picker */}
          <div>
            <div style={{ color: G.muted, fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Cover</div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {/* Current cover preview */}
              <div style={{ flexShrink: 0, width: 56, height: 80, borderRadius: 4, border: `1px solid ${G.border}`, background: G.card2, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {bookDraft.cover_url
                  ? <img src={bookDraft.cover_url} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                  : <span style={{ fontSize: 18, color: G.dimmed }}>□</span>
                }
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={searchCovers} disabled={coverSearching || !bookDraft.title?.trim()}>
                    {coverSearching ? "Searching…" : "Search covers"}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => { setPasteMode(p => !p); setCoverResults([]); }}>
                    Paste URL
                  </button>
                  {bookDraft.cover_url && (
                    <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px", color: G.red, borderColor: `${G.red}40` }} onClick={() => setBookDraft(p => ({ ...p, cover_url: "" }))}>
                      Clear
                    </button>
                  )}
                </div>

                {/* Paste URL input */}
                {pasteMode && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input autoFocus className="input-dark" style={{ flex: 1, fontSize: 12 }} placeholder="https://…" value={pasteInput} onChange={e => setPasteInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") applyPasteUrl(); if (e.key === "Escape") { setPasteMode(false); setPasteInput(""); } }} />
                    <button className="btn-gold" style={{ fontSize: 11, padding: "5px 12px" }} onClick={applyPasteUrl}>Use</button>
                  </div>
                )}
              </div>
            </div>

            {/* Cover results grid */}
            {coverResults.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: G.muted, marginBottom: 6 }}>Click a cover to use it</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {coverResults.map(id => {
                    const url = `https://covers.openlibrary.org/b/id/${id}-M.jpg`;
                    const selected = bookDraft.cover_url === url;
                    return (
                      <button key={id} onClick={() => setBookDraft(p => ({ ...p, cover_url: selected ? "" : url }))}
                        style={{ padding: 0, border: `2px solid ${selected ? G.gold : G.border}`, borderRadius: 4, background: "none", cursor: "pointer", overflow: "hidden", width: 46, height: 66, flexShrink: 0 }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={e => { e.target.closest("button").style.display = "none"; }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {coverSearched && coverResults.length === 0 && !coverSearching && (
              <div style={{ marginTop: 8, fontSize: 11, color: G.muted }}>No covers found — try "Paste URL" to add one manually.</div>
            )}
          </div>

          {bookMsg && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: bookMsg.startsWith("✓") ? `${G.green}18` : `${G.red}18`, color: bookMsg.startsWith("✓") ? G.green : G.red, fontSize: 12 }}>{bookMsg}</div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn-gold" style={{ flex: 1 }} onClick={saveBook} disabled={bookSaving}>
              {bookSaving ? "Saving…" : editingBook ? "Save Changes" : "Add to Library"}
            </button>
            <button className="btn-ghost" onClick={onClose} disabled={bookSaving}>
              Cancel
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
    </div>
  );
}
