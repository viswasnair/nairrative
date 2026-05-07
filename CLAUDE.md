# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

Nairrative is a personal reading dashboard — a React SPA deployed on Vercel with a Supabase PostgreSQL backend. It visualizes a reading history with charts, AI-powered analysis, book recommendations, and a chat interface.

## Tech Stack

- **Frontend**: React 19 + Vite, no TypeScript
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
| `useBooks.js` | Book CRUD, modal state, AI fill, genre management |
| `useAnalysis.js` | Analysis AI panels, panel prompts, Supabase cache |
| `useRecs.js` | 15-lens recommendations, intent inputs, Supabase cache |

### Components (`src/components/`)
| File | Tab |
|------|-----|
| `OverviewTab.jsx` | Charts (8 Recharts charts) + KPI cards |
| `LibraryTab.jsx` | Filterable/sortable book table |
| `AnalysisTab.jsx` | 8 AI analysis panels |
| `RecsTab.jsx` | 15 recommendation lenses |
| `SeriesTab.jsx` | Series recap generator |
| `ChatTab.jsx` | Conversational reading assistant |
| `BookModal.jsx` | Add/edit book modal with AI fill |
| `MultiSelect.jsx` | Reusable multi-select dropdown |
| `RangeFilter.jsx` | Chart date range filter |
| `DarkTooltip.jsx` | Recharts tooltip |

### Constants & Utilities (`src/constants/`, `src/lib/`)
- `theme.js` — all colour tokens (`G.gold`, `G.card`, `G.muted`, etc.)
- `config.js` — `TABS`, `INPUT_DEFAULTS`, `DEFAULT_PANEL_PROMPTS` (8 analysis panel prompts), `AUTO_RECS`, `READING_CONTEXT`
- `seeds.js` — `SEED_RECS`, `SEED_ANALYSIS` (fallback data for logged-out users)
- `bookUtils.js` — `buildBookContext`, `downloadCSV`, `downloadJSON`, `stripMd` (strips markdown symbols from AI text before display)
- `supabase.js` — Supabase client
- `api.js` — shared `CLAUDE_URL`, `AI_HEADERS`, and `claudeHeaders(session)` used by all hooks and App.jsx

### API (`api/`)
- `claude.js` — Vercel Edge Function proxying requests to Anthropic API. Reads `ANTHROPIC_API_KEY` from environment. Enforces JWT auth (JWKS), CORS restriction, rate limiting (30 req/min per user), model allowlist, and max_tokens cap.

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
| `recs_cache` | Cached recommendation results (id=1) |
| `analysis_cache` | Cached analysis panel results (id=1) |
| `panel_prompts` | User-customised analysis prompts (id=1) |

### RLS posture
All tables have RLS enabled. `books`, `book_authors` — authenticated only, scoped to `auth.uid() = user_id`. `authors`, `genres` — public SELECT (shared lookup data), authenticated write. Cache tables — public SELECT, authenticated write.

## Development

```bash
npm install
npm run dev           # local dev server (Vite)
npm run build         # production build
npm run lint          # ESLint
npm run audit:ci      # npm audit --audit-level=high (also runs on every Vercel deploy)
npm run test:unit     # Vitest unit + component tests (138 tests, ~5 s)
npm run test:coverage # same + v8 coverage report
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

- `src/hooks/useBooks.js` internals (the hook is integration-tested via Playwright E2E)
- `App.jsx` wiring (covered by E2E)
- Theme constants, seed data, SQL migrations
- One-off scripts in `scripts/`

### Test file locations

```
tests/unit/
  bookUtils.test.js       ← src/lib/bookUtils.js
  textUtils.test.js       ← src/lib/textUtils.js
  apiUtils.test.js        ← api/lib/apiUtils.js
  claudeHeaders.test.js   ← src/lib/api.js
  useAnalysis.test.js     ← src/hooks/useAnalysis.js (cache-save regression)
  useRecs.test.js         ← src/hooks/useRecs.js (cache-save regression)
  MultiSelect.test.jsx    ← src/components/MultiSelect.jsx
  RangeFilter.test.jsx    ← src/components/RangeFilter.jsx
  DarkTooltip.test.jsx    ← src/components/DarkTooltip.jsx
  ChatTab.test.jsx        ← src/components/ChatTab.jsx

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
- **Do not push to Vercel without user approval.**

## Task Tracking

A `TODO.md` file at the project root tracks pending work across sessions.

- **When a new task is requested**: add it to the **Pending** section of `TODO.md` before starting work.
- **When a task is completed**: remove it from `TODO.md`.
- This applies to every Claude Code session in this project, regardless of which tab or conversation window.

## Security

- **API proxy** (`api/claude.js`): JWKS JWT verification, CORS restricted to `nairrative.vercel.app`, rate limit 30 req/min per user, model allowlist, max_tokens hard cap of 2000.
- **Input sanitization** (`useBooks.js`): control characters stripped and length-capped on all prompt inputs; `cover_url` validated to http/https only before saving.
- **Security headers** (`vercel.json`): X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP, HSTS (2yr + preload).
- **Dependabot**: enabled on GitHub for automated CVE alerts.
- **MCP**: Vercel MCP configured via `.mcp.json` for deployment management from Claude Code.
