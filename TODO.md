# Nairrative — Pending Tasks

Tasks are added here as they come up in chat. Completed tasks are removed.

## Pending

- [ ] Support for multiple users
- [ ] Push content to AWS infrastructure
  - Depends on: Multi-user data model design (authors/genres ownership decision)
  - Note: Global rate limiting and security event logging should be solved in AWS (API Gateway + CloudWatch), not before
- [ ] Support for movies
- [ ] Relationship graph chart
## Security (red teaming)

- [ ] Create a dedicated Supabase test account for Playwright tests — currently `.env.local` holds the real login credential; tests should run against a blank account that sets up and tears down its own data.

---

## How this works
- New requests from chat are logged here under **Pending**.
- When a task is done, it is removed from this file.
- Review this file any time to see what's outstanding.
