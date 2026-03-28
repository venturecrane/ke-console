# Kid Expenses - Stitch Design Spec

Design system definition for Google Stitch project import. Derived from the canonical
`design-spec.md` - when values conflict, design-spec.md wins.

**Project ID:** 14528597905670040899

## Design System Overview

- **Brand:** Kid Expenses - Expense tracking for co-parents
- **Audience:** Divorced or separated parents managing shared child expenses
- **Platform:** Mobile-first web app (Next.js 16, Tailwind v4, Vercel)
- **Theme:** Light mode default, dark mode via prefers-color-scheme
- **Voice:** Calm, neutral, respectful. Reduces conflict. No judgment.
- **Auth:** Clerk

## Color Palette (Light Mode)

### Background Surfaces

| Token              | Hex       | Usage                           |
| ------------------ | --------- | ------------------------------- |
| `--ke-bg`          | `#f8fafc` | Page background                 |
| `--ke-surface`     | `#ffffff` | Card backgrounds, panels        |
| `--ke-elevated`    | `#f1f5f9` | Elevated surfaces, hover states |
| `--ke-interactive` | `#e2e8f0` | Interactive element backgrounds |

### Text

| Token                 | Hex       | Usage                    | Contrast |
| --------------------- | --------- | ------------------------ | -------- |
| `--ke-text-primary`   | `#0f172a` | Primary body text        | 16.7:1   |
| `--ke-text-secondary` | `#475569` | Secondary text, labels   | 7.3:1    |
| `--ke-text-muted`     | `#64748b` | Tertiary, placeholders   | 4.7:1    |
| `--ke-text-inverse`   | `#ffffff` | Text on dark backgrounds | -        |

### Accent Colors

| Token                   | Hex       | Usage                   | Contrast |
| ----------------------- | --------- | ----------------------- | -------- |
| `--ke-accent`           | `#4f46e5` | Primary CTAs, links     | 5.1:1    |
| `--ke-accent-hover`     | `#4338ca` | Accent hover state      | 5.8:1    |
| `--ke-accent-soft`      | `#e0e7ff` | Soft accent backgrounds | -        |
| `--ke-accent-soft-text` | `#4338ca` | Text on soft accent     | 5.8:1    |
| `--ke-focus`            | `#6366f1` | Focus indicators        | 4.7:1    |

### Borders

| Token                   | Hex       | Usage                    |
| ----------------------- | --------- | ------------------------ |
| `--ke-border`           | `#e2e8f0` | Default borders          |
| `--ke-divider`          | `#f1f5f9` | Subtle dividers          |
| `--ke-secondary-border` | `#cbd5e1` | Secondary action borders |

### Status Colors

| Status     | Background | Text      | Use Case                 |
| ---------- | ---------- | --------- | ------------------------ |
| Posted     | `#d1fae5`  | `#047857` | New expense submitted    |
| Questioned | `#fef3c7`  | `#b45309` | Expense under discussion |
| Resolved   | `#e0e7ff`  | `#4338ca` | Questions answered       |
| Settled    | `#f1f5f9`  | `#64748b` | Payment completed        |
| Closed     | `#fee2e2`  | `#dc2626` | Rejected or archived     |

### Financial Values

| Token           | Hex       | Usage                  |
| --------------- | --------- | ---------------------- |
| `--ke-positive` | `#059669` | Positive balance       |
| `--ke-negative` | `#dc2626` | Negative balance, owed |

### Attention

| Token                   | Hex       | Usage                 |
| ----------------------- | --------- | --------------------- |
| `--ke-attention-border` | `#fbbf24` | Attention borders     |
| `--ke-attention-bg`     | `#fffbeb` | Attention backgrounds |

## Color Palette (Dark Mode)

Dark mode tokens are redefined via `@media (prefers-color-scheme: dark)`:

| Token               | Light     | Dark      |
| ------------------- | --------- | --------- |
| `--ke-bg`           | `#f8fafc` | `#020617` |
| `--ke-surface`      | `#ffffff` | `#0f172a` |
| `--ke-elevated`     | `#f1f5f9` | `#1e293b` |
| `--ke-text-primary` | `#0f172a` | `#f1f5f9` |
| `--ke-accent`       | `#4f46e5` | `#6366f1` |
| `--ke-border`       | `#e2e8f0` | `#1e293b` |

## Typography

- **Font:** Geist Sans (Next.js built-in, no external requests)
- **Mono:** Geist Mono
- **Headings:** 30px/24px/20px, semibold (600)
- **Body:** 16px, regular (400)
- **Small:** 14px/12px
- **Weights:** 400 (body), 500 (labels), 600 (headings), 700 (rare emphasis)

## Spacing & Radius

- **Base unit:** 4px (0.25rem)
- **Scale:** Tailwind default
- **Container max:** 1280px
- **Border radius:** Tailwind defaults (rounded-md for inputs, rounded-lg for cards)

## Component Patterns

- **ExpenseCard:** Individual expense with status badge, amount, metadata
- **StatusBadge:** Color-coded status indicator (posted/questioned/resolved/settled/closed)
- **ExpenseForm:** Multi-step expense entry form
- **BottomNav:** Mobile-first bottom navigation bar
- **Sheet:** Modal drawer (full-screen mobile, drawer desktop)
- **QuestionThread:** Nested question/response UI for expense discussions

## Layout

- **Mobile-first:** Base styles target mobile, enhanced with responsive classes
- **Bottom navigation:** Primary nav pattern on mobile
- **Sheet modals:** Full-screen on mobile, drawer on desktop
- **Touch targets:** 44x44px minimum
- **Breakpoints:** sm 640px, md 768px, lg 1024px, xl 1280px

## Design Principles

1. Calm, neutral tone - reduces conflict around money
2. No raw Tailwind colors - semantic tokens only
3. Status conveyed through icons + text, not color alone
4. Mobile-first, iPad-friendly
5. WCAG 2.1 AA compliance
