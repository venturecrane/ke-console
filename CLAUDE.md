# CLAUDE.md - KE Console

This file provides guidance for Claude Code agents working in this repository.

## About This Repository

KE Console is the development hub for Kid Expenses (KE). It contains:

- **app/** - Next.js 16 frontend with Clerk authentication
- **workers/** - Cloudflare Workers for backend services
  - `ke-api/` - Main API worker with Hono
- **docs/** - Technical documentation
- **scripts/** - Automation scripts

## Session Start

Always run `/sod` at the start of every session to:
- Create session in Context Worker
- Download current documentation (includes ke-project-instructions.md)
- Establish session context for handoffs

## Build Commands

### Frontend (Next.js)
```bash
cd app
npm install             # Install dependencies
npm run dev             # Local dev server (port 3000)
npm run build           # Production build
npm run lint            # ESLint check
```

### API Worker
```bash
cd workers/ke-api
npm install             # Install dependencies
npx wrangler dev        # Local dev server
npx wrangler deploy     # Deploy to Cloudflare
npx tsc --noEmit        # TypeScript validation
```

### Database Migrations
```bash
cd workers/ke-api
npx wrangler d1 migrations apply ke-main --local   # Local
npx wrangler d1 migrations apply ke-main --remote  # Production
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Auth | Clerk (email + Google OAuth) |
| Hosting | Vercel |
| Backend | Cloudflare Workers (Hono) |
| Database | Cloudflare D1 (ke-main) |

## Key Files

- `app/src/` - Next.js pages and components
- `app/lib/api.ts` - API client
- `workers/ke-api/src/index.ts` - All API routes
- `workers/ke-api/migrations/` - D1 schema migrations

## Critical Pattern: Money Math

**All money values use integers (cents, not dollars).**

```typescript
// ❌ WRONG - floating point errors
price = 1500.50

// ✅ CORRECT - exact integers
priceInCents = 150050
```

All `amount_cents` columns are INTEGER. UI converts dollars ↔ cents.

## Security Requirements

- Never commit secrets to the repository
- Use environment variables for credentials (Clerk, Resend, etc.)
- Validate all input at API boundaries
- Use parameterized queries for D1 (always `.bind()`)
- Clerk handles authentication - verify X-User-Id header in API

## Related Documentation

Venture-specific instructions (domain rules, business logic) are served by crane-context via `/sod`.
See the cached `ke-project-instructions.md` for expense statuses, balance algorithm, and pricing tiers.
