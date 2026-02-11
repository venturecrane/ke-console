import type { Metadata } from 'next'
import Link from 'next/link'
import {
  DEMO_VIEWER_ID,
  DEMO_EXPENSES,
  DEMO_BALANCE,
  DEMO_ATTENTION_EXPENSES,
  DEMO_FEATURED_EXPENSE,
  DEMO_TIMELINE,
  getDemoUserName,
} from '@/lib/demoData'
import { formatCurrency, formatCategory } from '@/lib/statusColors'
import { canRespond } from '@/lib/expenseActions'
import { renderTimelineEvent, formatReasonLabel, formatResolutionLabel } from '@/lib/timelineUtils'
import { Button, Card, CardBody, StatusBadge, SectionHeader } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Demo - Kid Expenses',
  description: 'See how Kid Expenses helps co-parents track shared expenses.',
  robots: 'noindex, nofollow',
}

// The second featured expense: Doctor visit copay (questioned, Alex can respond)
const DEMO_COPAY_EXPENSE = DEMO_EXPENSES.find((e) => e.id === 'demo_exp_3')!

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-ke-bg">
      {/* Sticky banner + header */}
      <div className="sticky top-0 z-30">
        {/* Demo banner */}
        <div className="border-b border-ke-accent/30 bg-ke-accent-soft px-4 py-2 text-center text-sm text-ke-accent-soft-text">
          DEMO — Sample data. Actions disabled.{' '}
          <Link href="/sign-up" className="font-medium underline hover:no-underline">
            Sign up to create your own family &rarr;
          </Link>
        </div>

        {/* Header */}
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="text-xl font-semibold text-ke-primary">KE &middot; Kid Expenses</h1>
              <p className="text-sm text-ke-muted">Demo Family</p>
            </div>
            <Link href="/sign-up">
              <Button variant="primary" size="sm">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </header>

        {/* Demo navigation */}
        <nav className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 py-2">
            <a
              href="#dashboard"
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-ke-secondary hover:bg-ke-elevated"
            >
              Dashboard
            </a>
            <a
              href="#expense-detail"
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-ke-secondary hover:bg-ke-elevated"
            >
              Expense Detail
            </a>
            <a
              href="#timeline"
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-ke-secondary hover:bg-ke-elevated"
            >
              Timeline
            </a>
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        {/* ============ DASHBOARD SECTION ============ */}
        <section id="dashboard" className="scroll-mt-40 space-y-6">
          {/* Net Balance */}
          <Card>
            <CardBody>
              <SectionHeader title="Net Balance" />
              <p className="mt-3 text-3xl font-bold font-mono text-ke-primary">
                {formatCurrency(DEMO_BALANCE.owed_cents)}
              </p>
              <p className="mt-1 text-sm text-ke-secondary">You owe Jordan</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ke-muted">
                <span>
                  Total:{' '}
                  <span className="font-mono font-medium text-ke-secondary">
                    {formatCurrency(DEMO_BALANCE.total_cents)}
                  </span>
                </span>
                <span>
                  Your Share:{' '}
                  <span className="font-mono font-medium text-ke-secondary">
                    {formatCurrency(DEMO_BALANCE.each_share_cents)}
                  </span>
                </span>
              </div>
              {DEMO_BALANCE.questioned_count > 0 && (
                <p className="mt-2 text-sm text-ke-status-questioned-text">
                  {formatCurrency(DEMO_BALANCE.questioned_total_cents)} questioned (
                  {DEMO_BALANCE.questioned_count} expense)
                </p>
              )}
            </CardBody>
          </Card>

          {/* Needs Attention */}
          <div>
            <SectionHeader
              title={`Needs Attention (${DEMO_ATTENTION_EXPENSES.length})`}
              className="mb-3"
            />
            <div className="space-y-2">
              {DEMO_ATTENTION_EXPENSES.map((expense) => (
                <Card key={expense.id}>
                  <CardBody>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ke-primary truncate">
                          {expense.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={expense.status} />
                          {expense.status === 'questioned' && (
                            <span className="text-xs text-ke-muted">
                              {canRespond(expense, DEMO_VIEWER_ID)
                                ? 'Your response needed'
                                : 'Waiting for response'}
                            </span>
                          )}
                          {expense.status === 'pending_satisfaction' && (
                            <span className="text-xs text-ke-muted">Waiting for confirmation</span>
                          )}
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold font-mono text-ke-primary">
                        {formatCurrency(expense.amount_cents)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>

          {/* Disabled action buttons */}
          <div className="flex gap-3">
            <Button variant="primary" fullWidth disabled aria-disabled="true" tabIndex={-1}>
              + Add Expense
            </Button>
            <Button variant="secondary" fullWidth disabled aria-disabled="true" tabIndex={-1}>
              $ Record Payment
            </Button>
          </div>

          {/* Recent Expenses */}
          <div>
            <SectionHeader title="Recent Expenses" className="mb-3" />
            <div className="space-y-2">
              {DEMO_EXPENSES.map((expense) => {
                const isCreator = expense.created_by === DEMO_VIEWER_ID
                return (
                  <Card key={expense.id}>
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ke-primary truncate">
                            {expense.description}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ke-muted">
                            <span className="font-mono">
                              {new Date(expense.expense_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span>{isCreator ? 'You' : 'Jordan'}</span>
                            <span className="inline-flex items-center rounded-md bg-ke-elevated px-1.5 py-0.5 text-xs font-medium text-ke-secondary">
                              {formatCategory(expense.category)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <p className="text-sm font-semibold font-mono text-ke-primary">
                            {formatCurrency(expense.amount_cents)}
                          </p>
                          <StatusBadge status={expense.status} />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* ============ EXPENSE DETAIL SECTION ============ */}
        <section id="expense-detail" className="scroll-mt-40 space-y-6">
          <div className="border-t border-ke-divider pt-6">
            <h2 className="text-lg font-semibold text-ke-primary">Expense Detail View</h2>
            <p className="mt-1 text-sm text-ke-muted">See how disputes and responses work</p>
          </div>

          {/* Doctor visit copay — questioned, Alex can respond */}
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-medium text-ke-primary">
                    {DEMO_COPAY_EXPENSE.description}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ke-muted">
                    <span className="font-mono text-sm">
                      {new Date(DEMO_COPAY_EXPENSE.expense_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>Posted by You</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-ke-elevated px-2 py-0.5 text-xs font-medium text-ke-secondary">
                      {formatCategory(DEMO_COPAY_EXPENSE.category)}
                    </span>
                    <StatusBadge status={DEMO_COPAY_EXPENSE.status} />
                  </div>
                </div>
                <p className="shrink-0 text-2xl font-semibold font-mono text-ke-primary">
                  {formatCurrency(DEMO_COPAY_EXPENSE.amount_cents)}
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Question context + disabled Respond button */}
          {canRespond(DEMO_COPAY_EXPENSE, DEMO_VIEWER_ID) && (
            <Card>
              <CardBody>
                <div className="mb-4 rounded-lg bg-ke-status-questioned-bg p-3">
                  <p className="text-sm font-medium text-ke-status-questioned-text">
                    Questioned: {formatReasonLabel(DEMO_COPAY_EXPENSE.question_reason || '')}
                  </p>
                  {DEMO_COPAY_EXPENSE.question_note && (
                    <p className="mt-1 text-sm text-ke-status-questioned-text opacity-80">
                      &ldquo;{DEMO_COPAY_EXPENSE.question_note}&rdquo;
                    </p>
                  )}
                </div>
                <Button
                  variant="primary"
                  fullWidth
                  disabled
                  aria-disabled="true"
                  tabIndex={-1}
                  className="min-h-[44px]"
                >
                  Respond
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Divider between the two detail cards */}
          <div className="border-t border-ke-divider" />

          {/* After-school tutoring — pending_satisfaction, full detail */}
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-medium text-ke-primary">
                    {DEMO_FEATURED_EXPENSE.description}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ke-muted">
                    <span className="font-mono text-sm">
                      {new Date(DEMO_FEATURED_EXPENSE.expense_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>Posted by You</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-ke-elevated px-2 py-0.5 text-xs font-medium text-ke-secondary">
                      {formatCategory(DEMO_FEATURED_EXPENSE.category)}
                    </span>
                    <StatusBadge status={DEMO_FEATURED_EXPENSE.status} />
                  </div>
                </div>
                <p className="shrink-0 text-2xl font-semibold font-mono text-ke-primary">
                  {formatCurrency(DEMO_FEATURED_EXPENSE.amount_cents)}
                </p>
              </div>

              {DEMO_FEATURED_EXPENSE.memo && (
                <p className="mt-3 text-sm text-ke-secondary border-t border-ke-divider pt-3">
                  {DEMO_FEATURED_EXPENSE.memo}
                </p>
              )}
            </CardBody>
          </Card>

          {/* Waiting state — no action buttons, just informational */}
          <Card>
            <CardBody>
              <div className="rounded-lg bg-ke-attention-bg p-3">
                <p className="text-sm font-medium text-ke-primary">
                  You responded:{' '}
                  {formatResolutionLabel(DEMO_FEATURED_EXPENSE.resolution_action || 'keep')}
                </p>
                <p className="mt-1 text-sm text-ke-secondary">
                  Waiting for Jordan&rsquo;s confirmation
                </p>
              </div>
              {/* No action buttons — Alex cannot act on this expense (correct behavior) */}
            </CardBody>
          </Card>
        </section>

        {/* ============ TIMELINE SECTION ============ */}
        <section id="timeline" className="scroll-mt-40 space-y-4">
          <div className="border-t border-ke-divider pt-6">
            <SectionHeader title="Timeline" />
            <p className="mt-1 text-sm text-ke-muted">Full audit trail for After-school tutoring</p>
          </div>

          <div className="relative border-l-2 border-ke-divider pl-6 space-y-6">
            {DEMO_TIMELINE.map((event) => {
              const rendered = renderTimelineEvent(event, DEMO_VIEWER_ID, getDemoUserName)
              if (!rendered) return null

              return (
                <div key={event.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-ke-border bg-ke-surface" />

                  <p className="font-mono text-xs text-ke-muted">
                    {new Date(event.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' \u00b7 '}
                    {new Date(event.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-ke-primary">{rendered.label}</p>
                  {rendered.detail && (
                    <p className="mt-0.5 text-sm text-ke-secondary">{rendered.detail}</p>
                  )}
                  {rendered.note && (
                    <p className="mt-1 text-sm text-ke-muted italic">
                      &ldquo;{rendered.note}&rdquo;
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ============ CTA FOOTER ============ */}
        <section className="border-t border-ke-divider pt-8 pb-12 text-center space-y-4">
          <h2 className="text-xl font-semibold text-ke-primary">Ready to get started?</h2>
          <p className="text-sm text-ke-secondary">
            Create your family ledger and invite your co-parent.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/sign-up">
              <Button variant="primary" size="lg" className="px-8">
                Get Started Free
              </Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" size="lg" className="px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
