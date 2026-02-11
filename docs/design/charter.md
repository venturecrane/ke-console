# Design Charter — Kid Expenses

**Owner:** Design (this team)
**Decision Maker:** Captain (final yes/no)
**Default Rule:** UX + visual decisions are design-owned unless blocked by product policy, legal, security, or engineering constraints.

## Cadence

- **Weekly Design Review:** 30-45 min, binary decisions only (approve/reject)
- **Async updates:** daily short note (what shipped, what's next, what's blocked)
- **Ship in slices:** one component set or one screen per week, not big redesigns

## Scope of ownership

- Information architecture, interaction design, visual design, microcopy
- Component system and tokens in Tailwind
- Consistent status semantics (8 statuses) across all surfaces
- Theming for Clerk to match product
- Empty states, loading states, error states
- Accessibility (focus rings, contrast, touch targets)

## Outputs

- Tokens + components merged into `main`
- `/design` route for visual QA and state review
- Screen-by-screen improvements shipped via PRs

## Decision model

- Design ships PRs with screenshots + short rationale
- Response is binary: **Ship** or **Reject (change X)**
- No bikeshedding

## Design tokens

All colors, surfaces, and semantic values are defined in `app/src/app/globals.css` as CSS custom properties and mapped through Tailwind's `@theme` directive. No raw color classes (e.g. `bg-indigo-600`) should be used directly in page code — use token classes (`bg-ke-accent`, `text-ke-primary`) or component primitives instead.

See: `app/src/components/ui/` for the component library.

## Status system (8 statuses)

| Status                     | Color   | Meaning                                             |
| -------------------------- | ------- | --------------------------------------------------- |
| `posted`                   | Emerald | Active, no disputes                                 |
| `questioned`               | Amber   | Under dispute by other parent                       |
| `pending_satisfaction`     | Indigo  | Creator responded, awaiting questioner confirmation |
| `resolved`                 | Indigo  | Questioner confirmed satisfaction                   |
| `resolved_creator_decided` | Indigo  | Auto-resolved after 7-day timeout                   |
| `resolved_personal`        | Slate   | Creator marked as personal expense                  |
| `resolved_deleted`         | Slate   | Creator marked for deletion                         |
| `closed_unresolved`        | Red     | Closed without resolution                           |

### Transition rules

```
posted → questioned (other parent questions)
questioned → pending_satisfaction (creator responds: keep/edit)
questioned → resolved_personal (creator marks personal)
questioned → resolved_deleted (creator marks deleted)
pending_satisfaction → resolved (questioner confirms)
pending_satisfaction → resolved_creator_decided (7-day auto-timeout)
```

### Terminology (enforced)

| Use                 | Don't use         |
| ------------------- | ----------------- |
| Record payment      | Settle            |
| Questioned          | Disputed          |
| Closed (unresolved) | Failed / Rejected |
| Other parent        | Opponent / Ex     |
| Net balance         | Amount owed       |

## Screen priority (ranked)

1. Expenses list (core)
2. Expense detail (dispute thread)
3. Add expense
4. Payments list + detail
5. Activity feed
6. Settings: kids, split, recurring
7. Onboarding wizard
8. Landing/marketing
