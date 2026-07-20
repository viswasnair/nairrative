# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

Nairrative is a personal reading dashboard — a React SPA deployed on Vercel with a Supabase PostgreSQL backend. It visualizes a reading history with charts, AI-powered analysis, book recommendations, and a chat interface.

## Tech Stack

- **Frontend**: React 19 + Vite, JavaScript with JSDoc types checked via TypeScript `checkJs`
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI**: Anthropic Claude API via Vercel Edge Function (`/api/claude.js`)
- **Deployment**: Vercel (auto-deploys from `main` branch on GitHub)
- **Styling**: Inline styles throughout, theme constants in `src/constants/theme.js`

## Architecture

### Entry point
- `src/main.jsx` → `src/App.jsx` (shell: auth, nav, global CSS, hook wiring)

### Hooks (`src/hooks/`)
| File | Responsibility |
|------|---------------|
| `useBooks.js` | Composition hook — wires `useBookCRUD` + `useGenres` + `useBookAiFill`; owns book fetch + booksFingerprint |
| `useBookCRUD.js` | Modal state + CRUD operations — `openAddModal`, `openEditModal`, `saveBook`, `updateBookRating`, `deleteBook`, author suggestion helpers |
| `useGenres.js` | Genre list/map, addGenre, fuzzy suggestion UI state |
| `useBookAiFill.js` | AI chat-fill (chatFillBook, applyPending), chat loading/pending state |
| `useAnalysis.js` | Analysis AI panels, panel prompts, Supabase cache |
| `useRecs.js` | 15-lens recommendations, intent inputs, Supabase cache |
| `useLibraryFilters.js` | Library filter state (8 dimensions), filteredBooks, allX derived arrays |
| `useAuth.js` | Session, login/logout, login modal state |
| `useChat.js` | Conversational AI chat state, message history, abort handling |

### Components (`src/components/`)
| File | Description |
|------|-------------|
| `OverviewTab.jsx` | Charts (8 Recharts charts) + KPI cards |
| `LibraryTab.jsx` | Filterable/sortable book table (virtualized) |
| `AnalysisTab.jsx` | 8 AI analysis panels |
| `RecsTab.jsx` | 15 recommendation lenses |
| `SeriesTab.jsx` | Series recap generator |
| `ChatTab.jsx` | Conversational reading assistant |
| `BookshelfTab.jsx` | Library subtab — visual cover grid (Hall of Fame + timeline) |
| `NewReleasesTab.jsx` | Library subtab — new releases from the `new_releases` Supabase table |
| `BookModal.jsx` | Add/edit book modal with AI fill |
| `BookCover.jsx` | Cover image with OpenLibrary fallback picker |
| `RatingFlashcard.jsx` | Flashcard-style rating queue for bulk-rating unrated books |
| `ErrorBoundary.jsx` | Per-tab React error boundary (prevents one tab crash from killing the app) |
| `MultiSelect.jsx` | Reusable multi-select dropdown |
| `RangeFilter.jsx` | Chart date range filter |
| `DarkTooltip.jsx` | Recharts tooltip |

### Context (`src/contexts/`)
- `BookActionsContext.jsx` — provides `saveBook`, `deleteBook`, `setBookDraft`, and related callbacks to `BookModal` via context (avoids prop-drilling through the modal's parent chain). Provider is wired in `App.jsx`.
- `AnalysisContext.jsx` — provides all `useAnalysis` values to `AnalysisTab` (panel AI, prompts, loading, edit/view state). Provider is wired in `App.jsx`.
- `RecsContext.jsx` — provides all `useRecs` values to `RecsTab` (intent inputs/results/loading, series recap). Provider is wired in `App.jsx`.
- `LibraryFiltersContext.jsx` — provides all `useLibraryFilters` values plus `allGenres` to `LibraryTab` (filter state, setters, derived arrays, filteredBooks). Provider is wired in `App.jsx`.

### Constants & Utilities (`src/constants/`, `src/lib/`)
- `theme.js` — all colour tokens (`G.gold`, `G.card`, `G.muted`, etc.)
- `config.js` — `TABS`, `DEFAULT_PANEL_PROMPTS` (8 analysis panel prompts), `AUTO_RECS`
- `seeds.js` — `SEED_RECS`, `SEED_ANALYSIS` (fallback data for logged-out users)
- `bookUtils.js` — `buildBookContext`, `downloadCSV`, `downloadJSON`, `stripMd`, `normalizeBook`, `toRow`, `RATING_ORDER`
- `bookStats.js` — `computeStats(books)`, `computeAnalysisInsights(books, stats)` (pure derivations used by App.jsx via `useMemo`)
- `textUtils.js` — `levenshtein`, `fuzzyMatches`, `sanitizePromptInput`, `sanitizeShortInput`, `sanitizeCoverUrl`
- `authorUtils.js` — `fetchAuthorCountry`, `resolveAuthorLinks` (author SELECT/INSERT, country backfill)
- `aiCache.js` — `loadCachedData`, `saveCachedData` (shared 3-layer cache: localStorage → Supabase → null)
- `analysisPrompts.js` — `buildAnalysisRequestBody`, `buildRegenerateRequestBody`, `parseAnalysisResponse`
- `recsPrompts.js` — `buildLensPrompts` (15 lens prompt strings)
- `aiClient.js` — `callAI(messages, options, session)` + `AI_MODELS` (`fast/standard/quality` tiers: Haiku/Sonnet/Opus) — single entry point for all client-side AI fetch calls; swap provider here
- `db.js` — all Supabase data access as named functions (`getBooks`, `insertBook`, `getGenres`, `getPanelPrompts`, etc.) — swap backend here. Note: `getAnalysisCache`, `saveAnalysisCache`, and `saveRecsCache` were removed; cache I/O now goes through `aiCache.js` → `loadCacheRow`/`saveCacheRow`.
- `auth.js` — all Supabase Auth calls (`getSession`, `signIn`, `signOut`, `onAuthStateChange`) — swap auth provider here
- `bookSearch.js` — `searchBookCovers`, `coverUrl` — OpenLibrary cover search adapter; swap book data source here
- `supabase.js` — Supabase client (imported only by `db.js` and `auth.js`)
- `api.js` — `LLM_URL`, `INTER_REQUEST_DELAY_MS`, `claudeHeaders(session)` — request config for the AI proxy, used by `aiClient.js`

### API (`api/`)
- `claude.js` — Vercel Edge Function proxying requests to Anthropic API. Reads `ANTHROPIC_API_KEY` from environment. Enforces JWT auth (JWKS), CORS restriction, rate limiting (30 req/min per user), model allowlist, and max_tokens cap.
- `lib/apiUtils.js` — `corsHeaders`, `checkRateLimit`, `verifyJWT` extracted from `claude.js` for unit testability. Edge-runtime safe (no Node.js APIs).

## Analysis Panels

Eight panels in a 2-column grid (`AnalysisTab.jsx`). Prompts live in `DEFAULT_PANEL_PROMPTS` (`config.js`) and are synced per-user via the `panel_prompts` Supabase table.

| Key | Title | Temporal refs allowed? |
|-----|-------|----------------------|
| `temporal` | Volume & Pace | ✓ |
| `genre` | Migration Over Time | ✓ |
| `thematic` | Recurring Intellectual Preoccupations | — |
| `contextual` | Life Shapes the List | ✓ |
| `complexity` | Stretching vs. Comfort | — |
| `emotional` | Emotional Fingerprint | — |
| `blindspots` | What's Missing | — |
| `recent` | Last 12 Months | — |

**Design rules:**
- `temporal`, `genre`, `contextual` are the only panels permitted to reference specific years — enforced via a `CRITICAL` note in the system prompt.
- `recent` sends only books where `year_read_end >= currentYear - 1` to the model (filtered in `useAnalysis.js`).
- All AI text (analysis + recs) passes through `stripMd()` before rendering to strip any markdown symbols.
- Non-temporal panels instruct the model: `"Do not reference or cite any specific years."`

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `books` | Main book records |
| `authors` | Author lookup table |
| `book_authors` | Book↔author join table |
| `genres` | Genre list with colour codes |
| `recs_cache` | Cached recommendation results, one row per user |
| `analysis_cache` | Cached analysis panel results, one row per user |
| `panel_prompts` | User-customised analysis prompts, one row per user |
| `new_releases` | Curated new releases; populated/refreshed by a Supabase Edge Function (`check-releases`) |

### RLS posture
All tables have RLS enabled. `books`, `book_authors` — authenticated only, scoped to `auth.uid() = user_id`. `authors`, `genres` — public SELECT (shared lookup data), authenticated write. Cache tables (`recs_cache`, `analysis_cache`, `panel_prompts`) — public SELECT, authenticated write scoped to `auth.uid() = user_id`; upserted with `onConflict: "user_id"`.

## Development

```bash
npm install
npm run dev           # local dev server (Vite)
npm run build         # production build
npm run lint          # ESLint
npm run audit:ci      # npm audit --audit-level=high (also runs on every Vercel deploy)
npm run test:unit     # Vitest unit + component tests (543 tests, ~8 s)
npm run test:coverage # same + v8 coverage report
npm run type:check    # TypeScript type-check (checkJs) — src/lib only, no emit
npm run test:db       # pgTAP RLS tests against linked Supabase dev project (no Docker needed)
npm run test:security # Playwright security regression tests (requires deployed URL)
```

Note: AI features (`/api/claude`) require Vercel deployment — they won't work locally without a local serverless runtime.

## Testing Requirements

**These rules apply to every code change made in this repository.**

### When to write or update tests

| Change type | Required action |
|-------------|----------------|
| New function in `src/lib/` or `api/lib/` | Add cases to the corresponding `tests/unit/*.test.js` file |
| Modified function in `src/lib/` or `api/lib/` | Update existing cases; add cases for new behaviour |
| New reusable component in `src/components/` | Add a `tests/unit/<Component>.test.jsx` file covering: render, props, user interactions |
| Modified component behaviour | Update the corresponding `tests/unit/<Component>.test.jsx` |
| Hook change that affects Supabase cache saves | Add/update regression cases in `tests/unit/useAnalysis.test.js` or `tests/unit/useRecs.test.js` |
| RLS policy added, removed, or changed | Add/update the relevant `supabase/tests/0*.test.sql` file |
| New private helper extracted to a utility file | Add unit tests before the extraction is considered complete |

### After any code change

Always run `npm run test:unit` before considering a task done. If tests fail, fix them — do not skip or comment them out.

### What does NOT need a unit test

- `App.jsx` wiring (covered by E2E)
- Theme constants, seed data, SQL migrations
- One-off scripts in `scripts/`

### Test file locations

```
tests/unit/
  — Lib utilities —
  bookUtils.test.js         ← src/lib/bookUtils.js
  bookStats.test.js         ← src/lib/bookStats.js
  textUtils.test.js         ← src/lib/textUtils.js
  authorUtils.test.js       ← src/lib/authorUtils.js
  aiCache.test.js           ← src/lib/aiCache.js
  aiClient.test.js          ← src/lib/aiClient.js
  analysisPrompts.test.js   ← src/lib/analysisPrompts.js
  recsPrompts.test.js       ← src/lib/recsPrompts.js
  bookSearch.test.js        ← src/lib/bookSearch.js
  db.test.js                ← src/lib/db.js
  auth.test.js              ← src/lib/auth.js
  claudeHeaders.test.js     ← src/lib/api.js

  — API —
  apiUtils.test.js          ← api/lib/apiUtils.js
  providers.test.js         ← api/lib/providers.js
  apiHandler.test.js        ← api/claude.js (full handler integration)

  — Hooks —
  useAnalysis.test.js       ← src/hooks/useAnalysis.js (cache-save + abort regression)
  useRecs.test.js           ← src/hooks/useRecs.js (cache-save + abort regression)
  useBookCRUD.test.js       ← src/hooks/useBookCRUD.js (modal state, saveBook, updateBookRating, deleteBook)
  useBooks.test.js          ← src/hooks/useBooks.js (key CRUD paths)

  — Components —
  AnalysisTab.test.jsx      ← src/components/AnalysisTab.jsx
  BookCover.test.jsx        ← src/components/BookCover.jsx
  BookModal.test.jsx        ← src/components/BookModal.jsx
  BookshelfTab.test.jsx     ← src/components/BookshelfTab.jsx
  ChatTab.test.jsx          ← src/components/ChatTab.jsx
  DarkTooltip.test.jsx      ← src/components/DarkTooltip.jsx
  LibraryTab.test.jsx       ← src/components/LibraryTab.jsx
  MultiSelect.test.jsx      ← src/components/MultiSelect.jsx
  NewReleasesTab.test.jsx   ← src/components/NewReleasesTab.jsx
  OverviewTab.test.jsx      ← src/components/OverviewTab.jsx
  RangeFilter.test.jsx      ← src/components/RangeFilter.jsx
  RatingFlashcard.test.jsx  ← src/components/RatingFlashcard.jsx
  RecsTab.test.jsx          ← src/components/RecsTab.jsx
  SeriesTab.test.jsx        ← src/components/SeriesTab.jsx

tests/e2e/
  navigation.spec.js        ← tab navigation, loading, public access
  auth.spec.js              ← login/logout, session gating
  library.spec.js           ← add/edit/delete books via modal
  analysis.spec.js          ← panel regeneration, prompt persistence
  recs.spec.js              ← lens fetching, seed vs live results
  chat.spec.js              ← send messages, AI response
  series.spec.js            ← recap generation
  security.spec.js          ← API security (deployed URL required)

supabase/tests/
  01_rls_books.test.sql         ← books + book_authors RLS
  02_rls_shared_tables.test.sql ← genres + authors RLS
  03_rls_cache.test.sql         ← analysis_cache, recs_cache, panel_prompts RLS
```

## Environment Variables

Set in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

## Key Patterns

- **Caching**: All AI results cached in localStorage + Supabase. Cache keyed by `booksFingerprint` (hash of book titles/years).
- **Auth**: Single-user Supabase auth. Logged-out users see seed data; AI features require session.
- **`lastAddedAt` pattern**: `useBooks` exposes a timestamp that `useAnalysis` watches to trigger re-analysis after a new book is added, avoiding circular hook dependencies.
- **Styling**: All inline styles using `G.*` colour tokens. No CSS modules or Tailwind. Global CSS injected via a `<style>` tag from the module-level `css` constant in `App.jsx`.
- **Performance**: Tab switches use `useTransition` (interruptible renders); `stats` and `analysisInsights` memos consume `useDeferredValue(books)` so heavy computation runs at lower priority and doesn't block paint.
- **LibraryTab virtualization**: `@tanstack/react-virtual` `useVirtualizer` renders only the visible rows in the book table. Tests mock the virtualizer to return all items (JSDOM has no scroll dimensions).
- **BookActionsContext**: `BookModal` receives callbacks (`saveBook`, `deleteBook`, `setBookDraft`, etc.) via context rather than props to avoid drilling through intermediate components. Provider lives in `App.jsx`.
- **Adapter pattern**: All Supabase data access is channelled through `src/lib/db.js`, all Auth calls through `src/lib/auth.js`, all AI calls through `src/lib/aiClient.js`, and OpenLibrary calls through `src/lib/bookSearch.js`. To swap any backend, replace only the adapter's internals — hook and component code stays unchanged.
- **AbortController cleanup**: Every AI hook (`useAnalysis`, `useRecs`, `useChat`, `useBookAiFill`) creates an `AbortController` on mount, passes its `signal` into `callAI()`, and calls `abort()` in the `useEffect` cleanup. This prevents state updates on unmounted components and cancels in-flight requests on tab switch.
- **Do not push to Vercel without user approval.**

## Task Tracking

A `TODO.md` file at the project root tracks pending work across sessions.

- **When a new task is requested**: add it to the **Pending** section of `TODO.md` before starting work.
- **When a task is completed**: remove it from `TODO.md`.
- This applies to every Claude Code session in this project, regardless of which tab or conversation window.

## Documentation

**Every significant code change must be reflected in documentation before the task is considered done.** This is not optional.

### Which files to check

| File | Update when… |
|------|-------------|
| `CLAUDE.md` (this file) | Architecture changes, new patterns, new hard rules, new commands, new files added to `src/lib/` or `src/hooks/`, new components |
| `README.md` | New user-visible features, new dev commands, tech stack changes, project structure additions |
| `ARCHITECTURE.md` + `architecture.html` | New hooks, components, adapter files, Supabase tables, external service connections, or data flow changes |
| `TESTING.md` | New test suites, new test file → source mappings, new testing patterns or gotchas; update test count in suite overview table |

### What counts as "significant"

Update if someone reading the file would be **misled** or **miss something important**: a new file in the architecture, a removed export, a new table, a changed data flow, a new testing pattern, a fixed review issue. Do **not** update for minor refactors, renamed variables, comment changes, or anything immediately self-evident from the code.

## Security

- **API proxy** (`api/claude.js`): JWKS JWT verification, CORS restricted to `nairrative.vercel.app`, rate limit 30 req/min per user, model allowlist, max_tokens hard cap of 2000.
- **Input sanitization** (`src/lib/textUtils.js`): control characters stripped and length-capped on all prompt inputs; `cover_url` validated to http/https only before saving. Helpers imported by `useBooks.js`.
- **Security headers** (`vercel.json`): X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP, HSTS (2yr + preload).
- **Dependabot**: enabled on GitHub for automated CVE alerts.
- **MCP**: Vercel MCP configured via `.mcp.json` for deployment management from Claude Code.

## Coding Rules — Do Not Break These

These rules exist because vibecoded patterns introduced each of them as subtle bugs. Treat them as hard constraints, not style suggestions.

### Error handling

**In API route handlers (`api/`):**
- Never return `err.message`, `err.stack`, or any raw exception property in an HTTP response body.
- The catch block in `api/claude.js` must return a generic message: `"AI service temporarily unavailable"`.
- Log real errors server-side with `console.error` or `securityLog`. The client must not learn why the server failed.
- Good: `return new Response("AI service temporarily unavailable", { status: 500, headers: cors });`
- Bad: `return new Response(JSON.stringify({ error: err.message }), { status: 500 ... })`

**In frontend hooks (`src/hooks/`):**
- Never pass `e.message` or `JSON.stringify(e)` into user-visible state (e.g. `setBookMsg`).
- Raw Supabase errors contain constraint names, table names, and query fragments — these must not reach the UI.
- Show users a generic message: `"Something went wrong. Please try again."` Log details with `console.error`.
- Good: `setBookMsg("Something went wrong. Please try again."); console.error("saveBook error:", e);`
- Bad: `setBookMsg(\`Error: ${e?.message || JSON.stringify(e)}\`);`

**Propagating API errors through the UI:**
- If an API response contains `data.error`, do not expose `data.error.message` or `data.error.type` in any user-visible field (including recommendation "reason" strings).
- Log details to console; show a generic placeholder to the user.

### API input validation (`api/claude.js`)

Before forwarding any request body to the Anthropic API, validate:
- `body.messages` is a non-empty array.
- `body.max_tokens`, if present, is a positive integer (not a string, not negative, not a float).
- `body.model`, if present, is a string before calling `.has()` on it.

Malformed payloads that pass through unvalidated reach Anthropic and can cause confusing failures. Validate at the boundary; reject early with a 400.

### Supabase data access — defense-in-depth

All reads from user-scoped tables (`books`, `analysis_cache`, `recs_cache`, `panel_prompts`) **must** include an explicit `.eq("user_id", session.user.id)` filter in addition to relying on RLS.

RLS is the primary enforcement layer, but it is a single point of failure: a migration that accidentally disables or misconfigures a policy would silently expose all users' data if there is no application-layer filter. The `.eq()` filter is cheap and makes isolation redundant.

- **Never** query a user-scoped table without an explicit user_id filter when a session exists.
- Writes already set `user_id: session.user.id` on insert and use `onConflict: "user_id"` on upsert — reads must follow the same pattern.

Example:
```js
// Good
supabase.from("books").select("...").eq("user_id", session.user.id)

// Bad — relies on RLS alone
supabase.from("books").select("...")
```

### Rate limiting

The rate limiter (`api/lib/apiUtils.js`) uses Upstash Redis — this is correct for a serverless environment. **Do not replace it with an in-memory `Map`**. In-memory state is reset on every Vercel function invocation; an in-memory rate limiter accepts every request regardless of frequency because it never sees more than one request per process lifetime.

If Redis is unreachable, the implementation fails closed (blocks the request with 429). This means AI features are temporarily unavailable during a Redis outage, which is the preferred behaviour over allowing unlimited LLM calls.

### File size discipline

`useBooks.js` has been modularised: author resolution lives in `authorUtils.js`, genre management in `useGenres.js`, and AI chat-fill in `useBookAiFill.js`. Keep each file under ~300 lines. If any hook or lib file approaches that limit, extract the next logical unit before adding more code.
