# Code Quality Optimization Plan

Generated: 2026-05-14  
Branch to work on: `claude/code-quality-review-O57AZ`

---

## CRITICAL

### C1 — N+1 query chain in `resolveAuthorLinks`
**File:** `src/lib/authorUtils.js` lines 22–43  
**Category:** Performance

For each author: SELECT → maybe INSERT → maybe AI HTTP request + UPDATE → INSERT link. A 3-author book where all are new generates up to 15 serial network round-trips.

**Fix:** Batch the initial lookup with `.select().in("name", authorNames)` to find all existing authors in one query. Resolve which names already exist first (cheap DB), then fetch countries only for the truly new ones (AI HTTP). The link inserts can stay sequential.

---

### C2 — N+1 query in `deleteBook` orphan check
**File:** `src/hooks/useBooks.js` lines 240–249  
**Category:** Performance

The loop calls `getAuthorBookCount(authorId)` once per junction row. Deleting a book with 4 authors = 4 separate count queries.

**Fix:** Collect all author IDs, delete the junction rows, then run one query: `.select("author_id").in("author_id", ids)` to find which authors still have other books. Infer zero-count authors from the diff. One round-trip instead of N.

---

### C3 — Race condition in `useRecs` auto-regen loop
**File:** `src/hooks/useRecs.js` lines 113–128  
**Category:** Correctness

When `booksFingerprint` changes, an async IIFE fires fetches for all `AUTO_RECS` sequentially. If books change again before it finishes (user adds two books quickly), a second loop starts concurrently — 2× API quota consumed, unpredictable state.

**Fix:** Add a generation counter ref (`genRef`). Increment on every fingerprint change. Each loop iteration checks `if (gen !== genRef.current) return` before proceeding. If a new fingerprint arrives mid-loop, the stale loop self-aborts.

---

### C4 — `chatFillBook` error silently discarded
**File:** `src/hooks/useBookAiFill.js` lines 28–32  
**Category:** Correctness

The catch block returns an error string — but the caller in BookModal never captures the return value. When AI fill fails, the user sees nothing.

**Fix:** Replace the return-string pattern with `bookChatError` state. Set it in the catch block, clear on success or new invocation. Expose `bookChatError` from the hook so BookModal can render it.

---

## HIGH

### H1 — Missing error handler on author list fetch
**File:** `src/hooks/useBooks.js` line 46  
**Category:** Correctness

```js
supabase.from("authors").select("name").order("name").then(({ data }) => {
  if (data) setAuthorList(data.map(a => a.name));
});
// no .catch() — errors silently swallowed
```

**Fix:** Add `.catch(e => console.error("Failed to fetch authors:", e))`.

---

### H2 — Silent empty catches in `aiCache.js`
**File:** `src/lib/aiCache.js` lines 9, 18  
**Category:** Correctness

Both catch blocks have no body. localStorage corruption or Supabase failures produce no diagnostic output — the cache silently falls through.

**Fix:** `catch (e) { console.warn("Cache load failed:", e); }` in both.

---

### H3 — `saveBook` close-timer not cancellable
**File:** `src/hooks/useBooks.js` line 217  
**Category:** Correctness

```js
setTimeout(() => { setShowBookModal(false); setBookMsg(""); }, 1200);
```

The timeout ID is discarded. If the user closes and reopens the modal within 1.2s, the stale timer fires and blanks the new modal's message.

**Fix:** Store the ID in a `useRef`. At the top of `saveBook` and inside `resetModal`, call `clearTimeout(timerRef.current)`.

---

### H4 — Cache load from Supabase ignores fingerprint
**File:** `src/lib/aiCache.js` lines 11–19 and `src/lib/db.js` line 130  
**Category:** Correctness

`loadCacheRow` selects only `"data"` — `fingerprint` is never fetched. When falling through to Supabase (new device, cleared localStorage), the DB row is served regardless of whether its fingerprint matches the current book set. A user who adds a book on device A and opens on device B gets stale analysis silently.

**Fix:**
1. In `db.js` `loadCacheRow`, change `select("data")` → `select("data, fingerprint")`.
2. In `aiCache.js` after fetching from DB, check `data.fingerprint === fingerprint` before accepting the result. If it doesn't match, return `null` so the caller triggers a fresh fetch.

---

## MEDIUM

### M1 — Auto-regen fires regardless of active tab
**File:** `src/hooks/useRecs.js` lines 113–128  
**Category:** Performance

When a book is saved on the Library tab, the full recs loop starts immediately, consuming API quota while the user isn't on the Recs tab.

**Fix:** If `activeTab !== "recs"`, set a `recsStaleRef = true` instead of firing the loop. In the existing `activeTab` effect (that loads cache on tab switch), check `recsStaleRef` and trigger the loop then.

---

### M2 — `downloadCSV` doesn't escape embedded double quotes
**File:** `src/lib/bookUtils.js` lines 91–97  
**Category:** Correctness

Title, series, notes are wrapped in `"..."` but internal `"` characters aren't doubled. A book titled `The "Good" Place` produces a broken CSV row.

**Fix:** Replace all `"${val}"` CSV cells with `"${String(val).replace(/"/g, '""')}"` — standard RFC 4180 escaping.

---

### M3 — `saveRecs` called inside `setState` updater
**File:** `src/hooks/useRecs.js` lines 100–103  
**Category:** Correctness

```js
setIntentResults(prev => {
  const updated = { ...prev, [intentId]: ... };
  saveRecs(updated);  // async side-effect inside synchronous updater
  return updated;
});
```

React StrictMode invokes updaters twice in development; the async write runs twice.

**Fix:** Compute `updated` first, then call `setIntentResults(updated)` and `saveRecs(updated)` as two separate sequential statements.

---

### M4 — `useBooks` bypasses `db.js` adapter for writes
**File:** `src/hooks/useBooks.js` lines 178–190, 197–209, 232–237  
**Category:** Maintainability

`db.js` was extracted as the single data-access layer, but `useBooks` still calls `supabase` directly for book insert, update, and delete. Two patterns coexist for the same table.

**Fix:** Route all book CRUD through `db.js` — `updateBook(editingBook.id, fields)`, `insertBook(fields)`, `deleteBook(editingBook.id)` — so any future policy change is made in one place.

---

## LOW

### L1 — Author name leaked in thrown error
**File:** `src/lib/authorUtils.js` line 29  
**Category:** Security/hygiene

`throw new Error(\`Could not create author: ${aName}\`)` — user-supplied input embedded in the Error message. Currently caught generically, but minor hygiene issue.

**Fix:** `throw new Error("author_create_failed")` and `console.error("Author insert failed for:", aName)` separately.

---

### L2 — `Math.min/max(...array)` spread on large arrays
**File:** `src/lib/bookUtils.js` lines 66–67  
**Category:** Correctness

`Math.min(...largeArray)` is stack-frame based and throws `RangeError` on very large arrays (>~100k elements). Unlikely at reading-list scale but fragile.

**Fix:** `array.reduce((a, b) => Math.min(a, b), Infinity)`.

---

### L3 — Missing error-path test coverage
**Files:** `tests/unit/aiCache.test.js`, `tests/unit/useRecs.test.js`  
**Category:** Testability

Existing tests cover happy paths well. Notable gaps:
- `loadCachedData` when `loadCacheRow` throws (Supabase error)
- `loadCachedData` when DB fingerprint doesn't match current fingerprint (tied to H4)
- `fetchIntentRecs` when the API response contains `data.error`

---

## Summary table

| ID | File | Severity | Effort |
|----|------|----------|--------|
| C1 | `src/lib/authorUtils.js` | Critical | Medium |
| C2 | `src/hooks/useBooks.js:240` | Critical | Small |
| C3 | `src/hooks/useRecs.js:113` | Critical | Small |
| C4 | `src/hooks/useBookAiFill.js:28` | Critical | Small |
| H1 | `src/hooks/useBooks.js:46` | High | Trivial |
| H2 | `src/lib/aiCache.js:9,18` | High | Trivial |
| H3 | `src/hooks/useBooks.js:217` | High | Small |
| H4 | `src/lib/aiCache.js` + `src/lib/db.js:130` | High | Small |
| M1 | `src/hooks/useRecs.js:113` | Medium | Small |
| M2 | `src/lib/bookUtils.js:91` | Medium | Trivial |
| M3 | `src/hooks/useRecs.js:100` | Medium | Trivial |
| M4 | `src/hooks/useBooks.js` | Medium | Small |
| L1 | `src/lib/authorUtils.js:29` | Low | Trivial |
| L2 | `src/lib/bookUtils.js:66` | Low | Trivial |
| L3 | `tests/unit/` | Low | Medium |

## Suggested implementation order

1. **H1, H2, H3** — trivial/small, no risk, clear wins
2. **C4** — small change, fixes a real UX gap (silent AI errors)
3. **H4** — small change, fixes silent stale-cache bug across devices; add L3 fingerprint test alongside
4. **C3 + M3** — both in `useRecs.js`, batch them together
5. **C2 + M4** — both in `useBooks.js`, batch them together
6. **C1** — most complex refactor; do last so it can be reviewed in isolation
7. **M1, M2, L1, L2** — polish pass, can be one commit

After each group: run `npm run test:unit` before committing.
