# Nairrative — Pending Tasks

Tasks are added here as they come up in chat. Completed tasks are removed.

## Pending

- [ ] Support for multiple users
- [ ] Push content to AWS infrastructure
  - Depends on: Multi-user data model design (authors/genres ownership decision)
  - Depends on: Fix `authors` table write RLS
  - Depends on: Remove `script-src 'unsafe-inline'` from CSP
  - Note: Global rate limiting and security event logging should be solved in AWS (API Gateway + CloudWatch), not before
- [ ] Support for movies

## Multi-User Support

### Critical (crashes / garbage output for new users)
- [ ] **AnalysisTab** — fix `Math.min/max()` on empty books array (renders `-Infinity years`)
- [ ] **`buildBookContext()`** — guard against 0 books producing `NaN%` fiction ratio
- [ ] **RecsTab** — `books[books.length - 1]` on empty array renders `undefined` as sublabel

### High (broken UX)
- [ ] **Seed data disclaimers** — `SEED_ANALYSIS` and `SEED_RECS` are silently shown to new users as if personalized; add "this is a sample" messaging
- [ ] **OverviewTab charts** — all 8 charts render blank with no empty-state or CTA to add books
- [ ] **OverviewTab KPI cards** — all 9 show `—`/`0` with no "get started" context
- [ ] **LibraryTab** — no empty-state message when user has 0 books and no filters active
- [ ] **Hall of Fame** — silently disappears; replace `return null` with "Rate books to build your Hall of Fame"

### Medium (missing guidance)
- [ ] **Onboarding** — no welcome flow; new users land on Overview with no first-book prompt
- [ ] **RecsTab auto-lenses** — auto-fetch fires on 0 books; add a minimum book count guard
- [ ] **AnalysisTab panels** — show seed data with no disclaimer for new users
- [ ] **BookshelfTab timeline/mosaic** — renders empty with no message
- [ ] **RelationshipGraph** — visible but non-functional with 0 books; add guidance message
- [ ] **Chat suggestion chips** — questions like "peak reading years?" are nonsensical for 0 books

### Low (polish)
- [ ] **NewReleasesTab** — empty message doesn't explain that books are required
- [ ] **SeriesTab** — empty-state message buried at bottom, not prominent

---

## Security (red teaming)

- [ ] Remove `script-src 'unsafe-inline'` from CSP in `vercel.json` — verify Vite production build emits no inline scripts, then drop it. Meaningful XSS protection improvement.
- [ ] Fix `authors` table write RLS — any authenticated user can currently update/delete any author row. Low risk now (single user), becomes a gap if multi-user is added.
- [ ] Global rate limiting via Upstash Redis — current in-memory rate limit resets on cold starts and doesn't share state across Vercel edge instances.
- [ ] Security event logging — add structured logging to `api/claude.js` for failed auth attempts and rate limit hits so they surface in Vercel runtime logs.

---

## How this works
- New requests from chat are logged here under **Pending**.
- When a task is done, it is removed from this file.
- Review this file any time to see what's outstanding.
