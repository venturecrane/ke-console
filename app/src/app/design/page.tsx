"use client";

import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  StatusBadge,
  Input,
  Select,
  Textarea,
  EmptyState,
  SectionHeader,
  Alert,
} from "@/components/ui";
import type { ExpenseStatus } from "@/lib/api";
import { formatCurrency } from "@/lib/statusColors";

const allStatuses: ExpenseStatus[] = [
  "posted",
  "questioned",
  "pending_satisfaction",
  "resolved",
  "resolved_creator_decided",
  "resolved_personal",
  "resolved_deleted",
  "closed_unresolved",
];

const sampleExpenses = [
  {
    description: "Soccer practice registration",
    amount_cents: 15000,
    status: "posted" as ExpenseStatus,
    date: "2026-02-01",
    category: "Activities",
    payer: "You",
  },
  {
    description: "Pediatric dental cleaning",
    amount_cents: 28500,
    status: "questioned" as ExpenseStatus,
    date: "2026-01-28",
    category: "Medical",
    payer: "Co-parent",
  },
  {
    description: "School lunch program",
    amount_cents: 7500,
    status: "pending_satisfaction" as ExpenseStatus,
    date: "2026-01-25",
    category: "School",
    payer: "You",
  },
  {
    description: "Winter jacket",
    amount_cents: 4999,
    status: "resolved" as ExpenseStatus,
    date: "2026-01-20",
    category: "Other",
    payer: "Co-parent",
  },
  {
    description: "Tutoring session",
    amount_cents: 6000,
    status: "resolved_deleted" as ExpenseStatus,
    date: "2026-01-15",
    category: "School",
    payer: "You",
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="border-b border-ke-border pb-2 text-lg font-semibold text-ke-primary">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function DesignPage() {
  return (
    <div className="min-h-screen bg-ke-bg">
      <div className="mx-auto max-w-4xl space-y-12 px-4 py-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-ke-primary">
            Design System — Visual QA
          </h1>
          <p className="mt-1 text-sm text-ke-muted">
            Component library and token reference for Kid Expenses. All
            components use semantic tokens — no raw color classes.
          </p>
        </div>

        {/* ============================================
            SURFACES
            ============================================ */}
        <Section title="Surfaces (4 tiers)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-ke-border bg-ke-bg p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                bg-ke-bg
              </p>
              <p className="mt-1 text-sm text-ke-secondary">Page background</p>
            </div>
            <div className="rounded-lg border border-ke-border bg-ke-surface p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                bg-ke-surface
              </p>
              <p className="mt-1 text-sm text-ke-secondary">Card surface</p>
            </div>
            <div className="rounded-lg border border-ke-border bg-ke-elevated p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                bg-ke-elevated
              </p>
              <p className="mt-1 text-sm text-ke-secondary">
                Modal/sheet/active
              </p>
            </div>
            <div className="rounded-lg border border-ke-border bg-ke-interactive p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                bg-ke-interactive
              </p>
              <p className="mt-1 text-sm text-ke-secondary">
                Hover/pressed
              </p>
            </div>
          </div>
        </Section>

        {/* ============================================
            TEXT TIERS
            ============================================ */}
        <Section title="Text Tiers">
          <div className="space-y-2">
            <p className="text-ke-primary">
              <span className="font-mono text-xs text-ke-muted">
                text-ke-primary{" "}
              </span>
              — Primary text for headings, body, and important content
            </p>
            <p className="text-ke-secondary">
              <span className="font-mono text-xs text-ke-muted">
                text-ke-secondary{" "}
              </span>
              — Secondary text for descriptions and supporting content
            </p>
            <p className="text-ke-muted">
              <span className="font-mono text-xs text-ke-muted">
                text-ke-muted{" "}
              </span>
              — Muted text for hints, captions, and timestamps
            </p>
          </div>
        </Section>

        {/* ============================================
            BUTTONS
            ============================================ */}
        <Section title="Buttons">
          <div className="space-y-6">
            {/* Variants */}
            <div>
              <p className="mb-3 text-sm font-medium text-ke-secondary">
                Variants
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <p className="mb-3 text-sm font-medium text-ke-secondary">
                Sizes
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            {/* States */}
            <div>
              <p className="mb-3 text-sm font-medium text-ke-secondary">
                States
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled>Disabled</Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
                <Button fullWidth>Full Width</Button>
              </div>
            </div>
          </div>
        </Section>

        {/* ============================================
            CARDS
            ============================================ */}
        <Section title="Cards">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <SectionHeader title="Standard Card" />
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ke-secondary">
                  Default card with bg-ke-surface background. Use for most
                  content containers.
                </p>
              </CardBody>
            </Card>
            <Card elevated>
              <CardHeader>
                <SectionHeader title="Elevated Card" />
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ke-secondary">
                  Elevated card with bg-ke-elevated. Use for active states or
                  nested surfaces.
                </p>
              </CardBody>
            </Card>
          </div>
        </Section>

        {/* ============================================
            STATUS BADGES (all 8)
            ============================================ */}
        <Section title="Status Badges (8 states)">
          <Card>
            <CardBody>
              <div className="flex flex-wrap gap-3">
                {allStatuses.map((status) => (
                  <StatusBadge key={status} status={status} />
                ))}
              </div>
              <div className="mt-6 space-y-2">
                {allStatuses.map((status) => (
                  <div key={status} className="flex items-center gap-3">
                    <StatusBadge status={status} />
                    <code className="font-mono text-xs text-ke-muted">
                      {status}
                    </code>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </Section>

        {/* ============================================
            GENERIC BADGES
            ============================================ */}
        <Section title="Generic Badges">
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="muted">Muted</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </Section>

        {/* ============================================
            FORM INPUTS
            ============================================ */}
        <Section title="Form Inputs">
          <Card>
            <CardBody className="space-y-6">
              <Input
                id="demo-text"
                label="Description"
                placeholder="e.g., Soccer practice registration"
                hint="Brief description of the expense"
              />
              <Input
                id="demo-amount"
                label="Amount"
                type="number"
                placeholder="0.00"
                className="font-mono"
              />
              <Input
                id="demo-error"
                label="With Error"
                placeholder="Invalid input"
                error="Amount must be greater than zero"
              />
              <Select id="demo-select" label="Category">
                <option value="">Select category</option>
                <option value="school">School</option>
                <option value="medical">Medical</option>
                <option value="activities">Activities</option>
                <option value="childcare">Childcare</option>
                <option value="other">Other</option>
              </Select>
              <Textarea
                id="demo-textarea"
                label="Notes"
                placeholder="Optional notes..."
                hint="Add any relevant context"
                rows={3}
              />
            </CardBody>
          </Card>
        </Section>

        {/* ============================================
            ALERTS
            ============================================ */}
        <Section title="Alerts">
          <div className="space-y-3">
            <Alert variant="info">
              Info: Split ratio updated to 60/40.
            </Alert>
            <Alert variant="attention">
              2 expenses need your attention — review and respond.
            </Alert>
            <Alert variant="success">
              Payment of $150.00 recorded successfully.
            </Alert>
            <Alert variant="error">
              Failed to create expense. Please try again.
            </Alert>
          </div>
        </Section>

        {/* ============================================
            SECTION HEADERS
            ============================================ */}
        <Section title="Section Headers">
          <div className="space-y-6">
            <SectionHeader title="Recent Activity" />
            <SectionHeader
              title="Needs Attention"
              action={
                <span className="text-sm text-ke-accent">View all</span>
              }
            />
          </div>
        </Section>

        {/* ============================================
            EMPTY STATES
            ============================================ */}
        <Section title="Empty States">
          <div className="grid gap-4 sm:grid-cols-2">
            <EmptyState
              title="No expenses yet"
              description="Add your first shared expense to get started."
              action={<Button size="sm">Add Expense</Button>}
            />
            <EmptyState
              title="No payments recorded"
              description="Record a payment when money changes hands."
            />
          </div>
        </Section>

        {/* ============================================
            SAMPLE: EXPENSE LIST ROWS
            ============================================ */}
        <Section title="Sample: Expense List Rows">
          <Card>
            <CardBody className="divide-y divide-ke-divider p-0">
              {sampleExpenses.map((expense, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={expense.status} />
                      <span className="truncate text-sm font-medium text-ke-primary">
                        {expense.description}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-2 text-xs text-ke-muted">
                      <span>{expense.category}</span>
                      <span>&middot;</span>
                      <span className="font-mono">{expense.date}</span>
                      <span>&middot;</span>
                      <span>{expense.payer} paid</span>
                    </div>
                  </div>
                  <span className="ml-4 whitespace-nowrap text-sm font-semibold font-mono text-ke-primary">
                    {formatCurrency(expense.amount_cents)}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </Section>

        {/* ============================================
            SAMPLE: ACTIVITY FEED ROWS
            ============================================ */}
        <Section title="Sample: Activity Feed Rows">
          <Card>
            <CardBody className="divide-y divide-ke-divider p-0">
              {[
                {
                  event: "Expense created",
                  detail: "Soccer practice — $150.00",
                  user: "You",
                  time: "2 hours ago",
                },
                {
                  event: "Expense questioned",
                  detail: "Dental cleaning — Wrong amount",
                  user: "Co-parent",
                  time: "Yesterday",
                },
                {
                  event: "Payment recorded",
                  detail: "$200.00",
                  user: "Co-parent",
                  time: "3 days ago",
                },
                {
                  event: "2 recurring expenses generated",
                  detail: "Monthly auto-post",
                  user: "System",
                  time: "Feb 1",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-ke-primary">
                      {item.event}
                    </span>
                    <p className="mt-0.5 text-xs font-mono text-ke-muted">
                      {item.detail}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-xs text-ke-secondary">
                      {item.user}
                    </span>
                    <p className="text-xs font-mono text-ke-muted">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </Section>

        {/* ============================================
            SEMANTIC COLORS
            ============================================ */}
        <Section title="Semantic Colors">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-ke-border bg-ke-surface p-4 text-center">
              <span className="text-lg font-mono font-bold text-ke-accent">
                $135.00
              </span>
              <p className="mt-1 text-xs text-ke-muted">Accent (indigo)</p>
            </div>
            <div className="rounded-lg border border-ke-border bg-ke-surface p-4 text-center">
              <span className="text-lg font-mono font-bold text-ke-positive">
                +$50.00
              </span>
              <p className="mt-1 text-xs text-ke-muted">Positive (emerald)</p>
            </div>
            <div className="rounded-lg border border-ke-border bg-ke-surface p-4 text-center">
              <span className="text-lg font-mono font-bold text-ke-negative">
                -$75.00
              </span>
              <p className="mt-1 text-xs text-ke-muted">Negative (red)</p>
            </div>
            <div className="rounded-lg border border-ke-border bg-ke-surface p-4 text-center">
              <span className="text-lg font-mono font-bold text-ke-muted">
                $0.00
              </span>
              <p className="mt-1 text-xs text-ke-muted">Muted (settled)</p>
            </div>
          </div>
        </Section>

        {/* ============================================
            TOKEN REFERENCE
            ============================================ */}
        <Section title="Token Reference">
          <Card>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ke-border text-left">
                      <th className="pb-2 pr-4 font-semibold text-ke-primary">
                        Token
                      </th>
                      <th className="pb-2 pr-4 font-semibold text-ke-primary">
                        Class
                      </th>
                      <th className="pb-2 font-semibold text-ke-primary">
                        Usage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ke-divider">
                    {[
                      ["--ke-bg", "bg-ke-bg", "Page background"],
                      ["--ke-surface", "bg-ke-surface", "Card background"],
                      ["--ke-elevated", "bg-ke-elevated", "Active/nested surface"],
                      ["--ke-border", "border-ke-border", "Card borders"],
                      ["--ke-text-primary", "text-ke-primary", "Headings, body"],
                      ["--ke-text-secondary", "text-ke-secondary", "Descriptions"],
                      ["--ke-text-muted", "text-ke-muted", "Hints, timestamps"],
                      ["--ke-accent", "bg-ke-accent", "Primary buttons, links"],
                      ["--ke-focus", "ring-ke-focus", "Focus rings"],
                      ["--ke-positive", "text-ke-positive", "Positive amounts"],
                      ["--ke-negative", "text-ke-negative", "Negative amounts, errors"],
                    ].map(([token, cls, usage]) => (
                      <tr key={token}>
                        <td className="py-2 pr-4 font-mono text-xs text-ke-muted">
                          {token}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-ke-accent">
                          {cls}
                        </td>
                        <td className="py-2 text-ke-secondary">{usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </Section>

        <p className="pb-8 text-center text-xs text-ke-muted">
          Kid Expenses Design System v1.0
        </p>
      </div>
    </div>
  );
}
