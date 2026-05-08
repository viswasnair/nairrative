# Nairrative

A personal reading dashboard that turns a book list into a living portrait of your reading life.

## Features

- **Overview** — 8 interactive charts (reading activity, genre breakdown, author origins, fiction/non-fiction split, genre evolution, avg book length, format breakdown) with filterable date ranges, and 9 KPI cards
- **Library** — Filterable, sortable table of all books with CSV/JSON export
- **Analysis** — 8 AI-powered insight panels with customisable prompts and per-panel regeneration (see panel list below)
- **Recommendations** — 15 discovery lenses (more like last book, trending, challenge me, by mood, by genre, pair with a film, and more) — one curated pick each
- **Series** — AI catch-up recaps for any series in your library
- **Chat** — Conversational reading assistant with full access to your book database

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier is sufficient)
- A [Vercel](https://vercel.com) account (free tier is sufficient)
- An [Anthropic API key](https://console.anthropic.com) (for AI features)

### 1. Clone and install

```bash
git clone https://github.com/viswasnair/nairrative.git
cd nairrative
npm install
```

### 2. Create a Supabase project

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and note your **Project URL** and **anon public key**
3. In the SQL editor, paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql) — this creates all tables, constraints, and RLS policies in one shot.

4. In `supabase/schema.sql`, replace the two occurrences of `<YOUR_USER_ID>` with your Supabase `auth.uid()` (find it under **Authentication → Users** after signing up). This allows unauthenticated visitors to browse your reading list publicly.

5. Enable **Email auth** under **Authentication → Providers**

### 3. Set up local environment

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally

```bash
npm run dev
```

The app runs at `http://localhost:5173`. Auth, database reads/writes, and all UI features work locally. **AI features (`/api/claude`) require the Vercel Edge Function** — they will not work with `npm run dev` alone. To run AI features locally, install the [Vercel CLI](https://vercel.com/docs/cli) and use `vercel dev` instead, with `ANTHROPIC_API_KEY` set in your Vercel project environment.

### 5. Deploy to Vercel

1. Push your fork to GitHub
2. Import the repo in the [Vercel dashboard](https://vercel.com/new)
3. Add the following environment variables in **Settings → Environment Variables**:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```

4. Deploy — Vercel auto-deploys on every push to `main`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + Vite |
| Charts | Recharts |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Anthropic Claude API via Vercel Edge Function |
| Fonts | Playfair Display, DM Sans (Google Fonts) |
| Hosting | Vercel |

## Project Structure

```
src/
  App.jsx              # Shell: auth, nav, global styles, hook wiring
  hooks/
    useBooks.js        # Book CRUD, modal, AI fill
    useAnalysis.js     # Analysis panels + caching
    useRecs.js         # 15-lens recommendations + caching
  components/
    OverviewTab.jsx
    LibraryTab.jsx
    AnalysisTab.jsx
    RecsTab.jsx
    SeriesTab.jsx
    ChatTab.jsx
    BookModal.jsx
    MultiSelect.jsx
    RangeFilter.jsx
    DarkTooltip.jsx
  constants/
    theme.js           # Colour tokens
    config.js          # Tabs, prompts, defaults
    seeds.js           # Fallback data for logged-out users
  lib/
    bookUtils.js       # Context builder, CSV/JSON export, stripMd utility
    textUtils.js       # levenshtein, fuzzyMatches, sanitize helpers
    supabase.js        # Supabase client
    api.js             # Shared CLAUDE_URL + claudeHeaders(session)
api/
  claude.js            # Vercel Edge Function → Anthropic API proxy
  lib/
    apiUtils.js        # corsHeaders, checkRateLimit, verifyJWT (edge-safe)
tests/
  unit/                # Vitest unit + component tests (138 tests)
  e2e/                 # Playwright end-to-end tests
supabase/
  tests/               # pgTAP RLS tests (run via npm run test:db)
```

## Development

```bash
npm install
npm run dev             # Vite dev server
npm run build           # Production build
npm run lint            # ESLint
npm run audit:ci        # Dependency vulnerability check (also runs on every Vercel deploy)
npm run test:unit       # Vitest unit + component tests (~5 s, no browser)
npm run test:coverage   # Same with v8 coverage report + per-file thresholds
npm run test:db         # pgTAP RLS tests against linked Supabase project (no Docker needed)
npm run test:security   # Playwright security regression tests against deployed URL
```

AI features (`/api/claude`) require the Vercel Edge Function and won't work in local dev without additional setup.

### CI

Every pull request to `main` runs three jobs in sequence:

1. **Unit & Component Tests** — lint, build, `npm run test:coverage` (enforces per-file coverage floors)
2. **Playwright E2E** — full browser tests against a local Vite dev server
3. **Security Tests** — Playwright tests against the Vercel preview deployment

## Environment Variables

Set in Vercel dashboard:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```

## Security

The `/api/claude` edge function enforces:
- **JWT authentication** — Supabase session token verified via JWKS
- **CORS** — restricted to `nairrative.vercel.app`
- **Rate limiting** — 30 requests/min per user
- **Model allowlist** — only approved Claude models accepted
- **Input sanitization** — control chars stripped, cover URLs validated, prompt inputs length-capped

Security headers (`vercel.json`): X-Frame-Options, CSP, HSTS (2yr + preload), X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

Supabase RLS enforces row-level ownership on all tables — unauthenticated requests cannot read or write any user data.

## Database Schema

Full DDL including all tables, constraints, and RLS policies is in [`supabase/schema.sql`](supabase/schema.sql).

## Analysis Panels

Eight panels arranged in a 2-column grid. Three panels allow temporal references (years); the rest are scoped to patterns and identity:

| Panel | Dimension | Temporal? |
|-------|-----------|-----------|
| Volume & Pace | Reading rhythm — peaks, lulls, gaps | ✓ |
| Migration Over Time | Genre arc across eras | ✓ |
| Recurring Intellectual Preoccupations | Persistent themes across the library | — |
| Life Shapes the List | Inferred life events behind reading clusters | ✓ |
| Stretching vs. Comfort | Balance of challenging vs. accessible reads | — |
| Emotional Fingerprint | Aggregate mood palette of the whole library | — |
| What's Missing | Conspicuous absences given apparent interests | — |
| Last 12 Months | Moving 12-month window with book/page/genre KPIs | — |

Each panel has a customisable prompt (editable per-user, synced via Supabase). Markdown is stripped from all AI output before display.

## AI Caching

Analysis and recommendation results are cached in both `localStorage` and Supabase, keyed by a `booksFingerprint` derived from each book's title and year. The API is only re-called when the library changes.
