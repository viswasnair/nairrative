# Nairrative

A personal reading project — a data-driven dashboard that visualises your reading history, surfaces AI-generated insights, and lets you chat with your library.

## Features

- **Overview** — key reading stats, charts by year/genre/author/country, fiction vs non-fiction trends, genre evolution over time
- **Analysis** — ten AI-generated lenses into your library (temporal, geographic, thematic, complexity, discovery, and more), cached by book fingerprint so the API is only called when your library actually changes
- **Library** — searchable, filterable book list backed by Supabase
- **Recommendations** — AI-generated reading suggestions across multiple intent categories (mood, genre, author, challenge, etc.)
- **AI Chat** — RAG-connected chat over your full library; passes both a structured aggregate summary and the complete book list as context
- **Series Recap** — AI-generated series summaries to refresh your memory before the next book

## Tech stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + Vite |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (direct browser calls) |
| Fonts | Playfair Display, DM Sans, Lora (Google Fonts) |

## Local development

```bash
npm install
npm run dev
```

Create `.env.local` with:

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Build

```bash
npm run build
npm run preview
```

The app is built with `base: '/nairrative/'` — all asset paths use `./` relative references.

## Database schema

Books are stored in a `books` table with a `book_authors` join table linking to an `authors` table. Key fields used by the dashboard:

- `title`, `genre` (array), `year_read_start`, `year_read_end`
- `authors` → `name`, `country` (via join)
- `series`, `series_order`, `pages`, `fiction`

## AI caching

Analysis insights are cached in `localStorage` under a fingerprint derived from each book's `id | title | year | genre`. The API is only re-called when a book is added, edited, or removed.
