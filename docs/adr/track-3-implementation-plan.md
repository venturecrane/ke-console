# Track 3: Dispute & Extensions - Implementation Plan

**Date:** 2026-01-27
**Track:** 3 (Dispute & Extensions)
**Status:** BLOCKED on Track 1 & Track 2
**Author:** Track 3 Agent

---

## Executive Summary

Track 3 covers dispute workflow, activity logging, children management, and fixed expenses. Most issues are blocked on Track 1 (Foundation) and Track 2 (Expense Core) completing their work. This document provides detailed implementation plans, API contracts, component hierarchies, and architectural decisions to enable rapid development once dependencies are ready.

### Issue Dependency Matrix

| Issue | Title               | Dependencies                  | Status            |
| ----- | ------------------- | ----------------------------- | ----------------- |
| #9    | Question Expense    | Track 2 (#5 Expenses)         | BLOCKED           |
| #10   | Resolve Dispute     | #9 Question Expense           | BLOCKED           |
| #11   | Activity Feed       | All mutations (Track 1, 2, 3) | BLOCKED           |
| #12   | Children Management | Track 1 (#4 Family)           | PARTIALLY BLOCKED |
| #13   | Fixed Expenses      | Track 2 (#5 Expenses)         | BLOCKED           |

### Recommended Implementation Order

1. **#12 Children Management** - Only needs Family API, simplest scope
2. **#11 Activity Feed** - Read-only, can build shell with mock data
3. **#9 Question Expense** - Core dispute initiation
4. **#10 Resolve Dispute** - Completes dispute workflow
5. **#13 Fixed Expenses** - Most complex, depends on expense infrastructure

---

## Issue #12: Children Management

### Overview

Simple CRUD for child records within a family. Optional feature for tagging expenses to specific children.

### API Contract

#### POST /families/:id/children

**Create a child record**

Request:

```json
{
  "name": "string (required, 1-100 chars)"
}
```

Response (201):

```json
{
  "id": "child_uuid",
  "family_id": "family_uuid",
  "name": "Emma",
  "created_at": "2026-01-27T12:00:00Z",
  "deleted_at": null
}
```

Errors:

- 400: Missing/invalid name
- 401: Unauthorized
- 403: User not in this family
- 404: Family not found

#### GET /families/:id/children

**List all children (excluding soft-deleted)**

Response (200):

```json
{
  "children": [
    {
      "id": "child_uuid",
      "family_id": "family_uuid",
      "name": "Emma",
      "created_at": "2026-01-27T12:00:00Z",
      "deleted_at": null
    }
  ],
  "count": 1
}
```

Query params:

- `include_deleted=true` - Include soft-deleted children

#### DELETE /families/:id/children/:childId

**Soft-delete a child**

Response (200):

```json
{
  "id": "child_uuid",
  "deleted_at": "2026-01-27T13:00:00Z"
}
```

Notes:

- Soft delete only (sets deleted_at)
- Historical expenses retain child_ids reference
- Hidden from UI but preserved in database

### Component Hierarchy

```
/settings/children (page)
└── ChildrenManagement
    ├── ChildrenHeader
    │   ├── Title ("Children")
    │   └── AddChildButton
    ├── ChildrenList
    │   ├── ChildCard (for each child)
    │   │   ├── ChildName
    │   │   └── DeleteChildButton
    │   └── EmptyState (if no children)
    └── AddChildModal
        ├── NameInput
        ├── CancelButton
        └── SaveButton
```

### Activity Events

| Event Type      | Target Type | When               |
| --------------- | ----------- | ------------------ |
| `child.created` | `child`     | Child added        |
| `child.deleted` | `child`     | Child soft-deleted |

Event payload example:

```json
{
  "event_type": "child.created",
  "target_type": "child",
  "target_id": "child_uuid",
  "before_snapshot": null,
  "after_snapshot": "{\"name\":\"Emma\"}",
  "metadata": null
}
```

### Implementation Notes

1. **Validation**: Name 1-100 characters, required
2. **Authorization**: Only family members can CRUD children
3. **Idempotency**: Duplicate names allowed (same child could have same name)
4. **Migration**: None needed, children table in initial schema

---

## Issue #9: Question Expense (Dispute Initiation)

### Overview

Allows Parent B to formally question an expense created by Parent A. Questioned expenses are excluded from balance calculation until resolved.

### API Contract

#### POST /expenses/:id/question

**Question an expense**

Request:

```json
{
  "reason": "wrong_amount | not_child_related | duplicate | split_dispute | other",
  "note": "string (optional, max 500 chars)"
}
```

Response (200):

```json
{
  "id": "expense_uuid",
  "status": "questioned",
  "questioned_by": "user_uuid",
  "questioned_at": "2026-01-27T12:00:00Z",
  "question_reason": "wrong_amount",
  "question_note": "The receipt shows $45, not $50"
}
```

Errors:

- 400: Invalid reason, note too long
- 401: Unauthorized
- 403: Cannot question own expense, expense already questioned
- 404: Expense not found

### Business Rules

1. **Only other parent can question** - Cannot question your own expenses
2. **Only posted expenses** - Cannot question already-questioned expenses
3. **Immediate balance exclusion** - Questioned expenses excluded from balance
4. **Activity logging** - expense.questioned event created

### State Transition

```
posted → questioned
```

### Component Hierarchy

```
ExpenseCard (existing, enhanced)
└── QuestionButton (visible if expense.created_by !== currentUser.id)

QuestionExpenseModal
├── ReasonSelector
│   ├── RadioOption (wrong_amount)
│   ├── RadioOption (not_child_related)
│   ├── RadioOption (duplicate)
│   ├── RadioOption (split_dispute)
│   └── RadioOption (other)
├── NoteTextarea (optional)
├── WarningText ("This expense will be excluded from the balance until resolved")
├── CancelButton
└── SubmitButton
```

### Visual Indicators

Questioned expenses should display:

- Orange/yellow badge with "Questioned" text
- Strikethrough or dimmed amount
- Question icon
- Different background color in list

### Activity Events

| Event Type           | Target Type | When               |
| -------------------- | ----------- | ------------------ |
| `expense.questioned` | `expense`   | Expense questioned |

Event payload:

```json
{
  "event_type": "expense.questioned",
  "target_type": "expense",
  "target_id": "expense_uuid",
  "before_snapshot": "{\"status\":\"posted\"}",
  "after_snapshot": "{\"status\":\"questioned\",\"questioned_by\":\"user_uuid\",\"question_reason\":\"wrong_amount\"}",
  "metadata": "{\"reason\":\"wrong_amount\",\"note\":\"...\"}"
}
```

### Implementation Notes

1. **Permission check**: Verify user is in family AND is not the creator
2. **Status check**: Expense must be in "posted" status
3. **Atomic update**: Update expense + create activity event in transaction
4. **Balance impact**: Ensure balance calculation excludes "questioned" status

---

## Issue #10: Resolve Dispute (Creator Response)

### Overview

Allows the expense creator to respond to a question with four possible actions: keep as-is, edit amount, mark as personal, or delete.

### API Contract

#### POST /expenses/:id/resolve

**Creator resolves a questioned expense**

Request:

```json
{
  "action": "keep | edit | personal | delete",
  "new_amount_cents": 4500 // required only if action="edit"
}
```

Response (200):

```json
{
  "id": "expense_uuid",
  "status": "pending_satisfaction | resolved_personal | resolved_deleted",
  "resolution_action": "kept | edited | personal | deleted",
  "resolved_at": "2026-01-27T14:00:00Z",
  "amount_cents": 4500 // updated if edited
}
```

Errors:

- 400: Invalid action, missing new_amount for edit
- 401: Unauthorized
- 403: Not the creator, expense not in questioned status
- 404: Expense not found

#### POST /expenses/:id/satisfy

**Questioner confirms satisfaction**

Request:

```json
{} // No body needed
```

Response (200):

```json
{
  "id": "expense_uuid",
  "status": "resolved",
  "satisfied_at": "2026-01-27T15:00:00Z"
}
```

Errors:

- 401: Unauthorized
- 403: Not the questioner, not in pending_satisfaction status
- 404: Expense not found

### State Transitions

```
questioned → pending_satisfaction (keep/edit)
questioned → resolved_personal (personal)
questioned → resolved_deleted (delete)
pending_satisfaction → resolved (satisfy)
pending_satisfaction → resolved_creator_decided (7-day timeout)
```

### Timeout Logic

After 7 days in `pending_satisfaction`:

- Status auto-changes to `resolved_creator_decided`
- Expense re-included in balance

Implementation options:

1. **On-read check**: When fetching expense, check if 7 days passed and update
2. **Scheduled worker**: Cron job runs daily to update stale disputes
3. **Hybrid**: On-read check + nightly cleanup

Recommended: **Option 1 (on-read)** for simplicity in v1.0.

### Business Rules

| Action   | Status After         | Balance Impact                     |
| -------- | -------------------- | ---------------------------------- |
| keep     | pending_satisfaction | Excluded until satisfied           |
| edit     | pending_satisfaction | Excluded until satisfied           |
| personal | resolved_personal    | Permanently excluded               |
| delete   | resolved_deleted     | Permanently excluded (soft delete) |

### Component Hierarchy

```
ExpenseCard (for questioned expenses owned by current user)
└── RespondButton

ResolveDisputeModal
├── DisputeInfo
│   ├── QuestionReason
│   ├── QuestionNote
│   └── QuestionedBy
├── ActionSelector
│   ├── KeepAsIsOption
│   │   └── ExplanationText
│   ├── EditAmountOption
│   │   └── AmountInput
│   ├── MarkPersonalOption
│   │   └── WarningText
│   └── DeleteOption
│       └── WarningText
├── CancelButton
└── SubmitButton

// For questioner view
ExpenseCard (pending_satisfaction, questioned_by === currentUser)
└── SatisfactionPrompt
    ├── "Creator responded: kept/edited/etc"
    ├── SatisfiedButton ("Yes, I'm satisfied")
    └── NotSatisfiedText ("If not satisfied, discuss directly")
```

### Activity Events

| Event Type                 | Target Type | When                 |
| -------------------------- | ----------- | -------------------- |
| `expense.resolved`         | `expense`   | Creator responds     |
| `expense.satisfied`        | `expense`   | Questioner satisfied |
| `expense.timeout_resolved` | `expense`   | 7-day timeout        |

### Implementation Notes

1. **Creator-only resolve**: Verify current user === expense.created_by
2. **Questioner-only satisfy**: Verify current user === expense.questioned_by
3. **Delete handling**: Set deleted_at + status = resolved_deleted
4. **Edit handling**: Update amount_cents, create edit snapshot
5. **Transaction**: Update expense + create activity in single transaction

---

## Issue #11: Activity Feed

### Overview

Chronological feed of all family actions for transparency and audit trail. Read-only display of activity_events table.

### API Contract

#### GET /families/:id/activity

**Get paginated activity feed**

Query params:

- `limit` (default: 20, max: 100)
- `offset` (default: 0)
- `type` (optional filter: expense.created, expense.questioned, etc.)

Response (200):

```json
{
  "events": [
    {
      "id": "event_uuid",
      "family_id": "family_uuid",
      "user_id": "user_uuid",
      "user_name": "John",
      "event_type": "expense.created",
      "target_type": "expense",
      "target_id": "expense_uuid",
      "before_snapshot": null,
      "after_snapshot": "{\"description\":\"Soccer gear\",\"amount_cents\":5000}",
      "metadata": null,
      "created_at": "2026-01-27T12:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

### Event Types

| Event Type                 | Description          | Target Type   |
| -------------------------- | -------------------- | ------------- |
| `expense.created`          | New expense added    | expense       |
| `expense.edited`           | Expense modified     | expense       |
| `expense.questioned`       | Dispute initiated    | expense       |
| `expense.resolved`         | Creator responded    | expense       |
| `expense.satisfied`        | Questioner confirmed | expense       |
| `expense.timeout_resolved` | 7-day auto-resolve   | expense       |
| `payment.created`          | Payment recorded     | payment       |
| `child.created`            | Child added          | child         |
| `child.deleted`            | Child removed        | child         |
| `fixed_expense.created`    | Template created     | fixed_expense |
| `fixed_expense.updated`    | Template modified    | fixed_expense |
| `fixed_expense.ended`      | Template deactivated | fixed_expense |
| `family.settings_changed`  | Split ratio changed  | family        |

### Component Hierarchy

```
/activity (page)
└── ActivityFeed
    ├── ActivityHeader
    │   └── Title ("Activity")
    ├── ActivityList
    │   ├── ActivityItem (for each event)
    │   │   ├── UserAvatar
    │   │   ├── EventDescription
    │   │   ├── EventDetails (before/after for edits)
    │   │   ├── Timestamp (relative or absolute)
    │   │   └── NavigateButton (go to expense/payment)
    │   └── LoadMoreButton
    ├── EmptyState
    └── LoadingState
```

### Event Rendering

Each event type needs custom rendering:

```typescript
const renderEvent = (event: ActivityEvent) => {
  switch (event.event_type) {
    case 'expense.created':
      return `${event.user_name} added expense "${after.description}" for ${formatCents(after.amount_cents)}`
    case 'expense.edited':
      return `${event.user_name} edited expense "${after.description}"`
    case 'expense.questioned':
      return `${event.user_name} questioned expense "${after.description}" - Reason: ${metadata.reason}`
    case 'expense.resolved':
      return `${event.user_name} resolved dispute: ${metadata.action}`
    case 'payment.created':
      return `${event.user_name} recorded payment of ${formatCents(after.amount_cents)}`
    // ... etc
  }
}
```

### Timestamp Formatting

- < 1 minute: "Just now"
- < 1 hour: "X minutes ago"
- < 24 hours: "X hours ago"
- < 7 days: "X days ago"
- > = 7 days: "Jan 27, 2026"

### Implementation Notes

1. **Joins needed**: activity_events + users for user_name
2. **JSON parsing**: before_snapshot and after_snapshot are JSON strings
3. **Navigation**: Click event to navigate to target (expense detail, etc.)
4. **Pagination**: Offset-based, consider cursor-based for production
5. **Caching**: Consider short TTL cache for frequently viewed feeds

---

## Issue #13: Fixed Expenses (Recurring Templates)

### Overview

Templates for recurring monthly expenses that auto-generate on the 1st of each month. Reduces data entry for predictable costs like tuition, rent, etc.

### API Contract

#### POST /families/:id/fixed-expenses

**Create a fixed expense template**

Request:

```json
{
  "description": "string (required, 1-200 chars)",
  "amount_cents": 15000,
  "category": "school | medical | activities | childcare | other",
  "effective_from": "2026-02-01",
  "effective_until": "2026-12-31", // optional
  "child_ids": ["child_uuid"], // optional
  "link_url": "https://...", // optional
  "memo": "Monthly tuition" // optional
}
```

Response (201):

```json
{
  "id": "fixed_expense_uuid",
  "family_id": "family_uuid",
  "created_by": "user_uuid",
  "description": "Tuition - ABC School",
  "amount_cents": 15000,
  "category": "school",
  "effective_from": "2026-02-01",
  "effective_until": "2026-12-31",
  "child_ids": ["child_uuid"],
  "link_url": null,
  "memo": "Monthly tuition",
  "created_at": "2026-01-27T12:00:00Z"
}
```

Errors:

- 400: Validation error
- 401: Unauthorized
- 402: Tier limit exceeded (Free: max 2 active)
- 403: Not in family
- 404: Family not found

#### GET /families/:id/fixed-expenses

**List fixed expense templates**

Query params:

- `include_ended=true` - Include expired/ended templates

Response (200):

```json
{
  "fixed_expenses": [...],
  "count": 2,
  "tier_limit": 2,  // or null for Pro
  "can_create": false
}
```

#### PUT /families/:id/fixed-expenses/:fixedExpenseId

**Update a fixed expense template**

Notes:

- Changes apply to FUTURE generated expenses only
- Historical expenses unchanged

#### DELETE /families/:id/fixed-expenses/:fixedExpenseId

**End a fixed expense template**

Actually sets `effective_until = today`, doesn't hard delete.

### Monthly Generation Logic

**Trigger**: 1st of each month OR first app open after 1st

**Algorithm**:

```typescript
async function generateMonthlyExpenses(familyId: string, month: string) {
  const templates = await getActiveTemplates(familyId, month);

  for (const template of templates) {
    // Check if already generated for this month
    const existing = await db.prepare(`
      SELECT id FROM expenses
      WHERE fixed_expense_id = ?
      AND strftime('%Y-%m', expense_date) = ?
    `).bind(template.id, month).first();

    if (existing) continue;  // Idempotent - skip if exists

    // Generate expense
    await db.prepare(`
      INSERT INTO expenses (
        id, family_id, created_by, paid_by, fixed_expense_id,
        description, amount_cents, category, expense_date,
        child_ids, link_url, memo, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
    `).bind(
      generateUUID(),
      familyId,
      template.created_by,
      template.created_by,  // paid_by = creator
      template.id,
      template.description,
      template.amount_cents,
      template.category,
      `${month}-01`,  // First of month
      template.child_ids,
      template.link_url,
      template.memo
    ).run();

    // Log activity
    await logActivity(familyId, template.created_by, 'expense.created', ...);
  }
}
```

**Active template query**:

```sql
SELECT * FROM fixed_expenses
WHERE family_id = ?
AND deleted_at IS NULL
AND effective_from <= ?
AND (effective_until IS NULL OR effective_until >= ?)
```

### Tier Enforcement

```typescript
async function canCreateFixedExpense(familyId: string): Promise<boolean> {
  const subscription = await getSubscription(familyId)
  if (subscription?.status === 'active') return true // Pro = unlimited

  const count = await db
    .prepare(
      `
    SELECT COUNT(*) as count FROM fixed_expenses
    WHERE family_id = ?
    AND deleted_at IS NULL
    AND (effective_until IS NULL OR effective_until >= date('now'))
  `
    )
    .bind(familyId)
    .first()

  return count.count < 2 // Free tier limit
}
```

### Component Hierarchy

```
/settings/fixed-expenses (page)
└── FixedExpensesManagement
    ├── FixedExpensesHeader
    │   ├── Title
    │   ├── TierInfo (X of Y used)
    │   └── AddButton (disabled if at limit)
    ├── FixedExpensesList
    │   ├── FixedExpenseCard
    │   │   ├── Description
    │   │   ├── Amount
    │   │   ├── Category
    │   │   ├── EffectiveDates
    │   │   ├── EditButton
    │   │   └── EndButton
    │   └── EmptyState
    └── FixedExpenseModal (create/edit)
        ├── DescriptionInput
        ├── AmountInput
        ├── CategorySelector
        ├── EffectiveFromPicker
        ├── EffectiveUntilPicker (optional)
        ├── ChildSelector (optional)
        ├── LinkUrlInput (optional)
        ├── MemoTextarea (optional)
        └── Actions
```

### Activity Events

| Event Type              | Target Type     | When                 |
| ----------------------- | --------------- | -------------------- |
| `fixed_expense.created` | `fixed_expense` | Template created     |
| `fixed_expense.updated` | `fixed_expense` | Template modified    |
| `fixed_expense.ended`   | `fixed_expense` | Template deactivated |

### Implementation Notes

1. **Generation trigger options**:
   - Cron job on Workers (recommended for reliability)
   - On-login check (fallback)
   - Manual "generate now" admin endpoint

2. **Idempotency**: Critical - check month-year before generating

3. **Link to template**: Generated expenses have `fixed_expense_id` for traceability

4. **Timezone**: Use family's timezone or UTC consistently

5. **Edge cases**:
   - Template created mid-month: Generate for current month?
   - Template ended before month ends: Still generate for partial month?

---

## Activity Event Logging Strategy

### Centralized Logger

```typescript
// lib/activity.ts
interface ActivityLogParams {
  familyId: string
  userId: string
  eventType: string
  targetType: 'expense' | 'payment' | 'child' | 'fixed_expense' | 'family'
  targetId: string
  before?: object | null
  after?: object | null
  metadata?: object | null
}

export async function logActivity(db: D1Database, params: ActivityLogParams) {
  await db
    .prepare(
      `
    INSERT INTO activity_events (
      id, family_id, user_id, event_type, target_type, target_id,
      before_snapshot, after_snapshot, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `
    )
    .bind(
      generateUUID(),
      params.familyId,
      params.userId,
      params.eventType,
      params.targetType,
      params.targetId,
      params.before ? JSON.stringify(params.before) : null,
      params.after ? JSON.stringify(params.after) : null,
      params.metadata ? JSON.stringify(params.metadata) : null
    )
    .run()
}
```

### Usage Pattern

```typescript
// In expense creation handler
const expense = await createExpense(db, expenseData)

await logActivity(db, {
  familyId: expense.family_id,
  userId: currentUser.id,
  eventType: 'expense.created',
  targetType: 'expense',
  targetId: expense.id,
  before: null,
  after: {
    description: expense.description,
    amount_cents: expense.amount_cents,
    category: expense.category,
  },
})
```

### Transaction Wrapper

For atomicity, wrap mutation + logging in a transaction:

```typescript
await db.batch([
  db.prepare('UPDATE expenses SET status = ? WHERE id = ?').bind('questioned', expenseId),
  db.prepare('INSERT INTO activity_events ...').bind(...)
]);
```

---

## Architectural Decisions

### Decision 1: On-Read vs. Scheduled Timeout Resolution

**Context**: 7-day timeout for pending_satisfaction expenses.

**Decision**: On-read check with eventual consistency.

**Rationale**:

- Simpler to implement (no cron infrastructure needed)
- Acceptable UX (status updates when viewed)
- Can add scheduled job later for notifications

**Implementation**:

```typescript
// In expense fetch logic
if (expense.status === 'pending_satisfaction') {
  const resolvedAt = new Date(expense.resolved_at)
  const now = new Date()
  const daysSinceResolved = (now - resolvedAt) / (1000 * 60 * 60 * 24)

  if (daysSinceResolved >= 7) {
    // Update status
    await db
      .prepare(
        `
      UPDATE expenses SET status = 'resolved_creator_decided' WHERE id = ?
    `
      )
      .bind(expense.id)
      .run()
    expense.status = 'resolved_creator_decided'
  }
}
```

### Decision 2: Fixed Expense Generation Trigger

**Context**: When to generate monthly expenses from templates.

**Decision**: Cloudflare Workers Cron Trigger + on-login fallback.

**Rationale**:

- Cron ensures reliable generation even if no user logs in
- On-login fallback catches any missed generations
- Workers Cron is free and simple

**Implementation**:

```typescript
// wrangler.toml
;[triggers]
crons = ['0 0 1 * *'] // Run at midnight on 1st of each month

// In worker
export default {
  async scheduled(event, env, ctx) {
    const families = await getAllFamilies(env.DB)
    for (const family of families) {
      await generateMonthlyExpenses(env.DB, family.id, getCurrentMonth())
    }
  },
}
```

### Decision 3: Soft Delete Strategy

**Context**: Handling deletions (children, expenses, fixed_expenses).

**Decision**: Universal soft delete with `deleted_at` timestamp.

**Rationale**:

- Preserves audit trail
- Allows recovery
- Maintains referential integrity
- Historical reports remain accurate

**Convention**:

- All queries filter `WHERE deleted_at IS NULL` by default
- Admin/export queries can include deleted records
- Hard delete only via explicit data retention policy

### Decision 4: Activity Feed Pagination

**Context**: Choosing pagination strategy for activity feed.

**Decision**: Offset-based pagination for v1.0.

**Rationale**:

- Simpler to implement
- Adequate for expected data volumes
- Can migrate to cursor-based if needed

**Future consideration**: If feed grows large or needs real-time updates, consider cursor-based pagination with created_at + id as cursor.

---

## Coordination Notes for Other Tracks

### For Track 1 (Foundation)

1. **Family API must include** user's family context in `/me` response
2. **User sync** from Clerk should create user record before any other operations
3. **Family membership check** utility function needed for authorization

### For Track 2 (Expense Core)

1. **Expense status field** must be included in all expense responses
2. **Balance calculation** must respect expense statuses (exclude questioned, etc.)
3. **Activity logging** should be integrated into expense create/edit handlers
4. **Expense API should expose** `created_by` and `paid_by` for permission checks

### Shared Utilities Needed

```typescript
// lib/auth.ts
export function getUserFamilyId(userId: string): Promise<string | null>
export function isUserInFamily(userId: string, familyId: string): Promise<boolean>
export function isFamilyMember(
  userId: string,
  familyId: string
): Promise<'parent_a' | 'parent_b' | null>

// lib/money.ts
export function formatCents(cents: number): string // 4500 -> "$45.00"
export function dollarsToCents(dollars: number): number // 45.00 -> 4500

// lib/uuid.ts
export function generateUUID(): string

// lib/time.ts
export function getCurrentMonth(): string // "2026-01"
export function formatRelativeTime(date: string): string
```

---

## Ready-to-Implement Checklist

### Issue #12 (Children Management)

- [ ] Track 1 completes Family API (#4)
- [ ] Family membership verification utility available
- [ ] Activity logging function available

### Issue #9 (Question Expense)

- [ ] Track 2 completes Add Expense (#5)
- [ ] Expense list/detail available
- [ ] Activity logging function available

### Issue #10 (Resolve Dispute)

- [ ] Issue #9 (Question Expense) complete
- [ ] Timeout check logic decided

### Issue #11 (Activity Feed)

- [ ] Activity events table populated by other features
- [ ] User name join available

### Issue #13 (Fixed Expenses)

- [ ] Track 2 completes expense infrastructure
- [ ] Subscription/tier checking available (or stub for Free tier)
- [ ] Cron trigger configured in Workers

---

## Summary

This document provides complete API contracts, component hierarchies, and implementation details for all Track 3 issues. The team can begin implementation immediately once dependencies from Track 1 and Track 2 are available.

**Recommended next steps**:

1. Track 1 agent: Complete Family API (#4)
2. Track 2 agent: Complete Add Expense (#5) with activity logging
3. Track 3 agent: Start with Children Management (#12) once Family API is ready
4. All tracks: Coordinate on shared utility functions

**Questions for Captain/PM**:

1. Should fixed expenses generate for the current month if template created mid-month?
2. Confirm 7-day timeout behavior - should it auto-resolve or just allow creator to force-resolve?
3. Activity feed filtering - do we need type filters in v1.0?
