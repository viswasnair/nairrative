# Testing

Four independent test suites. Each targets a different layer of the system.

| Suite | Runner | Count | Command |
|-------|--------|-------|---------|
| Unit + Component | Vitest | 572 tests | `npm run test:unit` |
| Type checking | TypeScript `tsc` | — (no emit) | `npm run type:check` |
| Database / RLS | pgTAP | 3 files | `npm run test:db` |
| E2E + Security | Playwright | ~50 tests | `npm run test:security` |

---

## 1. Unit & Component Tests (Vitest)

**Runner**: Vitest + `@testing-library/react` + JSDOM  
**Config**: `vitest.config.js`  
**Setup**: `src/test/setup.js` (imports `@testing-library/jest-dom` matchers)

### Running

```bash
npm run test:unit          # run all 572 tests once
npm run test:coverage      # same + v8 coverage report (enforces per-file floors)
npx vitest --watch         # interactive watch mode
npx vitest tests/unit/bookUtils.test.js  # single file
```

### File → Source mapping

#### Lib utilities

| Test file | Source | What's covered |
|-----------|--------|----------------|
| `bookUtils.test.js` | `src/lib/bookUtils.js` | `toRow` formatting, `buildBookContext` aggregation, `normalizeBook`, `stripMd`, control-character sanitization on all string fields |
| `bookStats.test.js` | `src/lib/bookStats.js` | `computeStats` aggregations, `computeAnalysisInsights` derived values, dynamic era bucket generation |
| `textUtils.test.js` | `src/lib/textUtils.js` | `levenshtein`, `fuzzyMatches`, `sanitizePromptInput` (control chars, length cap), `sanitizeShortInput`, `sanitizeCoverUrl` |
| `authorUtils.test.js` | `src/lib/authorUtils.js` | `fetchAuthorCountry`, `resolveAuthorLinks` — author SELECT/INSERT logic |
| `aiCache.test.js` | `src/lib/aiCache.js` | 3-layer cache: localStorage hit, Supabase hit, full miss; fingerprint validation |
| `aiClient.test.js` | `src/lib/aiClient.js` | `callAI` — fetch called with correct headers/body, throws on non-2xx, `AbortSignal` passed through |
| `analysisPrompts.test.js` | `src/lib/analysisPrompts.js` | `buildAnalysisRequestBody`, `buildRegenerateRequestBody`, `parseAnalysisResponse` |
| `recsPrompts.test.js` | `src/lib/recsPrompts.js` | `buildLensPrompts` — all 15 lens keys present, undefined handling, control-char injection |
| `bookSearch.test.js` | `src/lib/bookSearch.js` | `searchBookCovers` fetch call shape, `coverUrl` URL format |
| `db.test.js` | `src/lib/db.js` | All named DB functions (`getBooks`, `insertBook`, `upsert` cache functions, etc.) — verifies Supabase query chain is correct |
| `auth.test.js` | `src/lib/auth.js` | `getSession`, `signIn`, `signOut`, `onAuthStateChange` — delegates to Supabase, returns/passes through correctly |
| `claudeHeaders.test.js` | `src/lib/api.js` | `LLM_URL` points to `/api/claude`, `claudeHeaders` includes Bearer token when session present |

#### API

| Test file | Source | What's covered |
|-----------|--------|----------------|
| `apiUtils.test.js` | `api/lib/apiUtils.js` | `corsHeaders`, `verifyJWT` (algorithm validation, alg mismatch rejection), `checkRateLimit` (Redis hit/miss/fail-open) |
| `providers.test.js` | `api/lib/providers.js` | Anthropic and OpenAI request normalisation, response normalisation |
| `apiHandler.test.js` | `api/claude.js` | Full handler: OPTIONS preflight, missing auth → 401, invalid model → 400, malformed messages → 400, rate limit exceeded → 429, Anthropic fetch failure → 500 |

#### Hooks

| Test file | Source | What's covered |
|-----------|--------|----------------|
| `useAnalysis.test.js` | `src/hooks/useAnalysis.js` | `savePanelPromptsToSupabase` (session guard, payload shape, no legacy `id:1`), `updatePanelPrompt`/`resetPanelPrompt` state + localStorage, cache load paths, `saveAnalysisToSupabase` (via `regeneratePanel`), AbortError swallowing, signal abort on unmount |
| `useRecs.test.js` | `src/hooks/useRecs.js` | `saveRecsToSupabase` (session guard, `user_id` + `onConflict`, no `id`), `fetchIntentRecs` state update, already-read retry loop (up to 3 attempts, hard-enforcement fallback), cache load filters already-read books and deduplicates across panels, `allocatedTitlesRef` rebuilt on cache load, AbortError swallowing, signal abort on unmount |
| `useBookCRUD.test.js` | `src/hooks/useBookCRUD.js` | `makeDraft` defaults, modal open/edit state, author suggestion flow (fuzzy/exact/accept/dismiss), `saveBook` validation + add/edit success/error paths, `updateBookRating` optimistic update + rollback, `deleteBook` + orphaned-author cleanup |
| `useBooks.test.js` | `src/hooks/useBooks.js` + `src/hooks/useBookCRUD.js` | Modal state, CRUD validation paths, author/genre suggestion helpers, `updateBookRating` optimistic update — all exercised via `useBooks` which composes `useBookCRUD` |

#### Components

| Test file | Source | What's covered |
|-----------|--------|----------------|
| `OverviewTab.test.jsx` | `OverviewTab.jsx` | Renders headings/KPI cards, chart data computation (format breakdown, archetype, genre evolution, mood), memo reactivity on prop change |
| `AnalysisTab.test.jsx` | `AnalysisTab.jsx` | Panel rendering, regenerate button presence, loading state |
| `BookModal.test.jsx` | `BookModal.jsx` | Render in add/edit mode, field binding, AI fill button, genre suggestion acceptance, save/error message display — all via `BookActionsContext.Provider` |
| `LibraryTab.test.jsx` | `LibraryTab.jsx` | Book rows render, filter controls, sorting, empty state — virtualizer mocked to render all items; filter state provided via `LibraryFiltersContext.Provider` in test setup |
| `BookshelfTab.test.jsx` | `BookshelfTab.jsx` | Cover grid render, Hall of Fame rotation |
| `NewReleasesTab.test.jsx` | `NewReleasesTab.jsx` | Release list render, loading state, refresh button |
| `ChatTab.test.jsx` | `ChatTab.jsx` | Message list, input, send button, auth gate |
| `RecsTab.test.jsx` | `RecsTab.jsx` | Lens cards, seed data display, intent input |
| `SeriesTab.test.jsx` | `SeriesTab.jsx` | Series dropdown, generate button, recap display |
| `BookCover.test.jsx` | `BookCover.jsx` | Renders image, fallback picker |
| `RatingFlashcard.test.jsx` | `RatingFlashcard.jsx` | Queue rendering, rating selection, keyboard shortcuts |
| `MultiSelect.test.jsx` | `MultiSelect.jsx` | Open/close, selection, multi-value display |
| `RangeFilter.test.jsx` | `RangeFilter.jsx` | Range input, onChange callback |
| `DarkTooltip.test.jsx` | `DarkTooltip.jsx` | Renders tooltip content |

---

### Key mocking patterns

#### Supabase

All unit tests that touch Supabase mock the client module:

```js
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  },
}))
```

`db.test.js` builds a full chainable query mock:

```js
function makeChain() {
  const chain = { select: vi.fn(), insert: vi.fn(), eq: vi.fn(), ... }
  Object.values(chain).forEach(fn => fn.mockReturnValue(chain))
  return chain
}
supabase.from.mockReturnValue(makeChain())
```

#### Fetch (for AI hooks)

```js
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ content: [{ type: 'text', text: '...' }] }),
}))
// Restore in afterEach:
afterEach(() => vi.unstubAllGlobals())
```

#### @tanstack/react-virtual (LibraryTab)

JSDOM has no real scroll dimensions, so `useVirtualizer` renders 0 items. Mock it to return all items:

```js
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({ index: i, key: i, start: i * estimateSize() })),
    getTotalSize: () => count * estimateSize(),
    measureElement: () => {},
  }),
}))
```

#### BookActionsContext (BookModal)

BookModal reads callbacks from context. Tests must wrap with the provider:

```js
function renderModal(overrides = {}) {
  const actions = { saveBook: vi.fn(), deleteBook: vi.fn(), setBookDraft: vi.fn(), ... }
  return render(
    <BookActionsContext.Provider value={{ ...actions, ...overrides }}>
      <BookModal {...makeProps(overrides)} />
    </BookActionsContext.Provider>
  )
}
```

#### Async hook timing

Hooks that call `supabase.auth.getSession()` before `fetch` require flushing microtasks between the trigger and any assertion on `fetch.mock.calls`:

```js
const flushPromises = () => new Promise(r => setTimeout(r, 0))

act(() => { void result.current.fetchIntentRecs('loved', 'Dune') })
await act(async () => { await flushPromises() })  // lets getSession resolve → fetch gets called
const signal = fetch.mock.calls[0]?.[1]?.signal
```

---

### Coverage

`npm run test:coverage` runs Vitest with v8 coverage and enforces per-file thresholds defined in `vitest.config.js`. The HTML report lands in `coverage/`.

---

## 2. TypeScript Type Checking

**Runner**: `tsc --noEmit`  
**Scope**: `src/lib/**/*.js` only (edge runtime files in `api/lib/` are excluded)  
**Config**: `tsconfig.json` with `checkJs: true`, `noImplicitAny: false`, `strict: false`

```bash
npm run type:check
```

All `src/lib/` utilities have JSDoc `@typedef`, `@param`, and `@returns` annotations. The central `Book` typedef lives in `bookUtils.js`. TypeScript in `checkJs` mode catches: wrong argument types, missing properties, `string - string` arithmetic, and `URLSearchParams` receiving number values.

Full `.ts` migration is future work. This mode catches the most common class of bugs with zero migration cost.

---

## 3. Database / RLS Tests (pgTAP)

**Runner**: pgTAP against the linked Supabase project  
**Config**: `supabase/config.toml` (points to the dev branch)  
**No Docker required** — runs directly against the remote database

```bash
npm run test:db
```

| File | What's tested |
|------|---------------|
| `01_rls_books.test.sql` | `books` and `book_authors` — authenticated users can only read/write their own rows; unauthenticated requests are rejected |
| `02_rls_shared_tables.test.sql` | `genres` and `authors` — public SELECT, authenticated INSERT/UPDATE |
| `03_rls_cache.test.sql` | `analysis_cache`, `recs_cache`, `panel_prompts` — public SELECT (seeds work for logged-out users), authenticated write scoped to `user_id` |

RLS tests use multiple test roles to simulate different auth states. Each test file sets up its own fixtures and tears them down.

> **Warning**: These tests run against the real Supabase dev project, not a local stack. They insert and delete rows. Do not run against the production project.

---

## 4. E2E Tests (Playwright)

**Runner**: Playwright  
**Target**: Local Vite dev server (most tests) + deployed Vercel URL (security tests)  
**Auth**: `tests/e2e/helpers.js` contains login helpers; tests use `.env.local` credentials

```bash
npm run test:security      # runs full Playwright suite
```

### Test files

| File | Scenarios |
|------|-----------|
| `navigation.spec.js` | All tabs load without JS errors; correct tab is active by default; tabs accessible without login (seed data shown) |
| `auth.spec.js` | Login modal opens/closes, valid credentials unlock Add Book button, invalid credentials show error, logout re-locks, session persists on reload |
| `library.spec.js` | Add book via modal (required field validation, save, appears in list), edit book, delete book |
| `analysis.spec.js` | Panels show seed text when logged out; regenerate button triggers a new fetch; custom prompt persists after page reload |
| `recs.spec.js` | 15 lens cards visible; seed recommendations shown when logged out; fetch returns a recommendation on submit |
| `chat.spec.js` | Welcome message shown; send message → AI response appears; Enter key sends; chat disabled when logged out |
| `series.spec.js` | Series dropdown populated; Generate Recap button triggers AI call; recap text appears |
| `security.spec.js` | Runs against deployed Vercel URL. Tests: unauthenticated `/api/claude` returns 401, CORS headers present on allowed origin, disallowed model rejected, rate limiting headers present |

### Key patterns

- `helpers.js` exports `login(page, email, password)` and `logout(page)` for reuse across files.
- Tests that need AI responses stub `fetch` at the network level or use recorded fixtures where possible.
- Security tests are skipped if `PLAYWRIGHT_BASE_URL` is not set (prevents silent pass when no deploy exists).

> **Caution**: E2E tests run against the real (personal) Supabase account. A failed test mid-run can leave orphaned book records. The TODO tracks migrating to a dedicated test account.

---

## 5. Writing New Tests

| You changed… | Add/update here |
|--------------|----------------|
| A function in `src/lib/` | `tests/unit/<filename>.test.js` — same name as the source file |
| A function in `api/lib/` | `tests/unit/<filename>.test.js` |
| The `api/claude.js` handler | `tests/unit/apiHandler.test.js` |
| A component in `src/components/` | `tests/unit/<ComponentName>.test.jsx` |
| `useAnalysis.js` or `useRecs.js` cache/abort behaviour | `tests/unit/useAnalysis.test.js` or `tests/unit/useRecs.test.js` |
| An RLS policy | `supabase/tests/0*.test.sql` (matching table group) |
| A user-visible flow | `tests/e2e/<flow>.spec.js` |

Always run `npm run test:unit` before marking a task done. If new tests fail, fix them — do not skip or comment them out.
