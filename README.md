# Nairrative

A personal reading dashboard that turns a book list into a living portrait of your reading life.

## Features

- **Overview** — 8 interactive charts (reading activity, genre breakdown, author origins, fiction/non-fiction split, genre evolution, avg book length, format breakdown) with filterable date ranges, and 9 KPI cards
- **Library** — Filterable, sortable table of all books with CSV/JSON export
- **Analysis** — 6 AI-powered insight panels (temporal, genre, thematic, contextual, complexity, emotional arc) with customisable prompts and per-panel regeneration
- **Recommendations** — 15 discovery lenses (more like last book, trending, challenge me, by mood, by genre, pair with a film, and more) — one curated pick each
- **Series** — AI catch-up recaps for any series in your library
- **Chat** — Conversational reading assistant with full access to your book database

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
    bookUtils.js       # Context builder, CSV/JSON export
    supabase.js        # Supabase client
    api.js             # Shared CLAUDE_URL + AI_HEADERS constants
api/
  claude.js            # Vercel Edge Function → Anthropic API proxy
```

## Development

```bash
npm install
npm run dev
npm run build
```

AI features (`/api/claude`) require the Vercel Edge Function and won't work in local dev without additional setup.

## Environment Variables

Set in Vercel dashboard:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```

## Database Schema

Books are stored in a `books` table with a `book_authors` join table linking to an `authors` table. Key fields:

- `title`, `genre` (array), `year_read_start`, `year_read_end`
- `authors` → `name`, `country` (via join)
- `series`, `pages`, `fiction`, `format`, `notes`

Additional tables: `genres` (colour codes), `recs_cache`, `analysis_cache`, `panel_prompts`.

## AI Caching

Analysis and recommendation results are cached in both `localStorage` and Supabase, keyed by a `booksFingerprint` derived from each book's title and year. The API is only re-called when the library changes.
