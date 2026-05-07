# AGENTS.md

Instructions for AI agents (Codex CLI) working in this repository.

## Repository

venturecrane/ke-console - KidExpenses operator console.

## Automatic Session Start

When you begin a session, immediately do these in order before any work:

1. Call `crane_preflight` (no arguments) - validates environment.
2. Call `crane_sos` with `venture: "ke"` - initializes session, shows P0 issues, cadence briefing, active sessions.
3. Read `CLAUDE.md` at the repo root - canonical Instruction Modules table (coding standards, guardrails, secrets, tooling, PR workflow, etc.).
4. Fetch `crane_doc('global', 'coding-standards.md')` before editing any TypeScript or JavaScript.

Do not start any work until preflight + sos succeed and CLAUDE.md is loaded. If preflight fails, show the error and stop.

## Coding Standards

All code edits MUST follow the Venture Crane portfolio coding standard, fetched via `crane_doc('global', 'coding-standards.md')`. Key directives that apply on every change:

- Parse external inputs with Zod; never `as` cast at trust boundaries.
- No floating Promises; explicitly `await` or attach a `.catch`.
- No module-level state in Cloudflare Workers (per-isolate state leaks across requests).
- File/function ceilings: 500 lines/file, 75 lines/function, complexity 15, depth 4, params 5.
- No default exports outside framework-required positions (Astro pages, Next.js App Router files, Workers entry).
- Fetch the global doc for the full 12 directives with good/bad examples and per-stack notes.

Mechanical enforcement status: ke-console's `eslint.config.js` does NOT yet enforce the portfolio rule set; lint catches only the basic recommended rules. Self-discipline is required until the per-venture eslint adoption initiative reaches ke-console (audit doc: `docs/research/venture-eslint-adoption-audit-2026-05-06.md` in venturecrane/crane-console). The portfolio rules are nonetheless mandatory; treat the global doc as the source of truth.

## Enterprise Rules

- All changes go through PRs. Never push directly to main.
- Work only on issues assigned to the current venture context (ke).
- If you detect scope drift (working on a different repo than session context), stop and verify with the user.
- All GitHub issues created this session must target `venturecrane/ke-console`.
- When encountering errors, fix root causes - not symptoms.

## Codex Environment

Codex strips `KEY`/`SECRET`/`TOKEN` vars from all subprocess environments (shell commands and MCP servers). The `crane` launcher configures `shell_environment_policy.ignore_default_excludes` and MCP `env_vars` to whitelist the vars agents need.

## Reference

CLAUDE.md (loaded at session start per step 3 above) contains the full Instruction Modules table covering environment variables, QA grades, secrets management, git authority, and per-domain runbooks. Fetch any module on demand via `crane_doc('global', '<module>')`.
