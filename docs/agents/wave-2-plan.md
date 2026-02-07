# Wave 2: MVP Completion (P1s)

**Goal:** Complete remaining P1 Phase 1 items.
**Issues:** #89, #91, #94, #95, #97
**Blocked by:** Wave 1 completion

## Agent Assignments

### API Engineer A (Track 1+2)

| Order | Issue | Description | Branch |
|-------|-------|-------------|--------|
| 1 | #91 | Delete own posted expense — DELETE /expenses/:id | `feat/ke-91-delete-expense` |
| 2 | #94 | Payment history — enhance GET endpoint, tier filtering | `feat/ke-94-payment-history` |
| 3 | #97 | Split ratio polish — validate PATCH, activity event | `feat/ke-97-split-ratio` |

### API Engineer B (Track 3)

| Order | Issue | Description | Branch |
|-------|-------|-------------|--------|
| 1 | #89 | 30-day closure — add on-read check for questioned expenses | `feat/ke-89-30day-closure` |
| 2 | #95 | Recurring template edit/delete — verify independence | `feat/ke-95-template-management` |

### Frontend Engineer

| Order | Issue | Description | Branch |
|-------|-------|-------------|--------|
| 1 | #91 | Delete confirmation dialog | `feat/ke-91-delete-expense` |
| 2 | #94 | Payment history page | `feat/ke-94-payment-history` |
| 3 | #95 | Template management UI | `feat/ke-95-template-management` |
| 4 | #97 | Split ratio slider improvements | `feat/ke-97-split-ratio` |

### QA Engineer

| Order | Focus | Test File |
|-------|-------|-----------|
| 1 | #89: 30-day closure state machine | `__tests__/timeout.test.ts` (extend) |
| 2 | #95: Template independence from generated expenses | `__tests__/recurring.test.ts` (extend) |
| 3 | Full dispute lifecycle integration tests | `__tests__/state-machine.test.ts` (NEW) |
| 4 | Full dispute with timeout integration test | `__tests__/state-machine.test.ts` |

## Shared File Coordination

### `index.ts` — No new routes needed

All endpoints for Wave 2 are extensions of existing routes.

### `types.ts` — Minimal additions

API Eng A may add:
```typescript
export interface DeleteExpenseResponse { ... }
```

### `api.ts` (Frontend)

Frontend Eng appends:
```typescript
export async function deleteExpense(...) { ... }
// Payment history already has getPayments()
// Split ratio already has updateFamily()
```

### Migrations

| Number | File | Owner | Purpose |
|--------|------|-------|---------|
| 0007 | Reserved | If needed | |
| 0008 | Reserved | Buffer | |

## Dependency Graph

```
All Wave 2 issues are independent of each other.
All depend on Wave 1 completion.
```

## Parallel Execution Plan

```
Time →

API Eng A:  [── #91 Delete ──][── #94 Payment History ──][── #97 Split Ratio ──]
API Eng B:  [── #89 30-day Closure ──][── #95 Template Edit/Delete ──]
Frontend:   [── #91 Delete UI ──][── #94 Payment UI ──][── #95 Template UI ──][── #97 Slider ──]
QA:         [── #89 closure tests ──][── #95 independence tests ──][── state machine lifecycle tests ──]
```

## Exit Criteria

### Orchestrator Verifies

- [ ] All branches merge cleanly
- [ ] `cd workers/ke-api && npm test` passes
- [ ] `cd workers/ke-api && npx tsc --noEmit` passes
- [ ] `cd app && npm run lint && npm run build` passes

### PM Validates (Phase 1 Completion)

- [ ] All 8 expense statuses functional and tested
- [ ] Payment recording with balance impact works
- [ ] Stripe checkout flow complete
- [ ] Free tier limits enforced
- [ ] Mobile responsive core screens
- [ ] #89: 30-day closure transitions correctly
- [ ] #91: Creator can delete own posted expense, blocked once questioned
- [ ] #94: Payment history shows all payments, respects tier limits
- [ ] #95: Template edits don't affect past generated expenses
- [ ] #97: Split ratio slider works, changes are future-only

### QA Confirms

- [ ] State machine tests cover ALL valid transitions (8 paths)
- [ ] State machine tests cover ALL invalid transitions (5+ paths)
- [ ] 30-day closure timeout tests pass
- [ ] Template independence tests pass
- [ ] Full lifecycle: posted → questioned → resolved → satisfied
- [ ] Full lifecycle: posted → questioned → pending_satisfaction → 7-day timeout
- [ ] No regressions in Wave 1 tests
