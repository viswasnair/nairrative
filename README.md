# Nairrative

A personal reading dashboard — visualises reading history, surfaces AI-generated insights, and lets you chat with your library.

## Features

- **Overview** — key stats and charts by year, genre, author, and country; fiction vs non-fiction trends; genre evolution over time
- **Analysis** — nine AI-generated lenses (temporal, genre, geographic, author, thematic, contextual, complexity, emotional, discovery), cached by book fingerprint so the API is only called when your library actually changes
- **Library** — searchable, filterable book list backed by Supabase
- **Recommendations** — AI-generated suggestions across ten intent categories (mood, genre, author, challenge, etc.)
- **Series Recap** — AI-generated series summaries to refresh your memory before the next book
- **AI Chat** — chat over your full library; passes both a structured aggregate summary and the complete book list as context

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + Vite |
| Charts | Recharts |
| Database + Auth | Supabase (PostgreSQL) |
| AI | Anthropic Claude (via Vercel Edge Function proxy) |
| Deployment | Vercel |
| Fonts | Playfair Display, DM Sans, Lora (Google Fonts) |

## Local development

```bash
npm install
npm run dev
```

Create `.env.local` with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Set `ANTHROPIC_API_KEY` in your Vercel project settings (server-side only — never exposed to the browser).

## Build & deploy

```bash
npm run build    # production build → dist/
npm run preview  # serve dist/ locally
```

Deploys to Vercel. `vercel.json` configures SPA fallback routing so all paths resolve to `index.html`. The `api/claude.js` edge function proxies requests to the Anthropic API so the API key stays server-side.

## Database schema

| Table | Purpose |
|-------|---------|
| `books` | Core book records — title, genre (array), year_read_start, year_read_end, fiction, series, pages, notes |
| `authors` | Author records — name, country |
| `book_authors` | Join table — links books to authors with author_order (supports multiple authors) |
| `genres` | Genre list with display colour and sort order |
| `analysis_cache` | Persists AI analysis across devices (JSONB) |
| `recs_cache` | Persists AI recommendations across devices (JSONB) |
| `panel_prompts` | User-customisable prompts for each analysis panel (JSONB) |

## AI caching

Analysis and recommendations are cached in `localStorage` under a fingerprint derived from each book's `id | title | year | genre`. The API is only re-called when a book is added, edited, or removed. Results are also written to Supabase cache tables for cross-device persistence, with pre-generated seed data as a final fallback.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/generate-analysis.mjs` | Regenerates AI analysis seeds — fetches books from Supabase, calls Claude, prints JSON |
| `scripts/generate-recs.mjs` | Regenerates AI recommendation seeds |
| `scripts/process_books.py` | Parses raw book data from a spreadsheet (openpyxl) |
| `scripts/generate_sql.py` | Converts processed book data into SQL inserts for Supabase |
