'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type { MeResponse, Expense, BalanceResponse } from '@/lib/api'
import { formatCurrency, formatCategory } from '@/lib/statusColors'
import { NEEDS_ATTENTION_STATUSES } from '@/lib/expenseStatus'
import {
  Button,
  Card,
  CardBody,
  StatusBadge,
  SectionHeader,
  EmptyState,
  Alert,
} from '@/components/ui'

const SETUP_DISMISSED_KEY = 'ke-setup-dismissed'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const api = useApi()
  const [syncStatus, setSyncStatus] = useState<'pending' | 'synced' | 'error'>('pending')
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [attentionExpenses, setAttentionExpenses] = useState<Expense[]>([])

  // Setup guide state
  const [setupDismissed, setSetupDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(SETUP_DISMISSED_KEY) === 'true'
  })
  const [hasChildren, setHasChildren] = useState(false)
  const [hasFixedExpenses, setHasFixedExpenses] = useState(false)

  const fetchUserData = useCallback(async () => {
    if (!user) return
    try {
      const data = await api.getMe()
      setMeData(data)
      const family = data.family
      if (family) {
        setIsLoadingExpenses(true)
        setIsLoadingBalance(true)
        try {
          const [expenseData, balanceData, ...attentionResults] = await Promise.all([
            api.getExpenses(family.id, { limit: 5 }),
            api.getBalance(family.id),
            ...(family.parent_b_id !== null
              ? NEEDS_ATTENTION_STATUSES.map((status) =>
                  api.getExpenses(family.id, { status, limit: 10 })
                )
              : []),
          ])
          setExpenses(expenseData.expenses)
          setBalance(balanceData)

          if (
            family.parent_b_id !== null &&
            attentionResults.length === NEEDS_ATTENTION_STATUSES.length
          ) {
            const merged = attentionResults
              .flatMap((r) => (r as { expenses: Expense[] }).expenses)
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            setAttentionExpenses(merged)
          }
        } catch (err) {
          console.error('Failed to fetch data:', err)
        } finally {
          setIsLoadingExpenses(false)
          setIsLoadingBalance(false)
        }

        // Setup guide data — separate try/catch so failures don't affect core dashboard
        if (!setupDismissed) {
          try {
            const [childrenData, fixedExpenseData] = await Promise.all([
              api.getChildren(family.id),
              api.getFixedExpenses(family.id),
            ])
            setHasChildren(childrenData.children.length > 0)
            setHasFixedExpenses(fixedExpenseData.fixedExpenses.length > 0)
          } catch (err) {
            console.error('Failed to fetch setup guide data:', err)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }, [user, api, setupDismissed])

  useEffect(() => {
    async function syncUser() {
      if (!user) return

      try {
        const response = await fetch('/api/sync-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          setSyncStatus('synced')
          await fetchUserData()
        } else {
          setSyncStatus('error')
        }
      } catch {
        setSyncStatus('error')
      }
    }

    if (isLoaded && user) {
      syncUser()
    }
  }, [isLoaded, user, fetchUserData])

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ke-muted">Loading...</p>
      </div>
    )
  }

  const hasFamily = meData?.family !== null
  const isParentA = meData?.role === 'parent_a'
  const hasPartner = meData?.family?.parent_b_id !== null

  // Setup guide suggestions — only show incomplete ones
  const setupSuggestions: { text: string; href: string }[] = []
  if (!setupDismissed && hasFamily) {
    if (!hasChildren) {
      setupSuggestions.push({
        text: 'Tip: Add your kids to tag expenses to specific family members.',
        href: '/settings/children',
      })
    }
    if (!hasPartner && isParentA) {
      setupSuggestions.push({
        text: 'You can invite a co-parent to share this expense ledger.',
        href: '/settings/family',
      })
    }
    if (!hasFixedExpenses) {
      setupSuggestions.push({
        text: 'Save time with recurring expense templates for predictable costs.',
        href: '/settings/fixed-expenses',
      })
    }
  }

  function handleDismissSetup() {
    localStorage.setItem(SETUP_DISMISSED_KEY, 'true')
    setSetupDismissed(true)
  }

  // Balance color logic
  const getBalanceColor = () => {
    if (!balance || balance.balance_cents === 0) return 'text-ke-positive'
    if (balance.payer_id === user?.id) return 'text-ke-negative'
    return 'text-ke-accent'
  }

  const getBalanceDirection = () => {
    if (!balance || balance.balance_cents === 0) return null
    if (balance.payer_id === user?.id) return 'You owe'
    return 'You are owed'
  }

  // Setup guide header text
  const setupHeader = isParentA
    ? 'Getting Started'
    : meData?.family?.name
      ? `Welcome to ${meData.family.name}!`
      : 'Welcome!'

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="sticky top-0 z-30 border-b border-ke-border bg-ke-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ke-accent text-xs font-bold text-ke-inverse">
              KE
            </div>
            <h1 className="text-lg font-semibold text-ke-primary">Kid Expenses</h1>
            {meData?.family?.name && (
              <span className="hidden text-sm text-ke-muted sm:inline">{meData.family.name}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ke-secondary sm:inline">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            {hasFamily && (
              <Link
                href="/settings"
                className="text-ke-muted transition-colors hover:text-ke-secondary"
                aria-label="Settings"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Loading/Error State */}
        {syncStatus === 'pending' && (
          <Card>
            <CardBody>
              <p className="text-sm text-ke-muted">Loading your data...</p>
            </CardBody>
          </Card>
        )}
        {syncStatus === 'error' && (
          <Alert variant="error">Failed to load data. Please refresh the page.</Alert>
        )}

        {/* No Family - Show Welcome and Create/Join Options */}
        {syncStatus === 'synced' && !hasFamily && (
          <>
            <Card>
              <CardBody>
                <h2 className="mb-4 text-lg font-medium text-ke-primary">
                  Welcome, {user?.firstName || 'there'}!
                </h2>
                <p className="text-ke-secondary">
                  Get started by creating a family or joining one with an invite code.
                </p>
              </CardBody>
            </Card>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Link
                href="/family/create"
                className="rounded-lg border border-ke-border bg-ke-surface p-6 transition-colors hover:bg-ke-elevated"
              >
                <h3 className="mb-2 text-lg font-medium text-ke-primary">Create a Family</h3>
                <p className="text-sm text-ke-secondary">
                  Start tracking expenses and invite your co-parent to join
                </p>
              </Link>

              <Link
                href="/family/join"
                className="rounded-lg border border-ke-border bg-ke-surface p-6 transition-colors hover:bg-ke-elevated"
              >
                <h3 className="mb-2 text-lg font-medium text-ke-primary">Join a Family</h3>
                <p className="text-sm text-ke-secondary">
                  Have an invite code? Join your co-parent&apos;s family
                </p>
              </Link>
            </div>
          </>
        )}

        {/* Has Family - Dashboard */}
        {syncStatus === 'synced' && hasFamily && (
          <>
            {/* Net Balance Card */}
            <Card>
              <CardBody>
                {isLoadingBalance ? (
                  <p className="text-center text-sm text-ke-muted">Calculating balance...</p>
                ) : balance ? (
                  <div className="text-center">
                    <SectionHeader title="Net Balance" className="justify-center" />
                    <p className={`mt-2 text-4xl font-bold font-mono ${getBalanceColor()}`}>
                      {balance.balance_cents === 0
                        ? '$0.00'
                        : formatCurrency(balance.balance_cents)}
                    </p>
                    <p className="mt-1 text-sm text-ke-muted">
                      {balance.balance_cents === 0
                        ? hasPartner
                          ? 'Settled up'
                          : 'No expenses recorded yet'
                        : getBalanceDirection()}
                    </p>

                    {/* Summary Stats */}
                    {balance.breakdown.total_expenses_cents > 0 && (
                      <div className="mt-6 border-t border-ke-divider pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                              Total Expenses
                            </p>
                            <p className="mt-1 text-lg font-semibold font-mono text-ke-primary">
                              {formatCurrency(balance.breakdown.total_expenses_cents)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-ke-muted">
                              Your Share
                            </p>
                            <p className="mt-1 text-lg font-semibold font-mono text-ke-primary">
                              {formatCurrency(
                                isParentA
                                  ? balance.breakdown.a_share_cents
                                  : balance.breakdown.b_share_cents
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <SectionHeader title="Net Balance" className="justify-center" />
                    <p className="mt-2 text-4xl font-bold font-mono text-ke-muted">$0.00</p>
                    <p className="mt-1 text-sm text-ke-muted">No expenses recorded yet</p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Setup Guide — dismissable suggestions */}
            {setupSuggestions.length > 0 && (
              <Card className="mt-6">
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-ke-primary">{setupHeader}</h3>
                      <p className="mt-0.5 text-xs text-ke-muted">
                        Optional tips to help you get the most out of Kid Expenses.
                      </p>
                    </div>
                    <button
                      onClick={handleDismissSetup}
                      className="shrink-0 text-ke-muted transition-colors hover:text-ke-secondary"
                      aria-label="Dismiss setup guide"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {setupSuggestions.map((suggestion) => (
                      <Link
                        key={suggestion.href}
                        href={suggestion.href}
                        className="flex items-center justify-between rounded-lg border border-ke-border px-3 py-2.5 text-sm text-ke-secondary transition-colors hover:bg-ke-elevated"
                      >
                        <span>{suggestion.text}</span>
                        <svg
                          className="ml-2 h-4 w-4 shrink-0 text-ke-muted"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Needs Attention Section */}
            {attentionExpenses.length > 0 && (
              <div className="mt-6 rounded-lg border border-ke-attention-border/30 bg-ke-surface">
                <div className="border-l-4 border-ke-attention-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-ke-status-questioned-text">
                      Needs Attention ({attentionExpenses.length})
                    </h3>
                    <Link
                      href="/expenses?status=needs_attention"
                      className="text-xs font-medium text-ke-status-questioned-text hover:opacity-80"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="divide-y divide-ke-divider">
                    {attentionExpenses.slice(0, 3).map((expense) => (
                      <Link
                        key={expense.id}
                        href={`/expenses/${expense.id}`}
                        className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-ke-primary">
                              {expense.description}
                            </p>
                            <StatusBadge status={expense.status} />
                          </div>
                        </div>
                        <p className="ml-4 shrink-0 text-sm font-semibold font-mono text-ke-primary">
                          {formatCurrency(expense.amount_cents)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/expenses/add">
                <Button fullWidth size="lg">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Expense
                </Button>
              </Link>
              <Link href="/payments/add">
                <Button variant="secondary" fullWidth size="lg">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Record Payment
                </Button>
              </Link>
            </div>

            {/* Quick Navigation */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/expenses"
                className="inline-flex items-center gap-2 rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-sm font-medium text-ke-secondary-text transition-colors hover:bg-ke-elevated"
              >
                All Expenses
              </Link>
              <Link
                href="/payments"
                className="inline-flex items-center gap-2 rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-sm font-medium text-ke-secondary-text transition-colors hover:bg-ke-elevated"
              >
                Payment History
              </Link>
              <Link
                href="/activity"
                className="inline-flex items-center gap-2 rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-sm font-medium text-ke-secondary-text transition-colors hover:bg-ke-elevated"
              >
                Activity Feed
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-sm font-medium text-ke-secondary-text transition-colors hover:bg-ke-elevated"
              >
                Settings
              </Link>
            </div>

            {/* Recent Activity */}
            <Card className="mt-8">
              <div className="flex items-center justify-between px-6 py-4">
                <SectionHeader title="Recent Activity" />
                <Link href="/expenses" className="text-sm text-ke-secondary hover:text-ke-primary">
                  View All
                </Link>
              </div>

              {isLoadingExpenses && (
                <div className="px-6 pb-6">
                  <p className="text-sm text-ke-muted">Loading...</p>
                </div>
              )}

              {!isLoadingExpenses && expenses.length === 0 && (
                <CardBody>
                  <EmptyState
                    title="No expenses yet"
                    description="Add your first expense to get started"
                    className="border-0"
                  />
                </CardBody>
              )}

              {!isLoadingExpenses && expenses.length > 0 && (
                <div className="divide-y divide-ke-divider">
                  {expenses.map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-ke-elevated"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={expense.status} />
                          <p className="truncate font-medium text-ke-primary">
                            {expense.description}
                          </p>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-ke-muted">
                          <span>{formatCategory(expense.category)}</span>
                          <span className="font-mono">
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </span>
                          <span>{expense.paid_by === user?.id ? 'You paid' : 'Partner paid'}</span>
                        </div>
                      </div>
                      <p
                        className={`ml-4 shrink-0 font-semibold font-mono ${expense.amount_cents < 0 ? 'text-ke-positive' : 'text-ke-primary'}`}
                      >
                        {expense.amount_cents < 0 ? '-' : ''}
                        {formatCurrency(Math.abs(expense.amount_cents))}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
