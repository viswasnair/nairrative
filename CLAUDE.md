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
| `AnalysisTab.jsx` | 6 AI analysis panels |
| `RecsTab.jsx` | 15 recommendation lenses |
| `SeriesTab.jsx` | Series recap generator |
| `ChatTab.jsx` | Conversational reading assistant |
| `BookModal.jsx` | Add/edit book modal with AI fill |
| `MultiSelect.jsx` | Reusable multi-select dropdown |
| `RangeFilter.jsx` | Chart date range filter |
| `DarkTooltip.jsx` | Recharts tooltip |

### Constants & Utilities (`src/constants/`, `src/lib/`)
- `theme.js` — all colour tokens (`G.gold`, `G.card`, `G.muted`, etc.)
- `config.js` — `TABS`, `INPUT_DEFAULTS`, `DEFAULT_PANEL_PROMPTS`, `AUTO_RECS`, `READING_CONTEXT`
- `seeds.js` — `SEED_RECS`, `SEED_ANALYSIS` (fallback data for logged-out users)
- `bookUtils.js` — `buildBookContext`, `downloadCSV`, `downloadJSON`
- `supabase.js` — Supabase client
- `api.js` — shared `CLAUDE_URL`, `AI_HEADERS`, and `claudeHeaders(session)` used by all hooks and App.jsx

### API (`api/`)
- `claude.js` — Vercel Edge Function proxying requests to Anthropic API. Reads `ANTHROPIC_API_KEY` from environment. Enforces JWT auth (JWKS), CORS restriction, rate limiting (30 req/min per user), model allowlist, and max_tokens cap.

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
npm run test:security # Playwright security regression tests (requires deployed URL)
```

Note: AI features (`/api/claude`) require Vercel deployment — they won't work locally without a local serverless runtime.

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
