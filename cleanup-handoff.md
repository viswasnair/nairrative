# Dead Code Cleanup — Session Handoff

## What this is

A cleanup audit prompted by guidance from Claude.ai on safe dead code removal practices.
All findings are confirmed via grep and file reads — nothing speculative.

No code has been changed yet. This file documents exactly what to do and why.

---

## Going-forward rule (add to CLAUDE.md)

Add a **"Dead Code Cleanup"** section to `CLAUDE.md`:

### Before deleting anything
1. Confirm no dynamic dispatch — check for `eval`, string-based imports, plugin registries.
2. Run `npm run check:dead` (knip) — verify the symbol is flagged as unused.
3. Check git history — `git log -S <symbol>` — was it recently active or deliberately left?
4. Search string references — grep config files, CI scripts, and `vercel.json` for the name as a string.
5. Check test files — a function only referenced in a test is still dead app code, but the test must be removed/updated in the same commit.

### How to delete
- **Isolated commits** — never bundle dead code removal with feature work.
- **Run `npm run test:unit`** after every deletion to catch test regressions.
- For uncertain cases: add `// DEAD - removing YYYY-MM-DD` and let it sit one release cycle.

### Tooling reference
| Tool | Command | Purpose |
|------|---------|---------|
| knip | `npm run check:dead` | Unused exports, files, deps |
| ESLint | `npm run lint` | Unused vars within files |
| Coverage | `npm run test:coverage` | Execution gaps in tested paths |

---

## Confirmed issues to fix

### 1. `src/lib/db.js` — 22 dead exported functions

**Background:** The file header says "All Supabase data access flows through this file" but every hook bypasses it with direct Supabase calls. Only 4 of ~26 exports are actually called by app code:

| Function | Called by |
|----------|-----------|
| `loadCacheRow` | `src/lib/aiCache.js:1` |
| `saveCacheRow` | `src/lib/aiCache.js:1` |
| `getNewReleases` | `src/components/NewReleasesTab.jsx:17` |
| `triggerReleasesCheck` | `src/components/NewReleasesTab.jsx:25` |

**Dead (only referenced in `tests/unit/db.test.js`):**
`getBooks`, `insertBook`, `updateBook`, `deleteBook`, `updateBookRating`,
`getAuthorNames`, `findAuthorByName`, `createAuthor`, `updateAuthorCountry`, `deleteAuthor`,
`linkBookAuthor`, `deleteBookAuthors`, `getBookAuthorLinks`, `getAuthorBookCount`,
`getGenres`, `insertGenre`, `getAnalysisCache`, `saveAnalysisCache`,
`getRecsCache`, `saveRecsCache`, `getPanelPrompts`, `savePanelPrompts`

**What to do:**
- Delete all 22 dead functions from `src/lib/db.js`
- Update the file header comment to reflect that only the 4 live functions remain
- Delete `tests/unit/db.test.js` entirely (it only tests the dead functions)

---

### 2. `src/lib/bookStats.js:148` — two permanently-null placeholder properties

```js
// Current line 148:
fictionByEra: moodByEra, peakFictionEra: null, lowFictionEra: null,
```

`peakFictionEra` and `lowFictionEra` are always `null` — they are never assigned a real value
anywhere in the codebase and never read by any consumer. Confirmed via grep across all of `src/`
and `tests/`.

**What to do:**
- Remove `, peakFictionEra: null, lowFictionEra: null` from the return object
- Check `tests/unit/bookStats.test.js` for any assertion on these keys and remove them

---

### 3. `.github/workflows/e2e.yml` — knip not wired into CI

`knip` is installed (v6.12.1) and the script `check:dead` exists in `package.json`, but it is
never called in CI. Dead exports can accumulate silently between manual runs.

**What to do:**
Add this step to the `unit-tests` job in `.github/workflows/e2e.yml`, after the `Lint` step:

```yaml
- name: Check for dead exports (knip)
  run: npm run check:dead
```

---

### 4. `CLAUDE.md` — documentation drift

Two inaccuracies:

- **`CLAUDE_URL`** is referenced in `CLAUDE.md` under `api.js`, but the actual export name is
  `LLM_URL` (`src/lib/api.js:1`). Fix the reference.
- **`aiClient.js`** exists at `src/lib/aiClient.js` and exports `callAI` + `AI_MODELS`. It is
  used by `src/hooks/useAnalysis.js` but is entirely absent from the architecture table in
  `CLAUDE.md`. Add it.
- **`db.js`** is also absent from the architecture table. After cleanup, add it with just its
  4 live functions documented.

---

### 5. `TODO.md` — deferred follow-up (do not do in this cleanup pass)

`src/lib/aiClient.js` provides a `callAI` wrapper but only `useAnalysis.js` uses it.
Four other callers bypass it with raw `fetch(LLM_URL)`:
- `src/components/SeriesTab.jsx:19`
- `src/hooks/useGenres.js:51`
- `src/hooks/useBookAiFill.js:15`
- `src/hooks/useChat.js:117`, `157`
- `src/hooks/useRecs.js:76`

This is a partial-adoption inconsistency, not dead code. Add to TODO.md as a future cleanup:
"Migrate all raw `fetch(LLM_URL)` callers to use `callAI` from `aiClient.js`."

---

## What's already clean (no action needed)

| Area | Status |
|------|--------|
| ESLint `no-unused-vars` | Enabled at error level — `eslint.config.js:26` |
| knip installed | v6.12.1, `knip.json` configured, `check:dead` script in `package.json` |
| Coverage | v8 provider with per-file thresholds, enforced in CI |
| Commented-out code | None found anywhere |
| `// DEAD` leftover markers | None found |

---

## Verification steps after making changes

1. `npm run lint` — zero warnings/errors
2. `npm run check:dead` — knip reports no unused exports from changed files
3. `npm run test:unit` — all tests pass (count will drop when `db.test.js` is deleted)
4. Smoke check: open the app, confirm New Releases tab loads and analysis cache saves/loads
