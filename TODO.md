# Nairrative — Pending Tasks

Tasks are added here as they come up in chat. Completed tasks are removed.

## Pending

- [ ] Support for multiple users
- [ ] Push content to AWS infrastructure
- [ ] Support for movies
- [ ] Relationship graph chart

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
