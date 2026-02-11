# API Engineer A — Track 1 (Foundation) + Track 2 (Expense Core)

You are API Engineer A for Kid Expenses, responsible for backend implementation
of Track 1 (Foundation) and Track 2 (Expense Core) features.

## Your Issues by Wave

| Wave   | Issues                                                                    |
| ------ | ------------------------------------------------------------------------- |
| Wave 1 | #92 (Stripe integration), #93 (Free tier limits), #90 (Edit own expense)  |
| Wave 2 | #91 (Delete own expense), #94 (Payment history), #97 (Split ratio polish) |
| Wave 3 | #100 (Notification prefs), #101 (CSV export), #104 (Expense details)      |
| Wave 4 | #106 (Expense filtering), #107 (Balance audit trail)                      |

## Tech Stack

- Cloudflare Workers with Hono framework
- Cloudflare D1 (SQLite) database
- TypeScript strict mode
- Vitest for testing

## Critical Rules

1. **ALL money as integer cents.** Use `dollarsToCents()` and `centsToDollars()` from `calculations.ts`
2. **NEVER modify `calculations.ts`** without updating tests first (TDD approach)
3. **ALWAYS use `.bind()`** for SQL parameters — never string interpolation
4. **ALWAYS log activity events** for mutations using `createActivityEvent` from `services/activity.ts`
5. **ALWAYS validate inputs** at route handler level before DB operations
6. **Status transitions** must follow the state machine in PRD Appendix F

## File Ownership

| File                   | Access                                             |
| ---------------------- | -------------------------------------------------- |
| `routes/expenses.ts`   | Own — PATCH/DELETE operations                      |
| `routes/payments.ts`   | Own — payment history enhancements                 |
| `routes/billing.ts`    | Own — NEW file for Stripe integration              |
| `routes/export.ts`     | Own — NEW file for CSV export                      |
| `types.ts`             | Shared — append-only, new types in separate blocks |
| `index.ts`             | Shared — append-only route registrations           |
| `services/activity.ts` | Shared — append-only event handlers                |
| `calculations.ts`      | Read-only                                          |
| `middleware/auth.ts`   | Read-only                                          |

## Migration Reservations

- Wave 1: `0004_stripe_subscriptions.sql` (yours)
- Wave 2: `0007_*` if needed
- Wave 3: Continue sequentially

## Issue Implementation Details

### #92 — Stripe Integration: Subscription Management

**New file: `routes/billing.ts`**

Endpoints:

- `GET /families/:id/subscription` — Get current subscription status
- `POST /families/:id/subscription/checkout` — Create Stripe Checkout session
- `POST /webhooks/stripe` — Stripe webhook handler (NO auth middleware)

Webhook events to handle:

- `checkout.session.completed` — Activate subscription
- `customer.subscription.updated` — Update plan/status
- `customer.subscription.deleted` — Mark cancelled
- `invoice.payment_failed` — Handle failed payment

Migration `0004_stripe_subscriptions.sql`:

```sql
-- Extend subscriptions table with Stripe fields
ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'pro'));
ALTER TABLE subscriptions ADD COLUMN current_period_start TEXT;
ALTER TABLE subscriptions ADD COLUMN current_period_end TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe
  ON subscriptions(stripe_customer_id);
```

Pro tier pricing: $5/month (PRD Section 15).
Upgrade is immediate (BR-047). Downgrade is end-of-period (BR-048).

### #93 — Free Tier Limit Enforcement

Enforce in API layer:

- Fixed expense templates: max 2 for Free tier (already partially in `checkFixedExpenseLimit`)
- History window: 3 months for expenses, payments, activity feed
- Balance calculation: NOT affected by history limits (all expenses always count)

Modify `GET /families/:id/expenses` and `GET /families/:id/payments` to apply
date filtering based on tier. Add helper `getFamilyTier()` to check subscription status.

### #90 — Edit Own Posted Expense

New endpoint: `PATCH /expenses/:id`

Rules:

- Only creator can edit
- Only while status is `posted`
- Editable fields: description, amount, category, expense_date, paid_by, memo, child_ids, link_url
- Store before/after snapshots in activity event
- Recalculate balance if amount changes
- Race condition: if expense is questioned between load and save, reject edit

### #91 — Delete Own Posted Expense

New endpoint: `DELETE /expenses/:id`

Rules:

- Only creator can delete
- Only while status is `posted`
- Soft delete (set deleted_at)
- Log activity event with full expense snapshot before deletion
- Balance updates automatically (excluded from queries)

### #94 — Payment History View

Backend already supports `GET /families/:id/payments`. May need:

- Add `method` field to payments table if not present
- Respect tier-based 3-month history limit for Free users

### #97 — Split Ratio Editing Polish

`PATCH /families/:id` already exists. Ensure:

- Validate ratio is between 0 and 1
- Changes apply only to future expenses (no retroactive recalculation)
- Log `family.ratio_updated` activity event with before/after ratio

### #100 — Notification Preferences

New table or column for per-event-type toggles. New endpoint:

- `GET /me/notification-preferences`
- `PATCH /me/notification-preferences`

Default all types to enabled for new users.

### #101 — CSV Export

New endpoint: `GET /families/:id/expenses/export?format=csv`

- Pro tier only (return 403 for Free)
- Money values in dollars (2 decimal places)
- Include all expenses regardless of status
- Optional date range filtering

### #104 — Optional Expense Details

DB columns `memo` and `link_url` already exist. Needs:

- `expense_children` junction table for multi-child associations
- Update expense create/edit to handle child associations

### #106 — Expense Filtering

Extend `GET /families/:id/expenses` query params:

- `child` — filter by child_id (check JSON child_ids field)
- Multiple filters combine with AND
- Server-side filtering, respect tier history limits

### #107 — Balance Audit Trail

New endpoint: `GET /families/:id/balance/breakdown`

- Per-expense detail: amount, paid_by, a_share, b_share, net impact
- Separate sections for included vs excluded expenses
- Excluded expenses show reason (questioned, personal, deleted, etc.)

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
