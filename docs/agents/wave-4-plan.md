# Wave 4: Expansion + Polish (Phase 3)

**Goal:** Complete remaining P2 features and polish.
**Issues:** #106, #107, #108, #109
**Blocked by:** Wave 3 completion

## Agent Assignments

### API Engineer A

| Order | Issue | Description | Branch |
|-------|-------|-------------|--------|
| 1 | #106 | Expense filtering — extend GET query params | `feat/ke-106-expense-filtering` |
| 2 | #107 | Balance audit trail — breakdown endpoint | `feat/ke-107-balance-audit` |

### API Engineer B

| Order | Issue | Description | Branch |
|-------|-------|-------------|--------|
| 1 | #108 | Leave family flow — POST /families/:id/leave | `feat/ke-108-leave-family` |

### Frontend Engineer

| Order | Issue | Description | Branch |
|-------|-------|-------------|--------|
| 1 | #106 | Filter UI components (filter bar/drawer) | `feat/ke-106-expense-filtering` |
| 2 | #107 | Balance breakdown page | `feat/ke-107-balance-audit` |
| 3 | #108 | Leave family confirmation flow | `feat/ke-108-leave-family` |
| 4 | #109 | User profile settings (Clerk integration) | `feat/ke-109-profile-settings` |

### QA Engineer

| Order | Focus |
|-------|-------|
| 1 | Full regression sweep across all test files |
| 2 | Phase 2 exit criteria validation |
| 3 | Edge cases EC-050 through EC-053 (family/onboarding) |
| 4 | Balance audit trail accuracy verification |

## Shared File Coordination

### `index.ts` — New Routes

API Eng B adds:
```typescript
// Leave family route is on existing families routes
```

API Eng A adds:
```typescript
// Balance breakdown is on existing expenses routes
// Filtering is query param extension, no new routes
```

### `types.ts` — Additions

```typescript
export interface BalanceAuditEntry { ... }
export interface BalanceBreakdownResponse { ... }
export interface LeaveFamilyResponse { ... }
```

### Migrations

| Number | File | Owner | Purpose |
|--------|------|-------|---------|
| Continue sequentially from Wave 3 | As needed | |

## Parallel Execution Plan

```
Time →

API Eng A:  [── #106 Filtering ──][── #107 Balance Audit ──]
API Eng B:  [── #108 Leave Family ──]
Frontend:   [── #106 Filter UI ──][── #107 Balance UI ──][── #108 Leave UI ──][── #109 Profile ──]
QA:         [────────────── Full regression sweep ──────────────][── edge cases ──]
```

## Exit Criteria

### Orchestrator Verifies

- [ ] All branches merge cleanly
- [ ] `cd workers/ke-api && npm test` passes
- [ ] `cd workers/ke-api && npx tsc --noEmit` passes
- [ ] `cd app && npm run lint && npm run build` passes

### PM Validates (Phase 2+3 Completion)

- [ ] #106: Filters work (category, status, date range, child), combine with AND
- [ ] #107: Balance breakdown shows per-expense detail with shares
- [ ] #108: Leave family works, co-parent notified, data preserved
- [ ] #109: Profile settings work via Clerk, name syncs to D1
- [ ] All 23 issues (#87-#109) closed
- [ ] PRD Phase 1 exit criteria met
- [ ] PRD Phase 2 exit criteria met

### QA Confirms

- [ ] Full test suite passes (all files)
- [ ] No regressions from any wave
- [ ] Edge cases EC-050 through EC-053 covered
- [ ] Balance audit trail matches manual calculation
- [ ] Leave family preserves all historical data

## Final Verification Checklist

After Wave 4 completes:

1. [ ] Full test suite: `cd workers/ke-api && npm test` — all pass
2. [ ] TypeScript: `cd workers/ke-api && npx tsc --noEmit` — clean
3. [ ] Frontend lint: `cd app && npm run lint` — clean
4. [ ] Frontend build: `cd app && npm run build` — succeeds
5. [ ] PM reviewed every issue against PRD ACs
6. [ ] All 23 GitHub issues closed
7. [ ] PRD Phase 1 exit criteria met (issues #87-#97)
8. [ ] PRD Phase 2 exit criteria met (issues #98-#105)
9. [ ] No P0 bugs remaining
