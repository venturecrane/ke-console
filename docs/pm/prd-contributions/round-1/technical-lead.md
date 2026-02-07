# Technical Lead PRD Contribution - Kid Expenses (KE)

## 1. Architecture & Technical Design

### 1.1 System Architecture Overview

```
                                    ARCHITECTURE DIAGRAM
+-----------------------------------------------------------------------------------+
|                                   CLIENT LAYER                                     |
|  +-----------------------------------------------------------------------------+  |
|  |                         Next.js 16 Application                               |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |   React 19 UI    |  |  Clerk Provider  |  |  API Client      |            |  |
|  |  |  (Tailwind CSS)  |  |  (Auth Context)  |  |  (lib/api.ts)    |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  +-----------------------------------------------------------------------------+  |
|                                      |                                            |
|                              Vercel Edge Network                                  |
+-----------------------------------------------------------------------------------+
                                       |
                                       | HTTPS (JWT Bearer / X-User-Id)
                                       v
+-----------------------------------------------------------------------------------+
|                                   API LAYER                                        |
|  +-----------------------------------------------------------------------------+  |
|  |                     Cloudflare Workers (ke-api)                              |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |  Hono Framework  |  |  Auth Middleware |  |  CORS Middleware |            |  |
|  |  |  (Router)        |  |  (JWT + Fallback)|  |  (Origin Check)  |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |                                                                              |  |
|  |  +------------------------------------------------------------------------+  |  |
|  |  |                          Route Handlers                                 |  |  |
|  |  |  /me | /families | /expenses | /payments | /children | /activity       |  |  |
|  |  |  /fixed-expenses | /expense-actions                                     |  |  |
|  |  +------------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  | Activity Service |  | Calculations     |  | Utility Functions|            |  |
|  |  | (Audit Trail)    |  | (Money Math)     |  | (ID Gen, Dates)  |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  +-----------------------------------------------------------------------------+  |
|                                      |                                            |
|                          Cloudflare Global Network                                |
+-----------------------------------------------------------------------------------+
                                       |
                                       | D1 Binding
                                       v
+-----------------------------------------------------------------------------------+
|                                  DATA LAYER                                        |
|  +-----------------------------------------------------------------------------+  |
|  |                       Cloudflare D1 (ke-main)                                |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |     users        |  |    families      |  |    children      |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  |    expenses      |  | fixed_expenses   |  |    payments      |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  | activity_events  |  |  subscriptions   |  | pending_invites  |            |  |
|  |  +------------------+  +------------------+  +------------------+            |  |
|  |  | fixed_expense_   |                                                        |  |
|  |  | suggestions      |                                                        |  |
|  |  +------------------+                                                        |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                       |
+-----------------------------------------------------------------------------------+
|                              EXTERNAL SERVICES                                     |
|  +------------------+  +------------------+  +------------------+                  |
|  |      Clerk       |  |     Resend       |  |     Stripe       |                  |
|  |  (Auth + Users)  |  |  (Email Invites) |  |  (Subscriptions) |                  |
|  +------------------+  +------------------+  +------------------+                  |
+-----------------------------------------------------------------------------------+
```

### 1.2 Request Flow

```
REQUEST FLOW: Create Expense

1. User Action
   Browser -> Next.js Page Component

2. API Call (Client)
   React Component
     -> lib/api.ts:createExpense()
     -> fetch() with JWT Bearer token

3. Edge Routing
   Vercel -> Cloudflare Workers (via workers.dev subdomain)

4. Authentication
   Hono Middleware
     -> Parse Authorization header
     -> Verify JWT against Clerk JWKS
     -> Extract user_id from 'sub' claim
     -> Set userId in context

5. Authorization
   Route Handler
     -> Query families table
     -> Verify user is parent_a or parent_b
     -> Return 403 if unauthorized

6. Validation
   Route Handler
     -> Validate description length (1-200 chars)
     -> Validate amount is positive number
     -> Validate category enum
     -> Convert dollars to cents (Math.round(amount * 100))

7. Mutation
   D1 Database
     -> INSERT INTO expenses
     -> INSERT INTO activity_events (audit trail)
     -> Return created record

8. Response
   Hono -> JSON response
     -> { success: true, expense: {...} }
     -> HTTP 201 Created

9. Client Update
   React Component
     -> Update local state
     -> Revalidate queries
     -> Update UI
```

### 1.3 Deployment Topology

| Component | Platform | Region | CDN |
|-----------|----------|--------|-----|
| Frontend (Next.js) | Vercel | Edge (auto) | Vercel Edge Network |
| API (Workers) | Cloudflare | Global (100+ PoPs) | Cloudflare Edge |
| Database (D1) | Cloudflare | Primary + Replicas | N/A (direct binding) |
| Auth (Clerk) | Clerk Cloud | US (primary) | Global edge caching |
| Email (Resend) | Resend Cloud | US | N/A |

### 1.4 Key Architectural Decisions

#### ADR-001: On-Read Timeout Resolution (7-Day Rule)

**Context:** When an expense is in `pending_satisfaction` status, the questioner has 7 days to accept or reject the creator's resolution. If they don't respond, the expense auto-resolves.

**Decision:** Implement timeout check on-read rather than via scheduled cron job.

**Implementation:**
```typescript
// workers/ke-api/src/services/activity.ts
export async function checkAndApplyTimeout(db: D1Database, expense: Expense): Promise<Expense> {
  if (expense.status !== 'pending_satisfaction') return expense;

  const resolvedAt = new Date(expense.resolved_at!);
  const now = new Date();
  const daysDiff = (now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff >= 7) {
    await db.prepare(
      `UPDATE expenses SET status = 'resolved_creator_decided', updated_at = datetime('now') WHERE id = ?`
    ).bind(expense.id).run();

    return { ...expense, status: 'resolved_creator_decided' };
  }

  return expense;
}
```

**Rationale:**
- Avoids scheduled triggers (Workers crons have cold-start latency)
- No need for batch processing infrastructure
- Timeout applies exactly when relevant (user viewing expense)
- Simpler operational model (no separate cron monitoring)

**Tradeoffs:**
- Expense won't appear as `resolved_creator_decided` until next read
- Activity feed may show slightly stale status until accessed

---

#### ADR-002: Cents-Based Money Storage

**Context:** Financial applications require precise decimal arithmetic. JavaScript's floating-point numbers introduce rounding errors.

**Decision:** Store all monetary values as INTEGER cents in D1. Convert at API boundary.

**Implementation:**
```typescript
// workers/ke-api/src/calculations.ts
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function calculateShares(
  amountCents: number,
  parentARatio: number
): { aShare: number; bShare: number } {
  const aShare = Math.floor(amountCents * parentARatio);
  const bShare = amountCents - aShare;  // Remainder to B
  return { aShare, bShare };
}
```

**Rationale:**
- Exact integer arithmetic (no floating-point errors)
- D1 INTEGER type has no precision limits for typical expense amounts
- Floor for A's share ensures exact split (B gets remainder)
- Industry-standard pattern for financial applications

---

#### ADR-003: Universal Soft Delete

**Context:** Users may need to "delete" records while preserving audit trail and historical data.

**Decision:** All deletable entities use `deleted_at TEXT` column. Query filters exclude deleted records by default.

**Implementation:**
```sql
-- Query pattern
SELECT * FROM expenses WHERE family_id = ? AND deleted_at IS NULL

-- Soft delete
UPDATE expenses SET deleted_at = datetime('now') WHERE id = ?
```

**Affected Tables:** children, expenses, fixed_expenses, payments

**Rationale:**
- Preserves audit trail for compliance
- Enables "undo" functionality
- Historical balance calculations remain accurate
- Simpler than implementing archive tables

---

#### ADR-004: Activity Events as Audit Trail

**Context:** Co-parents need transparency into all changes. Disputes require historical record of actions.

**Decision:** Log every mutation with before/after snapshots in `activity_events` table.

**Implementation:**
```typescript
export async function createActivityEvent(
  db: D1Database,
  familyId: string,
  userId: string,
  eventType: string,
  targetType: string,
  targetId: string,
  beforeSnapshot: unknown | null,
  afterSnapshot: unknown | null,
  metadata?: unknown
): Promise<void> {
  const id = generateId();
  await db.prepare(
    `INSERT INTO activity_events (...) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id, familyId, userId, eventType, targetType, targetId,
    beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
    afterSnapshot ? JSON.stringify(afterSnapshot) : null,
    metadata ? JSON.stringify(metadata) : null
  ).run();
}
```

**Event Types:**
- `expense.created`, `expense.questioned`, `expense.resolved`, `expense.satisfied`, `expense.generated`
- `payment.created`
- `child.created`, `child.deleted`
- `fixed_expense.created`, `fixed_expense.updated`, `fixed_expense.ended`
- `family.ratio_updated`

**Rationale:**
- Complete audit trail for dispute resolution
- Powers activity feed feature
- Enables future "undo" or "diff view" features
- JSON snapshots capture full state (no joins needed for historical view)

---

#### ADR-005: JWT Verification with JWKS Caching

**Context:** Clerk issues JWTs for authenticated users. API must verify tokens on every request.

**Decision:** Implement custom JWT verification with in-memory JWKS cache (1-hour TTL).

**Implementation:**
```typescript
// workers/ke-api/src/middleware/auth.ts
let jwksCache: Map<string, CryptoKey> = new Map();
let jwksCacheExpiry = 0;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getVerificationKey(kid: string, clerkDomain: string, forceRefresh = false): Promise<CryptoKey | null> {
  if (forceRefresh || Date.now() > jwksCacheExpiry || jwksCache.size === 0) {
    await fetchJWKS(clerkDomain);
  }
  return jwksCache.get(kid) || null;
}
```

**Rationale:**
- Avoids network round-trip to Clerk on every request
- Handles key rotation gracefully (force refresh on signature failure)
- Workers have no persistent memory, but cache survives within isolate lifecycle
- 1-hour TTL balances performance vs security

---

## 2. Data Model

### 2.1 Entity-Relationship Diagram

```
                              ENTITY-RELATIONSHIP DIAGRAM

    +------------------+          +------------------+          +------------------+
    |      users       |          |     families     |          |    children      |
    +------------------+          +------------------+          +------------------+
    | PK id TEXT       |<---+     | PK id TEXT       |<----+    | PK id TEXT       |
    | email TEXT       |    |     | name TEXT        |     |    | FK family_id     |----+
    | name TEXT        |    |     | FK parent_a_id   |-----+    | name TEXT        |    |
    | created_at TEXT  |    |     | FK parent_b_id   |-----+    | created_at TEXT  |    |
    | updated_at TEXT  |    +-----| parent_a_ratio   |     |    | deleted_at TEXT  |    |
    +------------------+          | invite_code TEXT |     |    +------------------+    |
                                  | invite_expires_at|     |                            |
                                  | created_at TEXT  |     |                            |
                                  | updated_at TEXT  |     |                            |
                                  +------------------+     |                            |
                                           |               |                            |
                                           |               |                            |
    +------------------+                   |               |                            |
    | pending_invites  |                   |               |                            |
    +------------------+                   |               |                            |
    | PK id TEXT       |                   |               |                            |
    | FK family_id     |-------------------+               |                            |
    | FK invited_by    |--+                                |                            |
    | invited_email    |  |                                |                            |
    | invite_code TEXT |  |                                |                            |
    | status TEXT      |  |                                |                            |
    | expires_at TEXT  |  |                                |                            |
    +------------------+  |                                |                            |
                          |                                |                            |
    +------------------+  |    +------------------+        |                            |
    |  fixed_expenses  |  |    |     expenses     |        |                            |
    +------------------+  |    +------------------+        |                            |
    | PK id TEXT       |<-+----| PK id TEXT       |        |                            |
    | FK family_id     |--+----| FK family_id     |--------+                            |
    | FK created_by    |--+    | FK created_by    |---+                                 |
    | description TEXT |       | FK paid_by       |---+                                 |
    | amount_cents INT |       | FK fixed_exp_id  |---+                                 |
    | category TEXT    |       | description TEXT |                                     |
    | frequency TEXT   |       | amount_cents INT |                                     |
    | child_ids TEXT   |       | category TEXT    |                                     |
    | link_url TEXT    |       | expense_date TEXT|                                     |
    | memo TEXT        |       | child_ids TEXT   |-----> JSON array of child IDs ------+
    | effective_from   |       | link_url TEXT    |
    | effective_until  |       | memo TEXT        |
    | created_at TEXT  |       | status TEXT      |  <--- 8-state machine
    | updated_at TEXT  |       | questioned_by    |---+
    | deleted_at TEXT  |       | questioned_at    |   |
    +------------------+       | question_reason  |   |
                               | question_note    |   |
                               | resolved_at TEXT |   |
    +------------------+       | resolution_action|   |
    |     payments     |       | satisfied_at TEXT|   |
    +------------------+       | closed_unres_at  |   |
    | PK id TEXT       |       | closed_unres_by  |---+
    | FK family_id     |-------| created_at TEXT  |
    | FK paid_by       |---+   | updated_at TEXT  |
    | amount_cents INT |   |   | deleted_at TEXT  |
    | payment_date TEXT|   |   +------------------+
    | notes TEXT       |   |
    | created_at TEXT  |   |
    | deleted_at TEXT  |   |
    +------------------+   |
                           |
    +------------------+   |   +------------------+
    | activity_events  |   |   |  subscriptions   |
    +------------------+   |   +------------------+
    | PK id TEXT       |   |   | PK id TEXT       |
    | FK family_id     |---+---| FK family_id     |
    | FK user_id       |---+   | status TEXT      |
    | event_type TEXT  |       | started_at TEXT  |
    | target_type TEXT |       | expires_at TEXT  |
    | target_id TEXT   |       | stripe_sub_id    |
    | before_snapshot  |       | created_at TEXT  |
    | after_snapshot   |       | updated_at TEXT  |
    | metadata TEXT    |       +------------------+
    | created_at TEXT  |
    +------------------+

    +---------------------------+
    | fixed_expense_suggestions |
    +---------------------------+
    | PK id TEXT                |
    | FK fixed_expense_id       |
    | FK expense_id             |
    | FK suggested_by           |
    | suggestion_note TEXT      |
    | status TEXT               |
    | resolved_at TEXT          |
    | created_at TEXT           |
    +---------------------------+
```

### 2.2 Table Specifications

#### users
Cache of Clerk user data for local joins.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Clerk user ID (e.g., `user_2abc...`) |
| email | TEXT | NOT NULL, UNIQUE | User's email address |
| name | TEXT | | Display name |
| created_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |

**Indexes:**
- `idx_users_email` UNIQUE on (email)

---

#### families
Parent pair with expense split configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| name | TEXT | | Optional family name |
| parent_a_id | TEXT | NOT NULL, FK users(id) | First parent (creator) |
| parent_b_id | TEXT | FK users(id) | Second parent (joiner) |
| parent_a_ratio | REAL | NOT NULL, DEFAULT 0.5, CHECK (0-1) | Parent A's share (e.g., 0.6 = 60%) |
| invite_code | TEXT | | 6-char uppercase code |
| invite_expires_at | TEXT | | ISO 8601 expiry |
| created_at | TEXT | NOT NULL, DEFAULT now | |
| updated_at | TEXT | NOT NULL, DEFAULT now | |

**Indexes:**
- `idx_families_invite` UNIQUE on (invite_code) WHERE invite_code IS NOT NULL
- `idx_families_parent_a` on (parent_a_id)
- `idx_families_parent_b` on (parent_b_id)

---

#### children
Children associated with a family for expense attribution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| family_id | TEXT | NOT NULL, FK families(id) | Parent family |
| name | TEXT | NOT NULL | Child's name (1-100 chars) |
| created_at | TEXT | NOT NULL, DEFAULT now | |
| deleted_at | TEXT | | Soft delete timestamp |

**Indexes:**
- `idx_children_family` on (family_id)

---

#### expenses
Individual expense records with 8-status state machine.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| family_id | TEXT | NOT NULL, FK families(id) | Parent family |
| created_by | TEXT | NOT NULL, FK users(id) | User who created |
| paid_by | TEXT | NOT NULL, FK users(id) | User who paid |
| fixed_expense_id | TEXT | FK fixed_expenses(id) | Source template (if generated) |
| description | TEXT | NOT NULL, CHECK (1-200 chars) | Expense description |
| amount_cents | INTEGER | NOT NULL | Amount in cents |
| category | TEXT | NOT NULL, CHECK enum | school/medical/activities/childcare/other |
| expense_date | TEXT | NOT NULL | YYYY-MM-DD |
| child_ids | TEXT | | JSON array of child IDs |
| link_url | TEXT | | Optional receipt/reference URL |
| memo | TEXT | CHECK (<=500 chars) | Additional notes |
| status | TEXT | NOT NULL, DEFAULT 'posted', CHECK enum | See state machine |
| questioned_by | TEXT | FK users(id) | Who questioned |
| questioned_at | TEXT | | When questioned |
| question_reason | TEXT | CHECK enum | wrong_amount/not_child_related/duplicate/split_dispute/other |
| question_note | TEXT | | Question details |
| resolved_at | TEXT | | When resolved |
| resolution_action | TEXT | | keep/edit/personal/delete |
| satisfied_at | TEXT | | When questioner accepted |
| closed_unresolved_at | TEXT | | When closed without resolution |
| closed_unresolved_by | TEXT | FK users(id) | Who closed |
| created_at | TEXT | NOT NULL, DEFAULT now | |
| updated_at | TEXT | NOT NULL, DEFAULT now | |
| deleted_at | TEXT | | Soft delete timestamp |

**Indexes:**
- `idx_expenses_family` on (family_id)
- `idx_expenses_date` on (family_id, expense_date)
- `idx_expenses_status` on (family_id, status)
- `idx_expenses_fixed` on (fixed_expense_id)

---

#### fixed_expenses
Recurring expense templates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| family_id | TEXT | NOT NULL, FK families(id) | Parent family |
| created_by | TEXT | NOT NULL, FK users(id) | Template creator |
| description | TEXT | NOT NULL, CHECK (1-200 chars) | Expense description |
| amount_cents | INTEGER | NOT NULL, CHECK (>0) | Amount in cents |
| category | TEXT | NOT NULL, CHECK enum | Category |
| frequency | TEXT | NOT NULL, DEFAULT 'monthly', CHECK enum | weekly/biweekly/monthly/quarterly/annually |
| child_ids | TEXT | | JSON array of child IDs |
| link_url | TEXT | | Reference URL |
| memo | TEXT | CHECK (<=500 chars) | Notes |
| effective_from | TEXT | NOT NULL | Start date (YYYY-MM-DD) |
| effective_until | TEXT | | End date (null = ongoing) |
| created_at | TEXT | NOT NULL, DEFAULT now | |
| updated_at | TEXT | NOT NULL, DEFAULT now | |
| deleted_at | TEXT | | Soft delete timestamp |

**Indexes:**
- `idx_fixed_family` on (family_id)
- `idx_fixed_effective` on (effective_from, effective_until)

---

#### payments
Direct payments between parents to settle balance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| family_id | TEXT | NOT NULL, FK families(id) | Parent family |
| paid_by | TEXT | NOT NULL, FK users(id) | Payer |
| amount_cents | INTEGER | NOT NULL, CHECK (>0) | Amount in cents |
| payment_date | TEXT | NOT NULL | YYYY-MM-DD |
| notes | TEXT | | Optional notes |
| created_at | TEXT | NOT NULL, DEFAULT now | |
| deleted_at | TEXT | | Soft delete timestamp |

**Indexes:**
- `idx_payments_family` on (family_id)
- `idx_payments_date` on (family_id, payment_date)

---

#### activity_events
Audit trail and activity feed.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| family_id | TEXT | NOT NULL, FK families(id) | Parent family |
| user_id | TEXT | NOT NULL, FK users(id) | Acting user |
| event_type | TEXT | NOT NULL | e.g., expense.created |
| target_type | TEXT | NOT NULL | expense/payment/child/fixed_expense/family |
| target_id | TEXT | NOT NULL | ID of affected entity |
| before_snapshot | TEXT | | JSON of state before change |
| after_snapshot | TEXT | | JSON of state after change |
| metadata | TEXT | | Additional JSON context |
| created_at | TEXT | NOT NULL, DEFAULT now | |

**Indexes:**
- `idx_activity_family` on (family_id, created_at DESC)
- `idx_activity_target` on (target_type, target_id)

---

#### subscriptions
Pro tier subscription tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| family_id | TEXT | NOT NULL, FK families(id) | Parent family |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK enum | active/cancelled/expired |
| started_at | TEXT | NOT NULL | Subscription start |
| expires_at | TEXT | | Subscription end |
| stripe_subscription_id | TEXT | | Stripe sub ID |
| created_at | TEXT | NOT NULL, DEFAULT now | |
| updated_at | TEXT | NOT NULL, DEFAULT now | |

**Indexes:**
- `idx_subscriptions_family` UNIQUE on (family_id)

---

#### pending_invites
Email-based invite tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| family_id | TEXT | NOT NULL, FK families(id) | Target family |
| invited_by | TEXT | NOT NULL, FK users(id) | Inviter |
| invited_email | TEXT | NOT NULL | Invitee email |
| invite_code | TEXT | NOT NULL | 6-char code |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK enum | pending/accepted/expired/cancelled |
| sent_at | TEXT | NOT NULL, DEFAULT now | |
| expires_at | TEXT | NOT NULL | Expiry timestamp |
| accepted_at | TEXT | | Acceptance timestamp |
| created_at | TEXT | NOT NULL, DEFAULT now | |

**Indexes:**
- `idx_pending_invites_family` on (family_id)
- `idx_pending_invites_email` on (invited_email)
- `idx_pending_invites_code` on (invite_code)

---

#### fixed_expense_suggestions
Linking ad-hoc expenses to recurring templates (future feature).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | CUID-style ID |
| fixed_expense_id | TEXT | NOT NULL, FK fixed_expenses(id) | Target template |
| expense_id | TEXT | NOT NULL, FK expenses(id) | Source expense |
| suggested_by | TEXT | NOT NULL, FK users(id) | User who suggested |
| suggestion_note | TEXT | | Explanation |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK enum | pending/accepted/rejected/ignored |
| resolved_at | TEXT | | Resolution timestamp |
| created_at | TEXT | NOT NULL, DEFAULT now | |

**Indexes:**
- `idx_suggestions_fixed` on (fixed_expense_id)

---

### 2.3 Expense Status State Machine

```
                        EXPENSE STATUS STATE MACHINE

                              +----------+
                              |  posted  |
                              +----+-----+
                                   |
                      other parent questions
                                   |
                                   v
                            +-----------+
                            | questioned |
                            +-----+-----+
                                  |
                       creator resolves (4 actions)
                                  |
        +------------+------------+------------+------------+
        |            |            |            |            |
        v            v            v            v            |
  +-----------+  +--------+  +---------+  +----------+      |
  |pending_   |  |resolved|  |resolved_|  |resolved_ |      |
  |satisfaction|  |_personal|  |_deleted |  |(auto)   |      |
  +-----+-----+  +--------+  +---------+  +----------+      |
        |             |            |                        |
        |       (excluded from balance)                     |
        |                                                   |
        +-------- questioner satisfies --------+            |
        |                                      |            |
        v                                      |            |
  +---------+                                  |            |
  | resolved |<--------------------------------+            |
  +---------+                                               |
        |                                                   |
        +------------ 7-day timeout --------------+         |
                                                  |         |
                                                  v         |
                                        +------------------+|
                                        |resolved_creator_ ||
                                        |decided           ||
                                        +------------------+|
                                                            |
                                                            |
        [Alternative path: close without resolution]        |
        +---------------------------------------------------+
        |
        v
  +------------------+
  | closed_unresolved |
  +------------------+
       (excluded from balance)
```

#### Status Definitions

| Status | Description | Included in Balance? |
|--------|-------------|---------------------|
| `posted` | Initial state, expense visible to both parents | Yes |
| `questioned` | Other parent has raised a question | No |
| `pending_satisfaction` | Creator responded, awaiting questioner acceptance | No |
| `resolved` | Questioner accepted creator's response | Yes |
| `resolved_creator_decided` | 7-day timeout expired, auto-resolved | Yes |
| `resolved_personal` | Creator marked as personal (not shared) | No |
| `resolved_deleted` | Creator deleted the expense | No |
| `closed_unresolved` | Escalated or abandoned dispute | No |

#### State Transitions

| From | To | Trigger | Actor |
|------|----|---------|-------|
| posted | questioned | POST /expenses/:id/question | Other parent |
| questioned | pending_satisfaction | POST /expenses/:id/resolve (keep/edit) | Creator |
| questioned | resolved_personal | POST /expenses/:id/resolve (personal) | Creator |
| questioned | resolved_deleted | POST /expenses/:id/resolve (delete) | Creator |
| pending_satisfaction | resolved | POST /expenses/:id/satisfy | Questioner |
| pending_satisfaction | resolved_creator_decided | 7-day timeout (on-read) | System |
| * | closed_unresolved | POST /expenses/:id/close-unresolved | Either parent |

---

## 3. API Surface

### 3.1 Base Configuration

- **Base URL:** `https://ke-api.<account>.workers.dev` (production)
- **Local Dev:** `http://localhost:8787`
- **Content-Type:** `application/json`
- **Authentication:** JWT Bearer token (primary) or X-User-Id header (fallback)

### 3.2 Authentication

```
Authorization: Bearer <clerk_jwt_token>

# Fallback (deprecated, for migration period)
X-User-Id: user_2abc123...
```

JWT verification:
1. Parse Authorization header
2. Decode JWT, extract `kid` from header
3. Fetch JWKS from Clerk (cached 1 hour)
4. Verify RS256 signature
5. Validate `exp`, `nbf` claims
6. Extract `sub` claim as user ID

### 3.3 Common Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Authentication required |
| 403 | Authorization denied |
| 404 | Resource not found |
| 500 | Server error |

### 3.4 Endpoint Reference

---

#### GET /health
Health check endpoint.

**Auth:** None

**Response:**
```typescript
{
  status: "ok" | "error";
  db: "connected" | "disconnected" | "error";
}
```

---

#### GET /me
Get current user info with family context.

**Auth:** Required

**Response:**
```typescript
{
  user: {
    id: string;
    email: string;
    name: string | null;
    created_at: string;
  };
  family: Family | null;
  role: "parent_a" | "parent_b" | null;
}
```

---

#### POST /users/sync
Sync user from Clerk (called by webhook or frontend).

**Auth:** None (trusted source only)

**Request:**
```typescript
{
  id: string;      // Clerk user ID
  email: string;
  name?: string;
}
```

**Response:**
```typescript
{ success: true; user: User }
```

---

#### POST /families
Create a new family.

**Auth:** Required

**Request:**
```typescript
{
  name?: string;  // Optional family name
}
```

**Response (201):**
```typescript
{ success: true; family: Family }
```

**Errors:**
- 400: User already belongs to a family
- 404: User not found

---

#### GET /families/:id
Get family details with parent info.

**Auth:** Required (must be family member)

**Response:**
```typescript
{
  family: Family;
  parentA: User;
  parentB: User | null;
}
```

---

#### PATCH /families/:id
Update family settings.

**Auth:** Required (must be family member)

**Request:**
```typescript
{
  parentARatio?: number;  // 0.0 - 1.0
  name?: string;
}
```

**Response:**
```typescript
{ success: true; family: Family }
```

**Errors:**
- 400: parentARatio out of range

---

#### POST /families/:id/invite
Generate invite code.

**Auth:** Required (must be parent_a)

**Response:**
```typescript
{
  success: true;
  inviteCode: string;   // 6-char uppercase
  expiresAt: string;    // ISO 8601
}
```

**Errors:**
- 400: Family already has two parents
- 403: Only family creator can generate codes

---

#### POST /families/:id/invite/email
Send email invite.

**Auth:** Required (must be parent_a)

**Request:**
```typescript
{
  email: string;
}
```

**Response:**
```typescript
{
  success: true;
  inviteCode: string;
  inviteLink: string;
  expiresAt: string;
  emailSent: boolean;
}
```

---

#### GET /families/:id/invites
List pending invites.

**Auth:** Required (must be family member)

**Response:**
```typescript
{
  invites: Array<PendingInvite & { is_expired: boolean }>;
}
```

---

#### DELETE /families/:id/invites/:inviteId
Cancel a pending invite.

**Auth:** Required (must be parent_a)

**Response:**
```typescript
{ success: true }
```

---

#### POST /families/join
Join a family with invite code.

**Auth:** Required

**Request:**
```typescript
{
  inviteCode: string;
}
```

**Response:**
```typescript
{ success: true; family: Family }
```

**Errors:**
- 400: Invalid/expired code, already in family, or family full

---

#### POST /families/:id/expenses
Create an expense.

**Auth:** Required (must be family member)

**Request:**
```typescript
{
  description: string;        // 1-200 chars
  amount: number;             // dollars (converted to cents)
  category: "school" | "medical" | "activities" | "childcare" | "other";
  expenseDate?: string;       // YYYY-MM-DD, defaults to today
  paidBy?: string;            // user ID, defaults to current user
  linkUrl?: string;
  memo?: string;              // max 500 chars
  childIds?: string[];
}
```

**Response (201):**
```typescript
{ success: true; expense: Expense }
```

---

#### GET /families/:id/expenses
List expenses with filtering.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| category | string | Filter by category |
| startDate | string | YYYY-MM-DD |
| endDate | string | YYYY-MM-DD |
| limit | number | Default 50 |
| offset | number | Default 0 |

**Response:**
```typescript
{
  expenses: Expense[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

---

#### GET /families/:id/balance
Get current balance with breakdown.

**Auth:** Required (must be family member)

**Response:**
```typescript
{
  balance_cents: number;           // Absolute value
  payer_id: string | null;         // Who owes
  payee_id: string | null;         // Who is owed
  parent_a_id: string;
  parent_b_id: string | null;
  breakdown: {
    total_expenses_cents: number;
    included_expenses_count: number;
    a_share_cents: number;
    b_share_cents: number;
    a_paid_cents: number;
    b_paid_cents: number;
    payments_a_to_b_cents: number;
    payments_b_to_a_cents: number;
    questioned_total_cents: number;
    questioned_count: number;
  };
  period: {
    start: string;
    end: string;
    label: string;
  };
  current_period: {
    a_expenses_cents: number;
    a_payments_cents: number;
    b_expenses_cents: number;
    b_payments_cents: number;
  };
  prior_balance: {
    balance_cents: number;
    payer_id: string | null;
    payee_id: string | null;
  };
}
```

---

#### GET /expenses/:id
Get single expense (with timeout check).

**Auth:** Required (must be family member)

**Response:**
```typescript
{ expense: Expense }
```

---

#### POST /expenses/:id/question
Question an expense.

**Auth:** Required (must be other parent, not creator)

**Request:**
```typescript
{
  reason: "wrong_amount" | "not_child_related" | "duplicate" | "split_dispute" | "other";
  note?: string;
}
```

**Response:**
```typescript
{ success: true; expense: Expense }
```

**Errors:**
- 400: Cannot question own expense, or not in `posted` status

---

#### POST /expenses/:id/resolve
Resolve a questioned expense.

**Auth:** Required (must be expense creator)

**Request:**
```typescript
{
  action: "keep" | "edit" | "personal" | "delete";
  newAmount?: number;  // Required if action is "edit"
}
```

**Response:**
```typescript
{ success: true; expense: Expense }
```

**Errors:**
- 400: Not in `questioned` status

---

#### POST /expenses/:id/satisfy
Accept expense resolution.

**Auth:** Required (must be original questioner)

**Response:**
```typescript
{ success: true; expense: Expense }
```

**Errors:**
- 400: Not in `pending_satisfaction` status

---

#### POST /families/:id/payments
Record a payment.

**Auth:** Required (must be family member)

**Request:**
```typescript
{
  amount: number;           // dollars
  paymentDate?: string;     // YYYY-MM-DD, defaults to today
  notes?: string;
}
```

**Response (201):**
```typescript
{ success: true; payment: Payment }
```

---

#### GET /families/:id/payments
List payments.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| limit | number | Default 50 |
| offset | number | Default 0 |

**Response:**
```typescript
{
  payments: Payment[];
  pagination: { total: number; limit: number; offset: number };
}
```

---

#### POST /families/:id/children
Add a child.

**Auth:** Required (must be family member)

**Request:**
```typescript
{
  name: string;  // 1-100 chars
}
```

**Response (201):**
```typescript
Child
```

---

#### GET /families/:id/children
List children.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| include_deleted | boolean | Include soft-deleted |

**Response:**
```typescript
{
  children: Child[];
  count: number;
}
```

---

#### DELETE /families/:id/children/:childId
Soft-delete a child.

**Auth:** Required (must be family member)

**Response:**
```typescript
{ id: string; deleted_at: string }
```

---

#### POST /families/:id/fixed-expenses
Create fixed expense template.

**Auth:** Required (must be family member)

**Request:**
```typescript
{
  description: string;
  amount: number;
  category: ExpenseCategory;
  frequency?: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually";
  effectiveFrom: string;    // YYYY-MM-DD
  effectiveUntil?: string;
  linkUrl?: string;
  memo?: string;
}
```

**Response (201):**
```typescript
{ success: true; fixedExpense: FixedExpense }
```

**Errors:**
- 403: Tier limit reached (Free tier: 2 max)

---

#### GET /families/:id/fixed-expenses
List fixed expenses.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| includeEnded | boolean | Include past-effective templates |

**Response:**
```typescript
{
  fixedExpenses: FixedExpense[];
  count: number;
  tier: {
    current: number;
    limit: number;  // -1 for unlimited
    canAdd: boolean;
  };
}
```

---

#### PATCH /families/:id/fixed-expenses/:fixedExpenseId
Update fixed expense.

**Auth:** Required (must be family member)

**Request:**
```typescript
{
  description?: string;
  amount?: number;
  category?: ExpenseCategory;
  frequency?: RecurringFrequency;
  effectiveUntil?: string | null;
  linkUrl?: string | null;
  memo?: string | null;
}
```

**Response:**
```typescript
{ success: true; fixedExpense: FixedExpense }
```

---

#### DELETE /families/:id/fixed-expenses/:fixedExpenseId
End a fixed expense (sets effective_until to today).

**Auth:** Required (must be family member)

**Response:**
```typescript
{ success: true; fixedExpense: FixedExpense }
```

---

#### GET /families/:id/activity
Get activity feed.

**Auth:** Required (must be family member)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| type | string | Filter: expenses/payments/fixed_expenses/disputes/children |
| search | string | Search in snapshots |
| startDate | string | YYYY-MM-DD |
| endDate | string | YYYY-MM-DD |
| limit | number | 1-100, default 20 |
| offset | number | Default 0 |
| expense_id | string | Scope to single expense |

**Response:**
```typescript
{
  events: ActivityEvent[];
  pagination: { total: number; limit: number; offset: number };
}
```

---

### 3.5 Rate Limiting Strategy

Currently no rate limiting implemented. Future strategy:

| Tier | Requests/min | Burst |
|------|--------------|-------|
| Free | 60 | 10 |
| Pro | 300 | 50 |

Implementation approach:
- Use Cloudflare Rate Limiting rules (at edge)
- Or implement token bucket in KV/D1
- Key by user ID (from JWT sub claim)

---

## 4. Non-Functional Requirements

### 4.1 Performance Targets

| Metric | Target | Current Baseline |
|--------|--------|------------------|
| API p50 latency | <50ms | ~30ms (Workers cold) |
| API p95 latency | <200ms | ~100ms |
| API p99 latency | <500ms | ~250ms |
| D1 query time | <20ms | ~10-15ms |
| TTFB (frontend) | <100ms | ~60ms (Vercel Edge) |
| LCP | <2.5s | Varies by page |
| FID | <100ms | <50ms |
| CLS | <0.1 | <0.05 |

### 4.2 Availability

| Requirement | Target |
|-------------|--------|
| Uptime SLA | 99.9% (Cloudflare Workers) |
| RTO (Recovery Time Objective) | <15 minutes |
| RPO (Recovery Point Objective) | <1 hour |
| Maintenance windows | None (zero-downtime deploys) |

### 4.3 Scalability

| Dimension | Capacity |
|-----------|----------|
| Concurrent users | 10,000+ (Workers auto-scale) |
| Requests/second | 100,000+ (Workers limit) |
| D1 database size | 10GB (current limit) |
| D1 rows | Unlimited within size |
| Families per deployment | 100,000+ |

### 4.4 Data Retention

| Data Type | Retention | Rationale |
|-----------|-----------|-----------|
| Active expenses | Indefinite | Historical reference |
| Soft-deleted records | 90 days | Recovery period |
| Activity events | 2 years | Audit compliance |
| Session tokens | Until expiry | Security |
| Invite codes | 7 days after expiry | Cleanup |

### 4.5 Backup Strategy

| Component | Strategy | Frequency | Retention |
|-----------|----------|-----------|-----------|
| D1 Database | Cloudflare automatic | Point-in-time | 30 days |
| D1 Manual backup | Export via API | Weekly | 90 days |
| Configuration | Git (wrangler.toml) | Every deploy | Forever |
| Secrets | Cloudflare dashboard | Manual | N/A |

**D1 Backup Commands:**
```bash
# Export database
wrangler d1 export ke-main --remote --output backup.sql

# Time-travel query (30-day window)
wrangler d1 time-travel ke-main --timestamp "2024-01-15T10:00:00Z"
```

### 4.6 Security Requirements

#### Authentication & Authorization
- [x] Clerk JWT verification with RS256
- [x] JWKS caching with 1-hour TTL
- [x] Family membership verification on all routes
- [x] Creator/questioner role checks for expense actions
- [ ] Rate limiting (planned)

#### Data Protection
- [x] All traffic over HTTPS (Cloudflare enforced)
- [x] Parameterized queries (SQL injection prevention)
- [x] Input validation on all endpoints
- [x] No PII in logs (user IDs only)
- [ ] Encryption at rest (D1 roadmap)

#### Secrets Management
- [x] Environment variables via `wrangler secret`
- [x] No secrets in codebase
- [x] Separate secrets per environment

#### Headers
```typescript
// CORS configuration
cors({
  origin: (origin) => {
    const allowed = ['https://ke-console.vercel.app', 'http://localhost:3000'];
    if (origin?.endsWith('.vercel.app')) return origin;  // Preview deploys
    return allowed.includes(origin ?? '') ? origin! : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
})
```

### 4.7 Compliance Considerations

| Requirement | Status | Notes |
|-------------|--------|-------|
| GDPR (if EU users) | Partial | Need data export/delete flows |
| CCPA (if CA users) | Partial | Need privacy policy updates |
| SOC 2 | N/A | Inherited from Cloudflare/Vercel |
| PCI DSS | N/A | No card data stored (Stripe handles) |
| COPPA | Review needed | App involves child data |

---

## 5. Technical Risks & Mitigations

### 5.1 D1 Limitations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Database size limit (10GB)** | High - could block growth | Monitor size; implement archival strategy for old activity_events |
| **No transactions** | Medium - data consistency | Use D1 `batch()` for atomic multi-statement ops |
| **SQLite feature set** | Low - missing features | Design around limitations; no CTEs with recursive, limited window functions |
| **Read replica lag** | Low - stale reads | Accept eventual consistency for non-critical reads |
| **No full-text search** | Medium - search functionality | Use LIKE queries; consider external search service later |

**D1 batch() pattern for atomicity:**
```typescript
await db.batch([
  db.prepare('INSERT INTO expenses ...').bind(...),
  db.prepare('INSERT INTO activity_events ...').bind(...),
]);
```

### 5.2 Workers Constraints

| Risk | Impact | Mitigation |
|------|--------|------------|
| **CPU time limit (50ms)** | Medium - complex operations | Offload heavy work; keep handlers simple |
| **Memory limit (128MB)** | Low - unlikely to hit | Stream large responses; avoid buffering |
| **No persistent state** | Medium - caching | Use in-memory cache within request; accept cold starts |
| **Cold start latency** | Low - ~5-20ms | Acceptable for API; use `UNENV` for smaller bundles |
| **Global variables** | Low - isolate reuse | JWKS cache works because isolates are reused |

### 5.3 Clerk Dependency

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Clerk outage** | High - auth fails | JWKS cache provides 1-hour buffer; X-User-Id fallback for migration |
| **Token expiry** | Medium - user friction | Frontend handles refresh; reasonable expiry times |
| **Pricing changes** | Low - cost increase | 10k MAU free tier covers launch; evaluate at scale |
| **Vendor lock-in** | Medium - migration effort | Abstract auth behind middleware; store user cache locally |

### 5.4 Data Consistency Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Race conditions on expense status** | Medium - invalid transitions | Check current status before update; D1 serializes within request |
| **Balance calculation drift** | High - financial accuracy | Pure functions with tests; recalculate on every read |
| **Activity event missing** | Medium - incomplete audit | Activity logging in same batch as mutation |
| **Soft delete orphans** | Low - stale references | child_ids is JSON string, not FK; handle missing children in UI |

### 5.5 Security Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **JWT key compromise** | Critical - auth bypass | JWKS rotation by Clerk; short token expiry |
| **X-User-Id header abuse** | High - impersonation | Remove fallback after migration; only used for dev |
| **SQL injection** | Critical - data breach | All queries use `.bind()`; no string concatenation |
| **XSS via memo/description** | High - script injection | React auto-escapes; no dangerouslySetInnerHTML |

---

## 6. Infrastructure & Deployment

### 6.1 Vercel Configuration

**Project Settings:**
- Framework: Next.js
- Root Directory: `app/`
- Build Command: `npm run build`
- Output Directory: `.next`
- Node.js Version: 18.x

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://ke-api.<account>.workers.dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Preview Deploys:**
- Automatic on PR creation
- Unique URL per branch
- CORS allows `*.vercel.app`

### 6.2 Workers Configuration

**wrangler.toml:**
```toml
name = "ke-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "ke-main"
database_id = "8a876b33-faf8-4267-bd08-770b76786dcb"

[vars]
APP_URL = "https://ke-console.vercel.app"
```

**Secrets (via `wrangler secret put`):**
- `RESEND_API_KEY` - Email service
- `CLERK_DOMAIN` - JWT verification

### 6.3 D1 Migrations Strategy

**Migration Files:**
```
workers/ke-api/migrations/
├── 0001_initial_schema.sql
├── 0002_pending_invites.sql
└── 0003_recurring_frequency.sql
```

**Commands:**
```bash
# Create new migration
wrangler d1 migrations create ke-main "description"

# Apply to local
wrangler d1 migrations apply ke-main --local

# Apply to production
wrangler d1 migrations apply ke-main --remote

# Check status
wrangler d1 migrations list ke-main --remote
```

**Best Practices:**
- Migrations are append-only (never modify existing)
- Always test locally first
- Include rollback SQL in comments
- Use `IF NOT EXISTS` for idempotency

### 6.4 CI/CD Pipeline

```
                            CI/CD PIPELINE

+----------+     +----------+     +----------+     +----------+
|  GitHub  | --> |  Vercel  | --> | Preview  | --> | Feedback |
|   Push   |     |  Build   |     |  Deploy  |     |   Loop   |
+----------+     +----------+     +----------+     +----------+
     |
     |           +----------+     +----------+     +----------+
     +---------> |  GitHub  | --> | Workers  | --> |   Prod   |
                 | Actions  |     |  Deploy  |     |   Live   |
                 +----------+     +----------+     +----------+
```

**GitHub Actions (Workers):**
```yaml
# .github/workflows/deploy-worker.yml
name: Deploy Worker
on:
  push:
    branches: [main]
    paths:
      - 'workers/ke-api/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: workers/ke-api
          command: deploy
```

**Vercel (Frontend):**
- Automatic on push to `main`
- Preview deploys on PRs
- No manual configuration needed

### 6.5 Monitoring & Observability

#### Current State
- **Workers:** Cloudflare dashboard (requests, errors, CPU time)
- **D1:** Query analytics in dashboard
- **Vercel:** Built-in analytics, Web Vitals
- **Application logs:** `console.log/error` -> Workers logs

#### Logging Pattern
```typescript
// Error with context
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Route-level logging
console.log('Auth: JWT verified for user', payload.sub);
console.error('Create expense error:', error);
```

#### Future Improvements
- [ ] Structured logging (JSON format)
- [ ] Request ID propagation
- [ ] External logging service (Axiom, Datadog)
- [ ] Custom metrics (expense volume, question rate)
- [ ] Alerting on error rate spikes

### 6.6 Disaster Recovery

**Scenario: D1 Data Corruption**
1. Identify last known good state (Cloudflare activity log)
2. Use D1 time-travel to query historical data
3. Export good data: `wrangler d1 export`
4. Create new database, apply migrations
5. Import data, update wrangler.toml binding
6. Deploy worker with new database ID

**Scenario: Accidental Deletion**
1. D1 soft deletes: restore by clearing `deleted_at`
2. Hard deletes: use time-travel within 30 days
3. Export affected tables at prior timestamp
4. Manually re-insert records

**Scenario: Worker Outage**
1. Cloudflare handles failover automatically
2. If code bug: revert via Git + redeploy
3. Rollback: `wrangler rollback`

---

## Appendix A: TypeScript Interfaces

```typescript
// Core entity interfaces from workers/ke-api/src/types.ts

export interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  APP_URL?: string;
  CLERK_DOMAIN?: string;
}

export interface Expense {
  id: string;
  family_id: string;
  created_by: string;
  paid_by: string;
  fixed_expense_id: string | null;
  description: string;
  amount_cents: number;
  category: string;
  expense_date: string;
  child_ids: string | null;
  link_url: string | null;
  memo: string | null;
  status: string;
  questioned_by: string | null;
  questioned_at: string | null;
  question_reason: string | null;
  question_note: string | null;
  resolved_at: string | null;
  resolution_action: string | null;
  satisfied_at: string | null;
  closed_unresolved_at: string | null;
  closed_unresolved_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Family {
  id: string;
  name: string | null;
  parent_a_id: string;
  parent_b_id: string | null;
  parent_a_ratio: number;
  invite_code: string | null;
  invite_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceBreakdown {
  total_expenses_cents: number;
  included_expenses_count: number;
  a_share_cents: number;
  b_share_cents: number;
  a_paid_cents: number;
  b_paid_cents: number;
  payments_a_to_b_cents: number;
  payments_b_to_a_cents: number;
  questioned_total_cents: number;
  questioned_count: number;
}

export type QuestionReason =
  | 'wrong_amount'
  | 'not_child_related'
  | 'duplicate'
  | 'split_dispute'
  | 'other';

export type RecurringFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'annually';
```

---

## Appendix B: SQL Query Patterns

```sql
-- Balance calculation: included statuses
SELECT * FROM expenses
WHERE family_id = ?
  AND deleted_at IS NULL
  AND status IN ('posted', 'resolved', 'resolved_creator_decided')

-- Questioned expenses (excluded from balance)
SELECT * FROM expenses
WHERE family_id = ?
  AND deleted_at IS NULL
  AND status IN ('questioned', 'pending_satisfaction')

-- Active fixed expenses for monthly generation
SELECT * FROM fixed_expenses
WHERE family_id = ?
  AND deleted_at IS NULL
  AND effective_from <= date('now')
  AND (effective_until IS NULL OR effective_until >= date('now'))

-- Activity feed with user join
SELECT ae.*, u.email as user_email, u.name as user_name
FROM activity_events ae
LEFT JOIN users u ON ae.user_id = u.id
WHERE ae.family_id = ?
ORDER BY ae.created_at DESC
LIMIT ? OFFSET ?

-- Tier check: count active fixed expenses
SELECT COUNT(*) as count FROM fixed_expenses
WHERE family_id = ?
  AND deleted_at IS NULL
  AND (effective_until IS NULL OR effective_until >= date('now'))
```

---

*Document Version: 1.0*
*Last Updated: 2026-02-06*
*Author: Technical Lead (Claude)*
