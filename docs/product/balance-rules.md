# Balance Rules

## Net Balance

A single integer (`balance_cents`) representing who owes whom.

| Value    | Meaning                |
| -------- | ---------------------- |
| Positive | Parent A owes Parent B |
| Negative | Parent B owes Parent A |
| Zero     | Settled                |

## What counts toward balance

| Status                     | Included?               |
| -------------------------- | ----------------------- |
| `posted`                   | Yes                     |
| `resolved`                 | Yes                     |
| `resolved_creator_decided` | Yes                     |
| `questioned`               | No (tracked separately) |
| `pending_satisfaction`     | No (tracked separately) |
| `resolved_personal`        | No                      |
| `resolved_deleted`         | No                      |
| `closed_unresolved`        | No                      |

Questioned/pending expenses are reported separately as `questioned_total_cents` and `questioned_count` in the balance breakdown.

## Share calculation

Split is controlled by `parent_a_ratio` (0.0 to 1.0). Parent B ratio = `1 - parent_a_ratio`.

```
a_share = floor(amount_cents * parent_a_ratio)
b_share = amount_cents - a_share
```

`floor` + remainder ensures no cents are lost. Example: $100.01 at 50/50 -> A gets $50.00, B gets $50.01.

## Balance formula

For each included expense:

| Who paid      | Balance effect                                        |
| ------------- | ----------------------------------------------------- |
| Parent A paid | `balance += (a_share - amount)` (negative = B owes A) |
| Parent B paid | `balance += a_share` (positive = A owes B)            |

For each payment:

| Direction | Balance effect      |
| --------- | ------------------- |
| A pays B  | `balance -= amount` |
| B pays A  | `balance += amount` |

## Rounding

- **Input** (dollars to cents): `Math.round(dollars * 100)` — 0.5 rounds up
- **Shares**: `Math.floor` for A, remainder for B — no rounding error possible
- **Output** (cents to dollars): `cents / 100` — formatted via `Intl.NumberFormat`

## Period reporting

- **Current period**: Calendar month (1st to end of month)
- **Prior balance**: Sum of all expenses + payments before current month
- **Breakdown**: Expenses and payments by each parent for current period

## Edge cases

| Scenario                     | Behavior                                                     |
| ---------------------------- | ------------------------------------------------------------ |
| No expenses                  | Balance = $0.00, "No expenses recorded yet"                  |
| Solo parent (no Parent B)    | Balance = $0.00, share calculation still works               |
| 100/0 split                  | A pays 100%, B pays 0%                                       |
| Expense deleted via dispute  | `resolved_deleted` — excluded from balance, `deleted_at` set |
| Expense marked personal      | `resolved_personal` — excluded from balance                  |
| Amount edited during dispute | New amount replaces old, balance recalculated                |
