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

At the start of every session, initialize your context:

1. Call the `crane_preflight` MCP tool (no arguments)
2. Call the `crane_sod` MCP tool with `venture: "ke"`

This creates a session in the Context Worker, downloads venture documentation, and establishes context for handoffs.

## MCP Tools Reference

| Tool              | When to Use                     | Arguments                                                                         |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `crane_preflight` | Session start                   | none                                                                              |
| `crane_sod`       | Session start (after preflight) | `venture: "ke"`                                                                   |
| `crane_status`    | Check work queue                | none                                                                              |
| `crane_plan`      | Read weekly plan                | none                                                                              |
| `crane_context`   | Verify current venture/repo     | none                                                                              |
| `crane_handoff`   | End of session                  | `summary`, `status` ("in_progress" / "blocked" / "done"), optional `issue_number` |
| `crane_doc`       | Fetch instruction module        | `scope`, `doc_name`                                                               |
| `crane_notes`     | Search knowledge store          | optional `q`, `tag`, `venture`                                                    |
| `crane_note`      | Create/update a note            | `action` ("create" / "update"), `content`, optional `title`, `tags`, `venture`    |
| `crane_schedule`  | View/complete recurring tasks   | `action` ("list" / "complete")                                                    |

## Enterprise Rules

- **All changes through PRs.** Never push directly to main. Branch, PR, CI, QA, merge.
- **Never echo secret values.** Transcripts persist in ~/.claude/ and are sent to API providers. Pipe from Infisical, never inline.
- **Verify secret VALUES, not just key existence.** Agents have stored descriptions as values before.
- **Never auto-save to VCMS** without explicit Captain approval.
- **Scope discipline.** Discover additional work mid-task - finish current scope, file a new issue.
- **Escalation triggers.** Credential not found in 2 min, same error 3 times, blocked >30 min - stop and escalate.

## Build Commands

### Frontend (Next.js)

```bash
cd app
npm install             # Install dependencies
npm run dev             # Local dev server (port 3000)
npm run build           # Production build
npm run lint            # ESLint check
```

**Deployment:** Vercel auto-deploys from GitHub on push to `main`. Do NOT run `npx vercel` manually.

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

| Layer    | Technology                         |
| -------- | ---------------------------------- |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Auth     | Clerk (email + Google OAuth)       |
| Hosting  | Vercel                             |
| Backend  | Cloudflare Workers (Hono)          |
| Database | Cloudflare D1 (ke-main)            |

## Key Files

- `app/src/` - Next.js pages and components
- `app/lib/api.ts` - API client
- `workers/ke-api/src/index.ts` - All API routes
- `workers/ke-api/migrations/` - D1 schema migrations

## Critical Pattern: Money Math

**All money values use integers (cents, not dollars).**

```typescript
// ❌ WRONG - floating point errors
price = 1500.5

// ✅ CORRECT - exact integers
priceInCents = 150050
```

All `amount_cents` columns are INTEGER. UI converts dollars ↔ cents.

## Testing Requirements

### Unit Tests

```bash
cd workers/ke-api
npm test           # Run all tests
npm run test:watch # Watch mode
```

**Test files location:** `workers/ke-api/src/__tests__/`

### Core Calculation Module

Money math logic lives in `workers/ke-api/src/calculations.ts`:

- `dollarsToCents()` - Currency conversion
- `calculateShares()` - Split expense between parents
- `calculateBalanceFromData()` - Running balance calculation

These functions are pure and fully tested. When modifying, update tests first (TDD).

## Security Requirements

- Never commit secrets to the repository
- Use environment variables for credentials (Clerk, Resend, etc.)
- Validate all input at API boundaries
- Use parameterized queries for D1 (always `.bind()`)
- Clerk handles authentication - verify X-User-Id header in API

## Instruction Modules

Detailed domain instructions stored as on-demand documents.
Fetch the relevant module when working in that domain.

| Module              | Key Rule (always applies)                                                | Fetch for details                          |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| `secrets.md`        | Verify secret VALUES, not just key existence                             | Infisical, vault, API keys, GitHub App     |
| `content-policy.md` | Never auto-save to VCMS; agents ARE the voice                            | VCMS tags, storage rules, editorial, style |
| `team-workflow.md`  | All changes through PRs; never push to main                              | Full workflow, escalation triggers         |
| `fleet-ops.md`      | Bootstrap phases IN ORDER: Tailscale > CLI > bootstrap > optimize > mesh | SSH, machines, Tailscale, macOS            |
| `pr-workflow.md`    | Push branch, `gh pr create`, never skip the PR                           | Branch naming, commit format, PR template  |

Fetch with: `crane_doc('global', '<module>')`

## Related Documentation

Venture-specific instructions (domain rules, business logic) are served by crane-context via the `crane_sod` MCP tool.
See `ke-project-instructions.md` for expense statuses, balance algorithm, and pricing tiers.
