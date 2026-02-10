# AGENTS.md

Instructions for AI agents in this repository.

**Important:** This repo does NOT use slash commands. Do not attempt `/sod`, `/eod`, or any `/` commands — they will fail. Use the MCP tools below instead.

## Automatic Session Start

When you begin a session, immediately call these MCP tools in order before doing anything else:

1. Call the `crane_preflight` MCP tool (no arguments needed)
2. Call the `crane_sod` MCP tool with argument `venture: "ke"`

These replace the `/sod` slash command used by other agents. You must call them at the start of every session.

## MCP Tools Reference

| Tool | When to Use | Arguments |
|------|-------------|-----------|
| `crane_preflight` | Session start | none |
| `crane_sod` | Session start (after preflight) | `venture: "ke"` |
| `crane_status` | Check work queue | none |
| `crane_plan` | Read weekly plan | none |
| `crane_context` | Verify current venture/repo | none |
| `crane_handoff` | End of session | `summary`, `status` ("in_progress" or "blocked" or "done"), optional `issue_number` |

## Repository

kidexpenses/ke-console — Kid Expenses co-parent expense tracking app.

## Build Commands

### Frontend (Next.js)
```bash
cd app
npm install && npm run dev      # Local dev server (port 3000)
npm run build                   # Production build
npm run lint                    # ESLint check
```

### API Worker
```bash
cd workers/ke-api
npm install
npx wrangler dev                # Local dev server
npx tsc --noEmit                # TypeScript validation
npm test                        # Run tests
```

## Critical Pattern: Money Math

All money values use integers (cents, not dollars). All `amount_cents` columns are INTEGER.

## Secrets

Secrets are injected via Infisical (already in your environment if launched via `crane`).
Never hardcode secrets.
