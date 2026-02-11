'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type { MeResponse, BalanceBreakdownResponse } from '@/lib/api'
import { formatCurrency, formatCategory } from '@/lib/statusColors'
import { Button, Card, CardBody, StatusBadge, EmptyState, Alert, Badge } from '@/components/ui'

export default function BalanceBreakdownPage() {
  const { user, isLoaded } = useUser()
  const api = useApi()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [breakdown, setBreakdown] = useState<BalanceBreakdownResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showExcluded, setShowExcluded] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const me = await api.getMe()
      setMeData(me)

      if (me.family) {
        const data = await api.getBalanceBreakdown(me.family.id)
        setBreakdown(data)
      }
    } catch (err) {
      console.error('Failed to fetch balance breakdown:', err)
      setError(err instanceof Error ? err.message : 'Failed to load balance breakdown')
    } finally {
      setIsLoading(false)
    }
  }, [user, api])

  useEffect(() => {
    if (isLoaded && user) {
      fetchData()
    }
  }, [isLoaded, user, fetchData])

  const isParentA = meData?.role === 'parent_a'

  function getBalanceLabel(): string {
    if (!breakdown || breakdown.balance_cents === 0) return 'All settled up!'
    if (breakdown.payer_id === user?.id) {
      return `You owe ${formatCurrency(breakdown.balance_cents)}`
    }
    return `Your co-parent owes you ${formatCurrency(breakdown.balance_cents)}`
  }

  function getBalanceColor(): string {
    if (!breakdown || breakdown.balance_cents === 0) return 'text-ke-positive'
    if (breakdown.payer_id === user?.id) return 'text-ke-negative'
    return 'text-ke-accent'
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-secondary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Balance Breakdown</h1>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 rounded-xl bg-ke-elevated" />
            <div className="h-48 rounded-xl bg-ke-elevated" />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-secondary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Balance Breakdown</h1>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Alert variant="error">{error}</Alert>
        </main>
      </div>
    )
  }

  if (!breakdown) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-secondary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Balance Breakdown</h1>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <EmptyState
            title="No balance data"
            description="No family found or no expenses recorded yet."
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Link href="/dashboard" className="text-ke-muted hover:text-ke-secondary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold text-ke-primary">Balance Breakdown</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Current Balance Card */}
        <Card>
          <CardBody>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                Current Balance
              </p>
              <p className={`mt-2 text-3xl font-bold font-mono ${getBalanceColor()}`}>
                {breakdown.balance_cents === 0 ? '$0.00' : formatCurrency(breakdown.balance_cents)}
              </p>
              <p className="mt-1 text-sm text-ke-secondary">{getBalanceLabel()}</p>
            </div>
          </CardBody>
        </Card>

        {/* Included Expenses */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ke-muted">
            Included Expenses ({breakdown.included_expenses.length})
          </h2>
          {breakdown.included_expenses.length === 0 ? (
            <EmptyState
              title="No included expenses"
              description="No expenses are included in the balance calculation."
            />
          ) : (
            <div className="space-y-2">
              {breakdown.included_expenses.map((expense) => (
                <Link key={expense.id} href={`/expenses/${expense.id}`}>
                  <Card className="transition-colors hover:bg-ke-elevated">
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-ke-primary truncate">
                              {expense.description}
                            </p>
                            <Badge variant="default">{formatCategory(expense.category)}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-ke-muted font-mono">
                            {new Date(expense.expense_date).toLocaleDateString()}
                            {' -- '}
                            {expense.paid_by === user?.id ? 'You paid' : 'Co-parent paid'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ke-secondary">
                            <span>
                              Your share:{' '}
                              <span className="font-mono font-semibold">
                                {formatCurrency(
                                  isParentA ? expense.a_share_cents : expense.b_share_cents
                                )}
                              </span>
                            </span>
                            <span>
                              Co-parent share:{' '}
                              <span className="font-mono font-semibold">
                                {formatCurrency(
                                  isParentA ? expense.b_share_cents : expense.a_share_cents
                                )}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold font-mono text-ke-primary">
                            {formatCurrency(expense.amount_cents)}
                          </p>
                          <p
                            className={`mt-1 text-xs font-mono font-medium ${expense.net_impact_cents > 0 ? 'text-ke-negative' : expense.net_impact_cents < 0 ? 'text-ke-positive' : 'text-ke-muted'}`}
                          >
                            {expense.net_impact_cents === 0
                              ? 'No impact'
                              : expense.net_impact_cents > 0
                                ? `+${formatCurrency(expense.net_impact_cents)}`
                                : `-${formatCurrency(Math.abs(expense.net_impact_cents))}`}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Excluded Expenses (Collapsible) */}
        {breakdown.excluded_expenses.length > 0 && (
          <div>
            <button
              onClick={() => setShowExcluded(!showExcluded)}
              className="mb-3 flex w-full items-center justify-between text-sm font-semibold uppercase tracking-widest text-ke-muted hover:text-ke-secondary"
            >
              <span>Excluded Expenses ({breakdown.excluded_expenses.length})</span>
              <svg
                className={`h-4 w-4 transition-transform ${showExcluded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showExcluded && (
              <div className="space-y-2">
                {breakdown.excluded_expenses.map((expense) => (
                  <Card key={expense.id} className="opacity-70">
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-ke-primary truncate">
                              {expense.description}
                            </p>
                            <StatusBadge status={expense.status} />
                          </div>
                          <p className="mt-1 text-xs text-ke-muted">{expense.exclusion_reason}</p>
                        </div>
                        <p className="text-sm font-semibold font-mono text-ke-muted shrink-0">
                          {formatCurrency(expense.amount_cents)}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ke-muted">
            Payments ({breakdown.payments.length})
          </h2>
          {breakdown.payments.length === 0 ? (
            <EmptyState
              title="No payments recorded"
              description="Record a payment to settle up."
              action={
                <Link href="/payments/add">
                  <Button size="sm">Record Payment</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {breakdown.payments.map((payment) => (
                <Card key={payment.id}>
                  <CardBody>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ke-primary">
                          {payment.paid_by === user?.id ? 'You paid' : 'Co-parent paid'}
                        </p>
                        <p className="mt-0.5 text-xs text-ke-muted font-mono">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                        {payment.notes && (
                          <p className="mt-1 text-sm text-ke-secondary">{payment.notes}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold font-mono text-ke-positive shrink-0">
                        {formatCurrency(payment.amount_cents)}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
