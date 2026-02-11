# Wave 1: MVP Critical Path (P0s)

**Goal:** Complete all P0 blockers for March 2026 launch.
**Issues:** #87, #88, #90, #92, #93, #96

## Agent Assignments

### API Engineer A (Track 1+2)

| Order | Issue | Description                                                            | Branch                          |
| ----- | ----- | ---------------------------------------------------------------------- | ------------------------------- |
| 1     | #92   | Stripe integration — billing routes, webhooks, checkout                | `feat/ke-92-stripe-integration` |
| 2     | #93   | Free tier limits — enforce in GET endpoints (after #92 for tier check) | `feat/ke-93-free-tier-limits`   |
| 3     | #90   | Edit own posted expense — PATCH /expenses/:id                          | `feat/ke-90-edit-expense`       |

**Migration:** `0004_stripe_subscriptions.sql`

### API Engineer B (Track 3)

| Order | Issue | Description                                                             | Branch                          |
| ----- | ----- | ----------------------------------------------------------------------- | ------------------------------- |
| 1     | #87   | Satisfy resolution — verify existing impl, add missing pieces           | `feat/ke-87-satisfy-resolution` |
| 2     | #88   | 7-day auto-resolution — add activity event logging, list endpoint check | `feat/ke-88-timeout-7day`       |
| 3     | #96   | Auto-generate recurring — cron trigger, all-families iteration          | `feat/ke-96-recurring-cron`     |

**Migration:** `0005_notification_preferences.sql` (if needed for later waves, reserve now)

### Frontend Engineer

| Order | Issue | Description                                               | Branch                                              |
| ----- | ----- | --------------------------------------------------------- | --------------------------------------------------- |
| 1     | #87   | Satisfy button on expense detail page                     | `feat/ke-87-satisfy-resolution` (shared with API B) |
| 2     | #90   | Edit expense UI — edit form, pre-fill, save               | `feat/ke-90-edit-expense` (shared with API A)       |
| 3     | #92   | Billing/subscription page — tier display, Stripe checkout | `feat/ke-92-stripe-integration` (shared with API A) |
| 4     | #93   | Upgrade prompts — tier gating modals, limit indicators    | `feat/ke-93-free-tier-limits` (shared with API A)   |

### QA Engineer (joins mid-wave)

| Order | Issue | Test File                       | Focus                           |
| ----- | ----- | ------------------------------- | ------------------------------- |
| 1     | #88   | `__tests__/timeout.test.ts`     | Timeout logic with date mocking |
| 2     | #93   | `__tests__/tier-limits.test.ts` | Tier enforcement edge cases     |
| 3     | #96   | `__tests__/recurring.test.ts`   | Idempotent generation           |
| 4     | #87   | `__tests__/routes.test.ts`      | Satisfy authorization           |

## Shared File Coordination

### `index.ts` — Route Registration

API Eng A adds:

```typescript
import billingRoutes from './routes/billing'
app.route('/families', billingRoutes) // /families/:id/subscription/*
app.route('/webhooks', webhookRoutes) // /webhooks/stripe (no auth)
```

API Eng B adds (if needed):

```typescript
// No new routes needed — existing routes cover satisfy, timeout is on-read
```

**No conflict:** Different route prefixes.

### `types.ts` — Type Definitions

API Eng A appends:

```typescript
// Billing types
export interface Subscription { ... }
export interface CreateCheckoutRequest { ... }
export interface EditExpenseRequest { ... }
```

API Eng B appends:

```typescript
// (No new types needed for Wave 1 — existing types cover satisfy/timeout)
```

### `api.ts` (Frontend) — API Client Methods

Frontend Eng appends:

```typescript
// Billing
export async function getSubscription(...) { ... }
export async function createCheckoutSession(...) { ... }
export async function cancelSubscription(...) { ... }

// Edit expense
export async function editExpense(...) { ... }
```

### Migrations

| Number | File                            | Owner     | Purpose                              |
| ------ | ------------------------------- | --------- | ------------------------------------ |
| 0004   | `0004_stripe_subscriptions.sql` | API Eng A | Stripe fields on subscriptions table |
| 0005   | `0005_reserved.sql`             | Reserved  | Buffer for Wave 1 needs              |
| 0006   | `0006_reserved.sql`             | Reserved  | Buffer                               |

## Dependency Graph

```
#92 (Stripe) ──────────→ #93 (Tier limits depend on subscription check)
#87 (Satisfy) ─────────→ (independent, mostly frontend)
#88 (7-day timeout) ───→ (independent, fix existing code)
#90 (Edit expense) ────→ (independent)
#96 (Recurring cron) ──→ (independent)
```

Only dependency: #93 depends on #92 (needs `getFamilyTier()` from billing).

## Parallel Execution Plan

```
Time →

API Eng A:  [────── #92 Stripe ──────][── #93 Tier ──][── #90 Edit ──]
API Eng B:  [── #87 Satisfy ──][── #88 Timeout ──][──── #96 Cron ────]
Frontend:   [── #87 Satisfy UI ──][── #90 Edit UI ──][── #92 Billing UI ──][── #93 Upgrade UI ──]
QA:                        [── #88 timeout tests ──][── #93 tier tests ──][── #96 recurring tests ──]
```

## Exit Criteria

### Orchestrator Verifies

- [ ] No merge conflicts in shared files
- [ ] All 6 branches merge cleanly to main
- [ ] `cd workers/ke-api && npm test` passes
- [ ] `cd workers/ke-api && npx tsc --noEmit` passes
- [ ] `cd app && npm run lint` passes
- [ ] `cd app && npm run build` succeeds

### PM Validates

- [ ] #87: Questioner can satisfy, creator cannot
- [ ] #88: Expenses stuck 7+ days auto-transition to resolved_creator_decided
- [ ] #90: Creator can edit own posted expense, blocked once questioned
- [ ] #92: Stripe checkout creates subscription, webhooks handle lifecycle
- [ ] #93: Free tier limited to 2 templates, 3-month history; balance unaffected
- [ ] #96: Cron generates monthly expenses, idempotent, isolated failures

### QA Confirms

- [ ] `timeout.test.ts` — 7-day timeout logic with date mocking
- [ ] `tier-limits.test.ts` — Free/Pro tier enforcement
- [ ] `recurring.test.ts` — Idempotent generation, no duplicates
- [ ] `routes.test.ts` — Satisfy authorization (extended)
- [ ] All existing tests still pass (no regressions)
