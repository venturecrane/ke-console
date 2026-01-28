# Kid Expenses — Product Requirements Document

**Version:** 1.0
**Date:** January 27, 2026
**Status:** APPROVED for Sprint 1
**Venture:** kidexpenses (SMDurgan LLC)

---

## 1. Overview

### What Is It?
A co-parent expense tracking app with dispute resolution and audit trail.

### Problem
Divorced/separated parents sharing child expenses face recurring friction:
- "Did you already pay for that?"
- "That wasn't a kid expense"
- "You said you'd pay me back"
- Venmo/spreadsheet chaos with no audit trail

### Solution
A neutral, auditable shared ledger where both parents log expenses, see the running balance, and resolve disputes through a structured workflow.

### Positioning
> "A neutral ledger for kid costs — so money doesn't become a weekly argument."

### Target User
- Divorced/separated parents sharing custody
- Parents who split expenses but want clear records
- Co-parents who need to reduce financial conflict

---

## 2. Core Features (MVP)

### 2.1 Two-Parent Ledger
- Either parent can add expenses
- Only the creator can edit their own expenses
- All changes visible to both parents via activity feed

### 2.2 Configurable Split Ratio
- Default: 50/50
- Adjustable: any ratio from 0-100%
- Single ratio for all expenses in v1.0

### 2.3 Fixed Monthly Expenses
- Templates for recurring expenses (tuition, rent, activities)
- Auto-populate on 1st of each month
- Free tier: max 2 fixed expenses
- Pro tier: unlimited

### 2.4 Rolling Balance
- Real-time calculation of who owes whom
- Unpaid amounts carry forward
- Clear "You owe $X" or "They owe you $X" display

### 2.5 Dispute Workflow
Structured process for questioning expenses:

```
posted → questioned → pending_satisfaction → resolved
                  ↘ resolved_personal
                  ↘ resolved_deleted
                  ↘ resolved_creator_decided (7-day timeout)
                  ↘ closed_unresolved (30-day option)
```

**Question Reasons:**
- wrong_amount
- not_child_related
- duplicate
- split_dispute
- other

**Resolution Actions (by creator):**
- Keep as-is
- Edit amount
- Mark as personal (excluded from split)
- Delete

**Questioned items are excluded from balance** until resolved.

### 2.6 Payment Recording
- Log external payments (Venmo, Zelle, cash, check)
- Payments reduce the balance
- Full audit trail

### 2.7 Audit Trail
Every mutation is logged with who/when/what:
- Expense created, edited, questioned, resolved
- Payment created
- Family settings changed

---

## 3. Data Model

### Tables (8 total)

| Table | Purpose |
|-------|---------|
| users | Clerk user cache |
| families | Parent pair + split ratio |
| children | Optional child registry |
| fixed_expenses | Recurring templates |
| expenses | Individual expense records |
| fixed_expense_suggestions | Dispute → template change suggestions |
| payments | Settlement records |
| activity_events | Full audit trail |
| subscriptions | Pro tier tracking |

### Key Fields

**expenses.status** (8 states):
- `posted` — Normal, included in balance
- `questioned` — Under dispute, excluded from balance
- `pending_satisfaction` — Creator resolved, awaiting questioner confirmation
- `resolved` — Questioner satisfied, re-included in balance
- `resolved_creator_decided` — 7-day timeout, re-included
- `resolved_personal` — Marked personal, permanently excluded
- `resolved_deleted` — Soft-deleted, permanently excluded
- `closed_unresolved` — 30-day nuclear option, excluded

**families.parent_a_ratio**:
- REAL 0.0-1.0
- parent_b_ratio = 1 - parent_a_ratio
- Default: 0.5 (50/50)

---

## 4. Balance Algorithm

```
balance = 0

for each expense where status IN ('posted', 'resolved', 'resolved_creator_decided'):
    a_share = floor(amount_cents * parent_a_ratio)
    a_paid = (paid_by == parent_a) ? amount_cents : 0
    balance += (a_share - a_paid)

for each payment:
    if paid_by == parent_a:
        balance -= amount_cents
    else:
        balance += amount_cents

// Result interpretation:
// Positive = parent_a owes parent_b
// Negative = parent_b owes parent_a
// Zero = settled up
```

**Excluded from balance:**
- questioned
- pending_satisfaction
- resolved_personal
- resolved_deleted
- closed_unresolved

---

## 5. Categories

Required on all expenses:
- school
- medical
- activities
- childcare
- other

v1.0: Labels only, same split ratio for all categories.
Future: Per-category split ratios.

---

## 6. Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3-month history, max 2 fixed expenses, no export |
| Pro | $5/mo | Unlimited history, unlimited fixed expenses, CSV export |

**Future Pro features:**
- Receipt image attachments
- Per-category split ratios
- Annual summaries
- Family therapist/mediator view

---

## 7. API Surface

**Base:** `https://ke-api.{subdomain}.workers.dev`
**Auth:** Clerk JWT
**Framework:** Hono on Cloudflare Workers

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | /me | Current user + family context |
| POST | /families | Create family |
| GET | /families/:id | Get family details |
| POST | /families/:id/invite | Generate invite code |
| POST | /families/join | Join family with code |
| GET | /families/:id/children | List children |
| POST | /families/:id/children | Add child |
| DELETE | /families/:id/children/:cid | Remove child (soft) |
| GET | /families/:id/fixed-expenses | List templates |
| POST | /families/:id/fixed-expenses | Create template |
| PUT | /families/:id/fixed-expenses/:fid | Update template |
| DELETE | /families/:id/fixed-expenses/:fid | End template |
| GET | /families/:id/expenses | List expenses (filtered) |
| POST | /families/:id/expenses | Add expense |
| PUT | /expenses/:id | Edit expense |
| POST | /expenses/:id/question | Question expense |
| POST | /expenses/:id/resolve | Creator resolves |
| POST | /expenses/:id/satisfy | Questioner confirms |
| POST | /expenses/:id/close-unresolved | 30-day close |
| GET | /families/:id/payments | List payments |
| POST | /families/:id/payments | Record payment |
| GET | /families/:id/balance | Current balance + breakdown |
| GET | /families/:id/activity | Activity feed (paginated) |
| GET | /families/:id/export | CSV export (Pro only) |

---

## 8. Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 + Tailwind CSS |
| Hosting | Vercel |
| Backend | Cloudflare Workers (Hono) |
| Database | Cloudflare D1 |
| Auth | Clerk |
| Payments | Stripe (Pro tier) |

### Naming Conventions

| Resource | Name |
|----------|------|
| GitHub Org | kidexpenses |
| Repo | ke-console |
| Sprint Board | KE Sprint Board |
| D1 Database | ke-main |
| Worker | ke-api |

---

## 9. Edge Cases

### Late Entries
- Expenses >60 days old flagged with warning
- Still allowed, but visible indicator

### Duplicates
- Soft warning for similar expense within 7 days
- Same description + amount + date range
- Not blocked, just flagged

### Multi-Child Expenses
- Can tag multiple children
- Can leave untagged (family-wide)

### Partner Never Joins
- Solo mode fully functional
- All expenses 100% yours
- Invite stays open until used or expired

### Refunds/Credits
- Enter as negative amount
- Same split rules apply
- Should reference original expense when possible

### Family Deletion
- Requires both parents to confirm
- 30-day grace period
- Data export available before deletion

---

## 10. Sprint 1 Backlog

| # | Title | Priority |
|---|-------|----------|
| 3 | Auth + User Onboarding (Clerk) | P1 |
| 4 | Family Creation + Invite Flow | P1 |
| 5 | Add Expense (Manual Entry) | P1 |
| 6 | Expense List View | P1 |
| 7 | Balance Calculation + Display | P0 |
| 8 | Record Payment | P1 |
| 9 | Question Expense (Dispute Initiation) | P1 |
| 10 | Resolve Dispute (Creator Response) | P1 |
| 11 | Activity Feed | P2 |
| 12 | Children Management | P2 |
| 13 | Fixed Expenses (Recurring Templates) | P2 |

---

## 11. Future Roadmap

### v1.1
- Email notifications for disputes
- Receipt image upload (R2)
- Child tagging on expenses
- Stale dispute alerts (14-day warning)

### v1.2
- Per-category split ratios
- Annual summary reports
- Multiple families per user

### v2.0
- Family therapist/mediator view
- Court-ready export format
- Integration with custody calendars

---

## Appendix A: Database Schema

See `ke-schema.sql` for full CREATE TABLE statements.

---

## Appendix B: Dispute Flow Diagram

```
                    ┌─────────────┐
                    │   posted    │
                    └──────┬──────┘
                           │ question()
                           ▼
                    ┌─────────────┐
                    │ questioned  │
                    └──────┬──────┘
                           │ resolve()
              ┌────────────┼────────────┬──────────────┐
              ▼            ▼            ▼              ▼
     ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐
     │  pending   │ │ resolved   │ │ resolved │ │  resolved │
     │satisfaction│ │  personal  │ │ deleted  │ │  creator  │
     └─────┬──────┘ └────────────┘ └──────────┘ │  decided  │
           │                                     └───────────┘
           │ satisfy()                              (7-day
           ▼                                        timeout)
     ┌────────────┐
     │  resolved  │
     └────────────┘

                    ┌────────────────┐
                    │closed_unresolved│  (30-day option)
                    └────────────────┘
```

---

## Appendix C: Balance Calculation Example

**Setup:**
- Parent A ratio: 60%
- Parent B ratio: 40%

**Expenses:**
1. School supplies: $100, paid by A, status: posted
2. Doctor visit: $200, paid by B, status: posted
3. Soccer gear: $50, paid by A, status: questioned

**Payments:**
1. A paid B: $30

**Calculation:**
```
Expense 1: A_share = 60, A_paid = 100 → balance += (60 - 100) = -40
Expense 2: A_share = 120, A_paid = 0 → balance += (120 - 0) = +120
Expense 3: EXCLUDED (questioned)

Subtotal: -40 + 120 = +80 (A owes B $0.80)

Payment 1: A paid B $30 → balance -= 30 = +50

Final: A owes B $0.50
```

---

*Document generated by PM Team. Updates require Captain approval.*
