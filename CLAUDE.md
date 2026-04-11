# CLAUDE.md

This file provides guidance for AI assistants working on the Nairrative codebase.

---

## Project Overview

**Nairrative** is a personal reading dashboard for a single user. It visualises a reading history of ~345 books and surfaces AI-generated insights via Anthropic Claude.

Six tabs:
| Tab | Purpose |
|-----|---------|
| Overview | Stats, charts by year/genre/author/country |
| Analysis | 9 AI-generated lenses (temporal, genre, geographic, author, thematic, contextual, complexity, emotional, discovery) |
| Library | Searchable/filterable book list backed by Supabase |
| Recommendations | AI-generated suggestions across 10 intent categories |
| Series Recap | AI-generated series summaries |
| AI Chat | RAG-connected chat — passes aggregate summary + full book list as context |

---

## Tech Stack

| Layer | Technology | Key File |
|-------|-----------|----------|
| UI framework | React 19 | `src/App.jsx`, `src/main.jsx` |
| Build tool | Vite 8 | `vite.config.js` |
| Charts | Recharts 3 | `src/App.jsx` |
| Styling | Inline styles + CSS variables | `src/constants/theme.js`, `src/index.css` |
| Database + Auth | Supabase (PostgreSQL) | `src/lib/supabase.js` |
| AI API | Anthropic Claude | `api/claude.js` |
| Deployment | Vercel (Edge Functions) | `vercel.json` |
| Data processing | Python (`openpyxl`) + Node.js ESM | `scripts/` |

---

## Repository Structure

```
nairrative/
├── api/
│   └── claude.js              # Vercel Edge Function — proxies requests to Anthropic API
├── public/                    # Static assets (favicons, PNGs)
├── scripts/
│   ├── generate-analysis.mjs  # CLI: regenerate AI analysis → stdout JSON for seeds.js
│   ├── generate-recs.mjs      # CLI: regenerate AI recommendations → stdout JSON for seeds.js
│   ├── process_books.py       # Python: parse raw book spreadsheet (openpyxl)
│   └── generate_sql.py        # Python: emit SQL inserts from processed book data
├── src/
│   ├── App.jsx                # Entire UI + all business logic (~1900 lines, monolithic)
│   ├── main.jsx               # React root renderer
│   ├── index.css              # Global CSS resets and mobile breakpoints
│   ├── constants/
│   │   ├── config.js          # READING_CONTEXT, TABS, AUTO_RECS, DEFAULT_PANEL_PROMPTS, INPUT_DEFAULTS
│   │   ├── seeds.js           # SEED_ANALYSIS, SEED_RECS — pre-generated AI output fallbacks
│   │   └── theme.js           # Color palette object G (used everywhere as G.gold, G.card, etc.)
│   └── lib/
│       └── supabase.js        # Supabase client (reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
├── index.html
├── eslint.config.js
├── vite.config.js
├── vercel.json
└── package.json
```

---

## Local Development

### Environment variables

Create `.env.local` in the repo root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For the Claude API proxy edge function, set in Vercel project settings (server-side only, never exposed to client):

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Commands

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server (http://localhost:5173)
npm run build      # production build → dist/
npm run preview    # serve the built dist/ locally
npm run lint       # run ESLint
```

No test framework is configured — there are no unit or integration tests.

---

## Architecture

### Monolithic component

`src/App.jsx` is a single React component of ~1900 lines. It contains:
- All state (30+ `useState` hooks)
- All business logic (data fetching, normalization, caching)
- All UI (every tab, modal, chart, and form)
- Inline sub-components defined at the top of the file: `MultiSelect`, `RangeFilter`, `DarkTooltip`

**Do not split this component into smaller files unless the user explicitly requests refactoring.** The monolith is intentional for this personal project.

### State management

No external state manager (no Redux, Zustand, Context API). All state lives in the top-level `App` component via `useState`. Derived data is computed with `useMemo`.

### Tab-based navigation

Tabs are controlled by an `activeTab` state string. Each tab renders conditionally. There is no client-side router.

### Data normalization

Raw Supabase rows include nested joins. The `normalizeBook(b)` function (top of `App.jsx`) flattens them:

```js
// Input: { ...bookRow, book_authors: [{ author_order, authors: { name, country } }] }
// Output: { ...bookRow, author: "Name", authors: [...], country: "India", year: 2024, genre: ["Fantasy"] }
```

Always use `normalizeBook` when processing Supabase book rows.

---

## Styling Conventions

### Inline styles

All component styling uses inline style objects. There are no CSS modules, Tailwind classes, or styled-components.

```jsx
// Correct
<div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8 }}>

// Wrong — do not add class names unless adding a new mobile breakpoint to index.css
<div className="card">
```

### Theme colors

Import and use the `G` object from `src/constants/theme.js`:

```js
import G from "./constants/theme";

// Available keys:
G.gold       // primary accent (#2d6a4f, dark green)
G.goldLight  // lighter accent
G.goldDim    // dimmed accent
G.copper     // secondary accent (#c0522a)
G.bg         // page background
G.card       // card/surface background
G.card2      // secondary surface (inputs, alternate rows)
G.border     // borders
G.text       // primary text
G.muted      // secondary/placeholder text
G.dimmed     // disabled/subtle text
G.hover      // hover state background
```

Never use hardcoded hex colours — always reference `G.*`.

---

## Data Model

### Supabase tables

| Table | Key fields |
|-------|-----------|
| `books` | `id`, `user_id`, `title`, `genre` (array), `year_read_start`, `year_read_end`, `format`, `fiction`, `series`, `series_order`, `pages`, `notes`, `user_added` |
| `authors` | `id`, `name`, `country` |
| `book_authors` | `book_id`, `author_id`, `author_order` (join table, supports multiple authors per book) |
| `genres` | `id`, `name`, `color`, `sort_order` |
| `analysis_cache` | `id`, `data` (JSONB) — cross-device AI analysis cache |
| `recs_cache` | `id`, `data` (JSONB) — cross-device recommendations cache |
| `panel_prompts` | `id`, `data` (JSONB) — user-customisable AI panel prompts |

### Standard book select query

```js
supabase
  .from("books")
  .select("*, book_authors(author_order, authors(id, name, country))")
  .order("year_read_end", { ascending: true })
```

Always pass the result through `normalizeBook()`.

---

## Claude API Integration

### Request flow

```
Browser (App.jsx)
  → POST /api/claude  (JSON body)
    → Vercel Edge Function (api/claude.js)
      → POST https://api.anthropic.com/v1/messages
        ← response streamed back
```

The edge function is a thin proxy. It reads `ANTHROPIC_API_KEY` from environment and forwards the raw request body unchanged.

### Making a Claude API call (client-side)

```js
const res = await fetch("/api/claude", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",   // or "claude-haiku-4-5-20251001" for speed
    max_tokens: 1200,
    system: "System prompt...",
    messages: [{ role: "user", content: "..." }],
  }),
});
const data = await res.json();
const text = data.content?.[0]?.text ?? "";
```

### Models in use

| Use case | Model |
|----------|-------|
| Chat, recommendations, series recap | `claude-sonnet-4-6` |
| Seed script generation (offline) | `claude-opus-4-6` |
| Fast/lightweight tasks | `claude-haiku-4-5-20251001` |

### Context building

The app passes rich reading context to every Claude call by combining:
1. `READING_CONTEXT` — a hardcoded narrative profile from `src/constants/config.js`
2. A dynamically built aggregate summary (counts by year/genre/author/country)
3. The full book list formatted as one line per book

Always include the warning from `READING_CONTEXT` about year 2010 (it is a collective placeholder for 1998–2010, not a real single year).

---

## Caching Strategy

Three-layer cache with automatic fallback:

```
1. localStorage (fingerprint-keyed)
   ↓ miss or stale
2. Supabase cache tables (analysis_cache, recs_cache)
   ↓ miss
3. Seed data (SEED_ANALYSIS, SEED_RECS in src/constants/seeds.js)
```

### Fingerprint

The fingerprint is derived from the current book list:

```js
const fingerprint = books
  .map(b => `${b.id}|${b.title}|${b.year}|${(b.genre || []).join("")}`)
  .join(",");
```

If the fingerprint matches what is stored in `localStorage`, the cached result is used and no API call is made. When a book is added, edited, or deleted the fingerprint changes and the cache is invalidated.

### Seed regeneration

When seeds need updating after significant library changes:

```bash
# Regenerate analysis seeds (writes JSON to stdout)
ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-analysis.mjs > tmp-analysis.json

# Regenerate recommendations seeds
ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-recs.mjs > tmp-recs.json
```

Then copy the output into `src/constants/seeds.js` as `SEED_ANALYSIS` and `SEED_RECS`.

---

## Scripts

| Script | Language | Purpose |
|--------|----------|---------|
| `scripts/generate-analysis.mjs` | Node.js ESM | Fetches all books from Supabase, calls Claude for each of 9 analysis dimensions, prints JSON |
| `scripts/generate-recs.mjs` | Node.js ESM | Fetches all books from Supabase, calls Claude for each recommendation category, prints JSON |
| `scripts/process_books.py` | Python | Parses raw Excel/CSV book data using `openpyxl` |
| `scripts/generate_sql.py` | Python | Converts processed book data into SQL `INSERT` statements for Supabase |

---

## Deployment

The app deploys to Vercel:

- `dist/` (Vite build output) is served as a static site
- `api/claude.js` is deployed as a Vercel Edge Function
- `vercel.json` configures SPA fallback routing:
  ```json
  { "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]}
  ```
- `vite.config.js` sets `base: "/"` — all asset paths are root-relative

---

## Linting & Code Quality

ESLint v9 flat config (`eslint.config.js`):
- Extends `@eslint/js` recommended + react-hooks + react-refresh
- `no-unused-vars` is set to `error` but **uppercase/PascalCase identifiers are exempt** (pattern `^[A-Z_]`), so exported constants like `SEED_ANALYSIS` do not trigger warnings even if locally unused
- No Prettier — formatting is informal and consistent by convention

Run: `npm run lint`

---

## Key Conventions for AI Assistants

1. **Keep the monolith intact.** Do not extract components to new files unless the user asks for a refactor. Add new UI sections inside `App.jsx`.

2. **Inline styles only.** Never add CSS classes or create `.module.css` files. Use style objects with `G.*` tokens.

3. **Use `G.*` for all colors.** Never write a hex value directly into JSX. Import `G` from `./constants/theme` and reference named tokens.

4. **Respect the fingerprint cache.** If you add a feature that changes what data should be cached (analysis, recs), invalidate or update the fingerprint accordingly so stale cache is not returned.

5. **No test files.** There is no test framework. Do not create test files or suggest adding one unless the user requests it.

6. **Claude API calls go through `/api/claude`.** Never call `https://api.anthropic.com` directly from the browser; always use the edge function proxy.

7. **`normalizeBook()` is the single source of truth** for shaping a Supabase book row. If you add new book fields, update `normalizeBook()` so the rest of the app sees them consistently.

8. **Year 2010 is a placeholder**, not a real single-year reading period. Never describe it as a peak or anomaly in prompts or UI copy.

9. **`READING_CONTEXT` is the canonical reader profile.** If the user updates their reading history significantly, update this constant in `src/constants/config.js` to keep AI prompts accurate.

10. **Auth is Supabase email/password.** The session is stored in React state (`session`) and synced via `supabase.auth.onAuthStateChange()`. Write operations on books should check `session` before proceeding.
