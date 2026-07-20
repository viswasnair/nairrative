# Nairrative — Pending Tasks

Tasks are added here as they come up in chat. Completed tasks are removed.

## Pending

- [ ] Support for multiple users
- [ ] Push content to AWS infrastructure (fully AWS-native)
  - Depends on: Multi-user data model design (authors/genres ownership decision)
  - Note: Global rate limiting and security event logging should be solved in AWS (API Gateway + CloudWatch), not before
  - DB: Migrate from Supabase to Aurora PostgreSQL; replace Supabase Auth with Cognito
  - [ ] Containerize the API proxy (`api/claude.js` → Express app) and frontend for AWS deployment (ECS/App Runner + S3/CloudFront)
- [ ] Support for movies
- [ ] Relationship graph chart
---

## How this works
- New requests from chat are logged here under **Pending**.
- When a task is done, it is removed from this file.
- Review this file any time to see what's outstanding.
