# Policy Constraints

## Who can do what

| Action | Creator | Other Parent | Non-family |
|--------|---------|--------------|------------|
| Create expense | Yes | Yes | No |
| Question expense | No | Yes | No |
| Resolve question | Yes | No | No |
| Satisfy resolution | No | Yes (questioner) | No |
| Create payment | Yes | Yes | No |
| View balance | Yes | Yes | No |
| View activity | Yes | Yes | No |
| Manage children | Yes | Yes | No |
| Manage recurring expenses | Yes | Yes | No |

## Dispute flow

```
posted ──[other parent questions]──> questioned
questioned ──[creator: keep/edit]──> pending_satisfaction
questioned ──[creator: personal]──> resolved_personal (final)
questioned ──[creator: delete]──> resolved_deleted (final)
pending_satisfaction ──[questioner satisfies]──> resolved (final)
pending_satisfaction ──[7 days pass]──> resolved_creator_decided (final)
```

### Question reasons

| Reason | Display |
|--------|---------|
| `wrong_amount` | Wrong amount |
| `not_child_related` | Not child-related |
| `duplicate` | Duplicate |
| `split_dispute` | Split dispute |
| `other` | Other |

### Resolution actions

| Action | Result | Balance impact |
|--------|--------|----------------|
| `keep` | Moves to `pending_satisfaction`, amount unchanged | None until satisfied |
| `edit` | Moves to `pending_satisfaction`, amount updated | None until satisfied |
| `personal` | Immediately `resolved_personal` | Excluded from balance |
| `delete` | Immediately `resolved_deleted`, `deleted_at` set | Excluded from balance |

### 7-day timeout rule

- Starts when expense enters `pending_satisfaction` (timestamp: `resolved_at`)
- If questioner does not satisfy within 7 days, auto-transitions to `resolved_creator_decided`
- Checked on: `GET /expenses/:id` and `POST /expenses/:id/satisfy`
- Creator's decision stands

## Expense validation

| Field | Required | Constraints |
|-------|----------|-------------|
| `description` | Yes | 1-200 characters |
| `amount` | Yes | Positive number (dollars, converted to cents) |
| `category` | Yes | `school`, `medical`, `activities`, `childcare`, `other` |
| `expense_date` | No | YYYY-MM-DD, defaults to today |
| `paid_by` | No | Must be family member, defaults to current user |
| `memo` | No | Max 500 characters |
| `child_ids` | No | Array of valid child IDs |
| `link_url` | No | URL string |

## Payment validation

| Field | Required | Constraints |
|-------|----------|-------------|
| `amount` | Yes | Positive number (dollars) |
| `payment_date` | No | YYYY-MM-DD, defaults to today |
| `notes` | No | Free text |

## Recurring expenses

| Tier | Limit |
|------|-------|
| Free | 2 active per family |
| Pro | Unlimited |

Frequencies: `weekly`, `biweekly`, `monthly`, `quarterly`, `annually`.

## Audit trail

Every mutation creates an `activity_events` record with:

| Field | Content |
|-------|---------|
| `event_type` | e.g. `expense.created`, `expense.questioned`, `payment.created` |
| `user_id` | Who performed the action |
| `target_type` | `expense`, `payment`, `child`, `fixed_expense`, `family` |
| `target_id` | ID of affected record |
| `before_snapshot` | Full record state before change (JSON) |
| `after_snapshot` | Full record state after change (JSON) |
| `metadata` | Context (question reason, resolution action, etc.) |

All activity events are visible to both parents in the family.
