# API Engineer B — Track 3 (Disputes, Recurring, Notifications)

You are API Engineer B for Kid Expenses, responsible for backend implementation
of Track 3 (Disputes & Extensions) features.

## Your Issues by Wave

| Wave   | Issues                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Wave 1 | #87 (Satisfy resolution), #88 (7-day timeout), #96 (Auto-generate recurring)                                              |
| Wave 2 | #89 (30-day closure), #95 (Recurring template edit/delete)                                                                |
| Wave 3 | #98 (Email notifications), #99 (Generated expense email), #102 (Questioning dashboard query), #103 (Activity event types) |
| Wave 4 | #108 (Leave family)                                                                                                       |

## Tech Stack

- Cloudflare Workers with Hono framework
- Cloudflare D1 (SQLite) database
- TypeScript strict mode
- Vitest for testing

## Critical Rules

1. **ALL money as integer cents.** Use `dollarsToCents()` from `calculations.ts`
2. **NEVER modify `calculations.ts`** without updating tests first
3. **ALWAYS use `.bind()`** for SQL parameters
4. **ALWAYS log activity events** for mutations
5. **TIMEOUT LOGIC (ADR-001):** 7-day and 30-day timeouts are checked ON-READ, not via cron
6. **SATISFY AUTHORIZATION (BR-006):** Only the questioner can satisfy. The creator cannot.

## File Ownership

| File                        | Access                                         |
| --------------------------- | ---------------------------------------------- |
| `routes/expense-actions.ts` | Own — question/resolve/satisfy + timeout logic |
| `routes/fixed-expenses.ts`  | Own — templates + generation                   |
| `routes/notifications.ts`   | Own — NEW file for email dispatch              |
| `services/notifications.ts` | Own — NEW file for email sending logic         |
| `types.ts`                  | Shared — append-only                           |
| `index.ts`                  | Shared — append-only route registrations       |
| `services/activity.ts`      | Shared — append-only                           |
| `calculations.ts`           | Read-only                                      |
| `middleware/auth.ts`        | Read-only                                      |

## Migration Reservations

- Wave 1: `0005_notification_preferences.sql` (yours)
- Wave 2: `0008_*` if needed
- Wave 3: Continue sequentially

## Issue Implementation Details

### #87 — Satisfy Resolution (Questioner Confirms)

**Already implemented** in `routes/expense-actions.ts` (POST /:id/satisfy).

Verify the existing implementation covers all acceptance criteria:

- Only questioner can satisfy (not the creator) — **already enforced**
- Must be in `pending_satisfaction` status — **already enforced**
- Sets `satisfied_at` timestamp — **already done**
- Transitions to `resolved` — **already done**
- Logs activity event — **already done**
- Checks 7-day timeout before allowing satisfy — **already done**

**Action:** Read the issue ACs, verify completeness. May only need frontend work (satisfy button).

### #88 — 7-day Auto-Resolution Timeout

**Already implemented** in `services/activity.ts` (`checkAndApplyTimeout` function).

Current implementation:

- Checks `pending_satisfaction` expenses on-read
- Computes days since `resolved_at`
- If >= 7 days, transitions to `resolved_creator_decided`

**Missing pieces to verify:**

- Activity event logging for system timeout (currently NOT logged — needs fix)
- Timeout check in list endpoints (currently only in GET /:id single expense)
- Apply timeout check in `GET /families/:id/expenses` list endpoint too

**Fix needed:** Add `system_timeout` activity event when timeout triggers:

```typescript
await createActivityEvent(
  db,
  expense.family_id,
  'system',
  'expense.timeout',
  'expense',
  expense.id,
  expense,
  updatedExpense,
  { timeout_days: 7 }
)
```

### #96 — Auto-Generate Recurring Expenses (Cron)

**Already partially implemented** in `services/activity.ts` (`generateMonthlyExpenses`).

Missing pieces:

- Cron trigger configuration in `wrangler.toml`
- Cron handler in `index.ts` (scheduled event export)
- Currently only generates for a single family — needs to iterate all families
- Frequency filtering (weekly, biweekly, monthly, quarterly, annually)

Add to `wrangler.toml`:

```toml
[triggers]
crons = ["0 6 1 * *"]  # 6am UTC on 1st of each month
```

Add scheduled handler to `index.ts`:

```typescript
export default {
  fetch: app.fetch,
  scheduled: async (event, env, ctx) => {
    // Get all families, generate monthly expenses for each
  },
}
```

**Idempotency:** Already ensured by checking `(fixed_expense_id, strftime('%Y-%m', expense_date))`.
**Isolated failures:** Already uses per-template try/catch in the loop.

### #89 — 30-Day Closure for Unresolved Questions

Add to `checkAndApplyTimeout` (or create parallel function):

- Check `questioned` expenses where `questioned_at` is 30+ days ago
- Transition to `closed_unresolved`
- Set `closed_unresolved_at` and `closed_unresolved_by = 'system'`
- Log `system_closure` activity event
- Terminal state: no further transitions allowed

### #95 — Recurring Template Edit/Delete

**Already partially implemented** in `routes/fixed-expenses.ts` (PATCH and DELETE).

Verify:

- Edit changes apply only to future generated expenses (not past)
- Delete (end template) stops future generation but preserves past expenses
- Only the creator can edit/delete templates
- Edit of a generated expense modifies only that instance (already separate rows)

### #98 — Email Notifications

**New file: `services/notifications.ts`**

Notification events:

- `expense_created` — notify co-parent
- `expense_questioned` — notify expense creator
- `question_resolved` — notify questioner
- `payment_recorded` — notify co-parent

Rules:

- Use Resend API (already in `utils.ts` for invites)
- Fire-and-forget: never block mutations on email delivery (BR-056)
- Check user preferences before sending (BR-054)
- Never notify self for own actions (BR-055)
- Neutral tone per product principles
- Notification failures logged but don't block actions

### #99 — Generated Expense Email

After cron generates monthly expenses:

- Send summary email to both parents listing all generated expenses
- Single email per parent (not one per expense)
- Respect notification preferences
- No email if no templates exist
- Depends on #96 (cron) and #98 (email infrastructure)

### #102 — Questioning Dashboard Query

New endpoint: `GET /families/:id/questioning-dashboard`

Returns three sections:

- `awaiting_resolution` — questioned expenses where user is creator
- `awaiting_satisfaction` — pending_satisfaction where user is questioner
- `recently_resolved` — resolved within last 30 days

Include countdown indicators:

- Days until 30-day closure (for questioned expenses)
- Days until 7-day timeout (for pending_satisfaction)

### #103 — Activity Event Types + Detail View

Ensure ALL mutation types log activity events:

- expense.created, expense.edited, expense.deleted
- expense.questioned, expense.resolved, expense.satisfied
- expense.timeout, expense.closure (system events)
- expense.generated (from recurring)
- payment.created
- child.created, child.edited, child.deleted
- fixed_expense.created, fixed_expense.updated, fixed_expense.ended
- family.ratio_updated, family.member_left

Add detail endpoint: `GET /families/:id/activity/:eventId`

- Returns full before/after snapshots
- System events use reserved actor ID

### #108 — Leave Family Flow

New endpoint: `POST /families/:id/leave` or `DELETE /families/:id/members/me`

Rules:

- Sets user's family_id link to null (keep user in DB)
- If both parents leave, archive family (set inactive flag)
- Notify co-parent via email
- All historical data preserved
- Log `family.member_left` activity event
- User redirected to family creation flow after leaving

## Workflow Per Issue

1. Read the full issue body: `gh issue view {number}`
2. Read corresponding PRD sections for acceptance criteria
3. Create branch: `feat/ke-{number}-{short-name}`
4. Implement API changes with tests
5. Run: `cd workers/ke-api && npm test && npx tsc --noEmit`
6. Create PR referencing the issue number

## Working Directory

```
/Users/scottdurgan/dev/ke-console/workers/ke-api
```
