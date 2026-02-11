'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type {
  MeResponse,
  FixedExpense,
  ExpenseCategory,
  FixedExpenseTier,
  RecurringFrequency,
} from '@/lib/api'
import { formatCurrency, formatCategory } from '@/lib/statusColors'
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Alert,
  EmptyState,
  UpgradeModal,
} from '@/components/ui'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'medical', label: 'Medical' },
  { value: 'activities', label: 'Activities' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'other', label: 'Other' },
]

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

// Format frequency for display
function formatFrequency(frequency: string): string {
  const labels: Record<string, string> = {
    weekly: 'week',
    biweekly: '2 weeks',
    monthly: 'month',
    quarterly: 'quarter',
    annually: 'year',
  }
  return labels[frequency] || frequency
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export default function FixedExpensesSettingsPage() {
  const { user, isLoaded } = useUser()
  const api = useApi()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [tier, setTier] = useState<FixedExpenseTier | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeEnded, setIncludeEnded] = useState(false)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addDescription, setAddDescription] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [addCategory, setAddCategory] = useState<ExpenseCategory>('other')
  const [addFrequency, setAddFrequency] = useState<RecurringFrequency>('monthly')
  const [addEffectiveFrom, setAddEffectiveFrom] = useState(getTodayDate())
  const [addEffectiveUntil, setAddEffectiveUntil] = useState('')
  const [addLinkUrl, setAddLinkUrl] = useState('')
  const [addMemo, setAddMemo] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('other')
  const [editFrequency, setEditFrequency] = useState<RecurringFrequency>('monthly')
  const [editEffectiveUntil, setEditEffectiveUntil] = useState('')
  const [editLinkUrl, setEditLinkUrl] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // End (delete) state
  const [endingId, setEndingId] = useState<string | null>(null)
  const [showEndConfirm, setShowEndConfirm] = useState<string | null>(null)

  // Upgrade modal state (#93)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const fetchFixedExpenses = useCallback(async () => {
    if (!user || !meData?.family) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.getFixedExpenses(meData.family.id, includeEnded)
      setFixedExpenses(data.fixedExpenses)
      setTier(data.tier)
    } catch (err) {
      console.error('Failed to fetch fixed expenses:', err)
      setError('Failed to load recurring expenses. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [user, meData?.family, includeEnded, api])

  // Fetch user data on load
  useEffect(() => {
    async function loadUserData() {
      if (!user) return
      try {
        const data = await api.getMe()
        setMeData(data)
      } catch (err) {
        console.error('Failed to load user data:', err)
        setError('Failed to load user data. Please try again.')
      }
    }

    if (isLoaded && user) {
      loadUserData()
    }
  }, [isLoaded, user, api])

  // Fetch fixed expenses when user data is loaded
  useEffect(() => {
    if (meData?.family) {
      fetchFixedExpenses()
    }
  }, [meData?.family, fetchFixedExpenses])

  async function handleAddFixedExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !meData?.family) return

    setIsAdding(true)
    setAddError(null)

    try {
      const amount = parseFloat(addAmount)
      if (isNaN(amount) || amount <= 0) {
        setAddError('Please enter a valid positive amount')
        setIsAdding(false)
        return
      }

      const result = await api.createFixedExpense(meData.family.id, {
        description: addDescription.trim(),
        amount,
        category: addCategory,
        frequency: addFrequency,
        effectiveFrom: addEffectiveFrom,
        effectiveUntil: addEffectiveUntil || undefined,
        linkUrl: addLinkUrl || undefined,
        memo: addMemo || undefined,
      })

      setFixedExpenses((prev) => [result.fixedExpense, ...prev])
      if (tier) {
        setTier({
          ...tier,
          current: tier.current + 1,
          canAdd: tier.limit === -1 || tier.current + 1 < tier.limit,
        })
      }

      // Reset form
      setShowAddForm(false)
      setAddDescription('')
      setAddAmount('')
      setAddCategory('other')
      setAddFrequency('monthly')
      setAddEffectiveFrom(getTodayDate())
      setAddEffectiveUntil('')
      setAddLinkUrl('')
      setAddMemo('')
    } catch (err) {
      console.error('Failed to add fixed expense:', err)
      setAddError(err instanceof Error ? err.message : 'Failed to add recurring expense')
    } finally {
      setIsAdding(false)
    }
  }

  function openEditModal(expense: FixedExpense) {
    setEditingExpense(expense)
    setEditDescription(expense.description)
    setEditAmount((expense.amount_cents / 100).toString())
    setEditCategory(expense.category as ExpenseCategory)
    setEditFrequency(expense.frequency || 'monthly')
    setEditEffectiveUntil(expense.effective_until || '')
    setEditLinkUrl(expense.link_url || '')
    setEditMemo(expense.memo || '')
    setEditError(null)
  }

  async function handleEditFixedExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !meData?.family || !editingExpense) return

    setIsEditing(true)
    setEditError(null)

    try {
      const amount = parseFloat(editAmount)
      if (isNaN(amount) || amount <= 0) {
        setEditError('Please enter a valid positive amount')
        setIsEditing(false)
        return
      }

      const result = await api.updateFixedExpense(meData.family.id, editingExpense.id, {
        description: editDescription.trim(),
        amount,
        category: editCategory,
        frequency: editFrequency,
        effectiveUntil: editEffectiveUntil || null,
        linkUrl: editLinkUrl || null,
        memo: editMemo || null,
      })

      setFixedExpenses((prev) =>
        prev.map((exp) => (exp.id === result.fixedExpense.id ? result.fixedExpense : exp))
      )

      setEditingExpense(null)
    } catch (err) {
      console.error('Failed to update fixed expense:', err)
      setEditError(err instanceof Error ? err.message : 'Failed to update recurring expense')
    } finally {
      setIsEditing(false)
    }
  }

  async function handleEndFixedExpense(id: string) {
    if (!user || !meData?.family) return

    setEndingId(id)

    try {
      const result = await api.endFixedExpense(meData.family.id, id)

      if (includeEnded) {
        // Update the expense in place
        setFixedExpenses((prev) =>
          prev.map((exp) => (exp.id === result.fixedExpense.id ? result.fixedExpense : exp))
        )
      } else {
        // Remove from list since we're not showing ended ones
        setFixedExpenses((prev) => prev.filter((exp) => exp.id !== id))
      }

      if (tier) {
        setTier({ ...tier, current: tier.current - 1, canAdd: true })
      }

      setShowEndConfirm(null)
    } catch (err) {
      console.error('Failed to end fixed expense:', err)
      setError(err instanceof Error ? err.message : 'Failed to end recurring expense')
    } finally {
      setEndingId(null)
    }
  }

  // Check if expense is ended
  function isExpenseEnded(expense: FixedExpense): boolean {
    if (!expense.effective_until) return false
    return new Date(expense.effective_until) < new Date()
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ke-muted">Loading...</p>
      </div>
    )
  }

  if (!meData?.family) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-ke-muted hover:text-ke-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-ke-primary">Recurring Expenses</h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardBody className="text-center">
              <p className="text-ke-secondary">You need to create or join a family first.</p>
              <div className="mt-4">
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Recurring Expenses</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Error Display */}
        {error && (
          <Alert variant="error" className="mb-6">
            <p>{error}</p>
          </Alert>
        )}

        {/* Tier Info & Add Button */}
        <Card className="mb-6">
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-medium text-ke-primary">Recurring Monthly Templates</h2>
              <p className="mt-1 text-sm text-ke-muted">
                {tier &&
                  (tier.limit === -1
                    ? `${tier.current} active recurring expenses (Pro: Unlimited)`
                    : `${tier.current}/${tier.limit} templates used`)}
              </p>
              {/* Progress bar for free tier */}
              {tier && tier.limit !== -1 && (
                <div className="mt-2 h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-ke-elevated">
                  <div
                    className={`h-full rounded-full transition-all ${
                      tier.current >= tier.limit ? 'bg-ke-negative' : 'bg-ke-accent'
                    }`}
                    style={{ width: `${Math.min(100, (tier.current / tier.limit) * 100)}%` }}
                  />
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                if (tier && !tier.canAdd && tier.limit !== -1) {
                  setShowUpgradeModal(true)
                } else {
                  setShowAddForm(true)
                }
              }}
            >
              Add Recurring Expense
            </Button>
          </CardBody>
        </Card>

        {/* Tier Limit Warning */}
        {tier && !tier.canAdd && tier.limit !== -1 && (
          <Alert variant="attention" className="mb-6">
            <div className="flex gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="font-medium">Recurring expense limit reached</p>
                <p className="mt-1 text-sm">
                  Free tier allows up to {tier.limit} recurring expenses.{' '}
                  <Link
                    href="/settings/billing"
                    className="text-ke-accent underline hover:no-underline"
                  >
                    Upgrade to Pro
                  </Link>{' '}
                  for unlimited.
                </p>
              </div>
            </div>
          </Alert>
        )}

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardBody>
              <h2 className="mb-4 text-lg font-medium text-ke-primary">Add Recurring Expense</h2>

              {addError && (
                <Alert variant="error" className="mb-4">
                  <p>{addError}</p>
                </Alert>
              )}

              <form onSubmit={handleAddFixedExpense} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                      placeholder="e.g., Monthly tuition"
                      maxLength={200}
                      required
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                      Amount ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                      Category *
                    </label>
                    <select
                      value={addCategory}
                      onChange={(e) => setAddCategory(e.target.value as ExpenseCategory)}
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                      Frequency *
                    </label>
                    <select
                      value={addFrequency}
                      onChange={(e) => setAddFrequency(e.target.value as RecurringFrequency)}
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                    >
                      {FREQUENCIES.map((freq) => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                      Effective From *
                    </label>
                    <input
                      type="date"
                      value={addEffectiveFrom}
                      onChange={(e) => setAddEffectiveFrom(e.target.value)}
                      required
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                      Effective Until (optional)
                    </label>
                    <input
                      type="date"
                      value={addEffectiveUntil}
                      onChange={(e) => setAddEffectiveUntil(e.target.value)}
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                      Link URL (optional)
                    </label>
                    <input
                      type="url"
                      value={addLinkUrl}
                      onChange={(e) => setAddLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    Memo (optional)
                  </label>
                  <textarea
                    value={addMemo}
                    onChange={(e) => setAddMemo(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddForm(false)}
                    disabled={isAdding}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isAdding || !addDescription.trim() || !addAmount}>
                    {isAdding ? 'Adding...' : 'Add Recurring Expense'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Include Ended Toggle */}
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="includeEnded"
            checked={includeEnded}
            onChange={(e) => setIncludeEnded(e.target.checked)}
            className="h-4 w-4 rounded border-ke-border text-ke-primary"
          />
          <label htmlFor="includeEnded" className="text-sm text-ke-secondary">
            Show ended recurring expenses
          </label>
        </div>

        {/* Recurring Expenses List */}
        <Card>
          <CardHeader className="border-b border-ke-border">
            <h2 className="text-lg font-medium text-ke-primary">
              Recurring Expenses ({fixedExpenses.length})
            </h2>
            <p className="mt-1 text-sm text-ke-muted">
              These templates auto-generate expenses on the 1st of each month.
            </p>
          </CardHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-ke-muted">Loading recurring expenses...</p>
            </div>
          ) : fixedExpenses.length === 0 ? (
            <EmptyState
              title="No recurring expenses yet"
              description="Add recurring monthly expenses like rent, tuition, or subscriptions."
              className="border-0 rounded-none"
            />
          ) : (
            <ul className="divide-y divide-ke-divider">
              {fixedExpenses.map((expense) => (
                <li key={expense.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-ke-primary">{expense.description}</p>
                        <span className="rounded-full bg-ke-elevated px-2 py-0.5 text-xs font-medium text-ke-secondary">
                          {formatCategory(expense.category)}
                        </span>
                        {isExpenseEnded(expense) && (
                          <span className="rounded-full bg-ke-status-closed-bg px-2 py-0.5 text-xs font-medium text-ke-status-closed-text">
                            Ended
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ke-muted">
                        <span className="font-mono">
                          {formatCurrency(expense.amount_cents)}/
                          {formatFrequency(expense.frequency || 'monthly')}
                        </span>
                        <span className="font-mono">
                          From: {new Date(expense.effective_from).toLocaleDateString()}
                        </span>
                        {expense.effective_until && (
                          <span className="font-mono">
                            Until: {new Date(expense.effective_until).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {expense.memo && (
                        <p className="mt-2 text-sm text-ke-muted line-clamp-2">{expense.memo}</p>
                      )}
                    </div>

                    {!isExpenseEnded(expense) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditModal(expense)}
                          className="rounded-lg p-2 text-ke-muted transition-colors hover:bg-ke-elevated hover:text-ke-secondary"
                          title="Edit"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {showEndConfirm === expense.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ke-muted">End?</span>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleEndFixedExpense(expense.id)}
                              disabled={endingId === expense.id}
                            >
                              {endingId === expense.id ? '...' : 'Yes'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowEndConfirm(null)}
                              disabled={endingId === expense.id}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowEndConfirm(expense.id)}
                            className="rounded-lg p-2 text-ke-muted transition-colors hover:bg-ke-elevated hover:text-ke-negative"
                            title="End recurring expense"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Info Note */}
        <Alert variant="info" className="mt-6">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium">How recurring expenses work</p>
              <p className="mt-1 text-sm">
                Recurring expenses automatically generate regular expenses on the 1st of each month
                (or when you first open the app that month). Only active templates within their
                effective date range will generate expenses.
              </p>
            </div>
          </div>
        </Alert>
      </main>

      {/* Upgrade Modal (#93) */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Template Limit Reached"
        description={`Free accounts can create up to ${tier?.limit ?? 2} recurring templates. Upgrade to Pro for unlimited.`}
      />

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <CardBody>
              <h3 className="mb-4 text-lg font-semibold text-ke-primary">Edit Recurring Expense</h3>

              {editError && (
                <Alert variant="error" className="mb-4">
                  <p>{editError}</p>
                </Alert>
              )}

              <form onSubmit={handleEditFixedExpense} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={200}
                    required
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    Frequency *
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value as RecurringFrequency)}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    Effective Until (optional)
                  </label>
                  <input
                    type="date"
                    value={editEffectiveUntil}
                    onChange={(e) => setEditEffectiveUntil(e.target.value)}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    Link URL (optional)
                  </label>
                  <input
                    type="url"
                    value={editLinkUrl}
                    onChange={(e) => setEditLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    Memo (optional)
                  </label>
                  <textarea
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingExpense(null)}
                    disabled={isEditing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isEditing || !editDescription.trim() || !editAmount}
                  >
                    {isEditing ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
