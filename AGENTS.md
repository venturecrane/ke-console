# AGENTS.md

Instructions for AI agents without native slash commands (Codex CLI, etc.).
Agents with slash command support (Claude Code, Gemini CLI) should use their own instruction files.

## Session Workflow

This repo uses crane MCP tools for session management. Call them directly instead of slash commands.

### Start of Session

Call these MCP tools in order:

1. `crane_preflight` — validates environment (CRANE_CONTEXT_KEY, gh auth, git repo)
2. `crane_sod` with `venture: "ke"` — creates session, shows P0 issues, weekly plan, last handoff

### During Session

- `crane_status` — full GitHub issue breakdown (P0, ready, in-progress, blocked, triage)
- `crane_plan` — read weekly plan
- `crane_context` — current venture, repo, branch, session validation

### End of Session

- `crane_handoff` with `summary`, `status` ("in_progress" | "blocked" | "done"), and optional `issue_number`

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
