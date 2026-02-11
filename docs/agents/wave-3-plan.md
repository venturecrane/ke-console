# Wave 3: Engagement Features (Phase 2)

**Goal:** Build engagement and retention features.
**Issues:** #98, #99, #100, #101, #102, #103, #104, #105
**Blocked by:** Wave 2 completion

## Agent Assignments

### API Engineer A (Track 1+2)

| Order | Issue | Description                                                | Branch                           |
| ----- | ----- | ---------------------------------------------------------- | -------------------------------- |
| 1     | #100  | Notification preferences — new table + endpoints           | `feat/ke-100-notification-prefs` |
| 2     | #101  | CSV export — Pro-only export endpoint                      | `feat/ke-101-csv-export`         |
| 3     | #104  | Optional expense details — expense_children junction table | `feat/ke-104-expense-details`    |

### API Engineer B (Track 3)

| Order | Issue | Description                                                        | Branch                              |
| ----- | ----- | ------------------------------------------------------------------ | ----------------------------------- |
| 1     | #98   | Email notifications — notification service (after #100 prefs done) | `feat/ke-98-email-notifications`    |
| 2     | #99   | Generated expense email — monthly summary (after #96+#98)          | `feat/ke-99-generated-email`        |
| 3     | #102  | Questioning dashboard — dashboard query endpoint                   | `feat/ke-102-questioning-dashboard` |
| 4     | #103  | Activity event types — ensure all mutations log events             | `feat/ke-103-activity-events`       |

### Frontend Engineer

| Order | Issue | Description                                  | Branch                              |
| ----- | ----- | -------------------------------------------- | ----------------------------------- |
| 1     | #100  | Settings page: notification toggles          | `feat/ke-100-notification-prefs`    |
| 2     | #101  | Export buttons + tier gate modal             | `feat/ke-101-csv-export`            |
| 3     | #102  | Questioning dashboard page                   | `feat/ke-102-questioning-dashboard` |
| 4     | #103  | Activity detail view                         | `feat/ke-103-activity-events`       |
| 5     | #104  | Expense form: memo, receipt, children fields | `feat/ke-104-expense-details`       |
| 6     | #105  | Child edit/remove UI                         | `feat/ke-105-child-management`      |

### QA Engineer

| Order | Focus                                           | Test File                               |
| ----- | ----------------------------------------------- | --------------------------------------- |
| 1     | #105: Child management (soft delete edge cases) | `__tests__/children.test.ts` (NEW)      |
| 2     | #98: Notification delivery, preference respect  | `__tests__/notifications.test.ts` (NEW) |
| 3     | #101: CSV format, cents→dollars conversion      | `__tests__/export.test.ts` (NEW)        |
| 4     | Edge case sweep: EC-040 through EC-049          | Various files                           |

## Intra-Wave Dependencies

```
API Eng A: #100 (prefs) ──→ API Eng B: #98 (notifications) ──→ API Eng B: #99 (generated email)
                                                                        ↑
                                        Wave 1 #96 (cron) ─────────────┘

#104 (expense details) ──→ #105 (child management) [sequential]
#102 and #103 can run in parallel
```

**Sequencing:**

1. API Eng A starts with #100 (notification preferences)
2. API Eng B starts with #102 + #103 (parallel, no dependencies)
3. After #100 done → API Eng B starts #98 (email notifications)
4. After #98 done → API Eng B starts #99 (generated expense email)
5. API Eng A does #101, then #104
6. After #104 → Frontend does #105

## Shared File Coordination

### `index.ts` — New Route Registrations

API Eng A adds:

```typescript
import notificationPrefsRoutes from './routes/notification-prefs'
import exportRoutes from './routes/export'
app.route('/me', notificationPrefsRoutes) // /me/notification-preferences
app.route('/families', exportRoutes) // /families/:id/expenses/export
```

API Eng B adds:

```typescript
import questioningRoutes from './routes/questioning'
app.route('/families', questioningRoutes) // /families/:id/questioning-dashboard
```

### `types.ts` — New Type Definitions

API Eng A appends:

```typescript
export interface NotificationPreferences { ... }
export interface UpdateNotificationPreferencesRequest { ... }
export interface CsvExportOptions { ... }
```

API Eng B appends:

```typescript
export interface QuestioningDashboard { ... }
export interface NotificationEvent { ... }
```

### Migrations

| Number | File                                | Owner     | Purpose                         |
| ------ | ----------------------------------- | --------- | ------------------------------- |
| 0009   | `0009_notification_preferences.sql` | API Eng A | notification_preferences table  |
| 0010   | `0010_expense_children.sql`         | API Eng A | expense_children junction table |
| 0011   | Reserved                            | Buffer    |                                 |

## Parallel Execution Plan

```
Time →

API Eng A:  [── #100 Notif Prefs ──][── #101 CSV Export ──][── #104 Expense Details ──]
API Eng B:  [── #102 Dashboard ──][── #103 Activity ──][── #98 Email (after #100) ──][── #99 Generated Email ──]
Frontend:   [── #100 Settings UI ──][── #101 Export UI ──][── #102 Dashboard UI ──][── #103 Activity UI ──][── #104 Form UI ──][── #105 Child UI ──]
QA:         [── #105 child tests ──][── #98 notification tests ──][── #101 export tests ──][── edge case sweep ──]
```

## Exit Criteria

### Orchestrator Verifies

- [ ] All branches merge cleanly
- [ ] `cd workers/ke-api && npm test` passes
- [ ] `cd workers/ke-api && npx tsc --noEmit` passes
- [ ] `cd app && npm run lint && npm run build` passes

### PM Validates

- [ ] #98: Emails sent for 4 event types, preferences respected
- [ ] #99: Monthly summary email sent after cron generation
- [ ] #100: Per-event toggles work, defaults to enabled
- [ ] #101: CSV exports with dollars (2 decimals), Pro-only gate
- [ ] #102: Dashboard shows 3 sections with countdown indicators
- [ ] #103: All mutation types log activity events with snapshots
- [ ] #104: Memo, receipt link, children work in expense form
- [ ] #105: Child edit/remove with soft delete, historical preservation

### QA Confirms

- [ ] Notification tests: preference respect, no self-notify
- [ ] Export tests: cents→dollars conversion, 2 decimal places
- [ ] Child tests: soft delete preserves associations
- [ ] Edge cases EC-040 through EC-049 covered
- [ ] No regressions in Wave 1/2 tests
