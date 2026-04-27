'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type {
  MeResponse,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseFilters,
  QuestionReason,
  ResolutionAction,
  SubscriptionResponse,
  Child,
} from '@/lib/api'
import { formatCurrency, formatCategory } from '@/lib/formatters'
import { NEEDS_ATTENTION_STATUSES } from '@/lib/expenseStatus'
import {
  Button,
  Card,
  CardBody,
  StatusBadge,
  EmptyState,
  Alert,
  UpgradeModal,
} from '@/components/ui'

const ITEMS_PER_PAGE = 20

const CATEGORIES: { value: ExpenseCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'school', label: 'School' },
  { value: 'medical', label: 'Medical' },
  { value: 'activities', label: 'Activities' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS: { value: ExpenseStatus | '' | 'needs_attention'; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'needs_attention', label: 'Needs Attention' },
  { value: 'posted', label: 'Posted' },
  { value: 'questioned', label: 'Questioned' },
  { value: 'pending_satisfaction', label: 'Pending Satisfaction' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'resolved_creator_decided', label: 'Resolved (timeout)' },
  { value: 'resolved_personal', label: 'Personal' },
  { value: 'closed_unresolved', label: 'Closed Unresolved' },
]

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' },
]

const QUESTION_REASONS: { value: QuestionReason; label: string }[] = [
  { value: 'wrong_amount', label: 'Wrong Amount' },
  { value: 'not_child_related', label: 'Not Kid Related' },
  { value: 'duplicate', label: 'Duplicate Entry' },
  { value: 'split_dispute', label: 'Split Dispute' },
  { value: 'other', label: 'Other' },
]

const RESOLUTION_ACTIONS: { value: ResolutionAction; label: string; description: string }[] = [
  { value: 'keep', label: 'Keep As-Is', description: 'Keep the expense unchanged' },
  { value: 'edit', label: 'Edit Amount', description: 'Update the amount' },
  { value: 'personal', label: 'Mark as Personal', description: "Won't count in split" },
  { value: 'delete', label: 'Delete Expense', description: 'Remove this expense' },
]

// Get date range based on preset
function getDateRange(preset: string): { startDate?: string; endDate?: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (preset) {
    case 'this-month': {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      return { startDate, endDate }
    }
    case 'last-month': {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]
      return { startDate, endDate }
    }
    case 'last-3-months': {
      const startDate = new Date(year, month - 2, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      return { startDate, endDate }
    }
    default:
      return {}
  }
}

export default function ExpenseListPage() {
  const { user, isLoaded } = useUser()
  const api = useApi()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [currentOffset, setCurrentOffset] = useState(0)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('')
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | '' | 'needs_attention'>('')
  const [dateRangePreset, setDateRangePreset] = useState('this-month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [childFilter, setChildFilter] = useState('')
  const [children, setChildren] = useState<Child[]>([])

  // Question modal state
  const [questionModalExpense, setQuestionModalExpense] = useState<Expense | null>(null)
  const [questionReason, setQuestionReason] = useState<QuestionReason>('wrong_amount')
  const [questionNote, setQuestionNote] = useState('')
  const [isQuestioning, setIsQuestioning] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)

  // Resolve modal state
  const [resolveModalExpense, setResolveModalExpense] = useState<Expense | null>(null)
  const [resolveAction, setResolveAction] = useState<ResolutionAction>('keep')
  const [resolveNewAmount, setResolveNewAmount] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  // Satisfy state
  const [satisfyingExpenseId, setSatisfyingExpenseId] = useState<string | null>(null)

  // CSV Export state
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Read status filter from URL on mount (e.g., /expenses?status=needs_attention)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlStatus = params.get('status')
    if (urlStatus) {
      setStatusFilter(urlStatus as ExpenseStatus | 'needs_attention')
    }
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (questionModalExpense || resolveModalExpense) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [questionModalExpense, resolveModalExpense])

  const fetchExpenses = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      if (!user || !meData?.family) return

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        // Build base filters (everything except status)
        const baseFilters: Omit<ExpenseFilters, 'status'> & { status?: ExpenseStatus } = {
          limit: ITEMS_PER_PAGE,
          offset,
        }

        if (categoryFilter) {
          baseFilters.category = categoryFilter
        }

        if (childFilter) {
          baseFilters.childId = childFilter
        }

        // Handle date range
        if (dateRangePreset === 'custom') {
          if (customStartDate) baseFilters.startDate = customStartDate
          if (customEndDate) baseFilters.endDate = customEndDate
        } else if (dateRangePreset !== 'all') {
          const { startDate, endDate } = getDateRange(dateRangePreset)
          if (startDate) baseFilters.startDate = startDate
          if (endDate) baseFilters.endDate = endDate
        }

        // "Needs Attention" fetches multiple statuses and merges
        if (statusFilter === 'needs_attention') {
          const results = await Promise.all(
            NEEDS_ATTENTION_STATUSES.map((status) =>
              api.getExpenses(meData.family!.id, { ...baseFilters, status, limit: 100, offset: 0 })
            )
          )
          const merged = results
            .flatMap((r) => r.expenses)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          const total = results.reduce((sum, r) => sum + r.pagination.total, 0)

          if (append) {
            setExpenses((prev) => [...prev, ...merged])
          } else {
            setExpenses(merged)
          }
          setTotalExpenses(total)
          setCurrentOffset(merged.length)
        } else {
          if (statusFilter) {
            baseFilters.status = statusFilter
          }

          const data = await api.getExpenses(meData.family.id, baseFilters)

          if (append) {
            setExpenses((prev) => [...prev, ...data.expenses])
          } else {
            setExpenses(data.expenses)
          }
          setTotalExpenses(data.pagination.total)
          setCurrentOffset(offset + data.expenses.length)
        }
      } catch (error) {
        console.error('Failed to fetch expenses:', error)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [
      user,
      meData?.family,
      categoryFilter,
      statusFilter,
      dateRangePreset,
      customStartDate,
      customEndDate,
      childFilter,
      api,
    ]
  )

  // Fetch user data on load
  useEffect(() => {
    async function loadUserData() {
      if (!user) return
      try {
        const data = await api.getMe()
        setMeData(data)
        if (data.family) {
          try {
            const [sub, childrenData] = await Promise.all([
              api.getSubscription(data.family.id),
              api.getChildren(data.family.id),
            ])
            setSubscription(sub)
            setChildren(childrenData.children)
          } catch {
            // Non-critical; export may just work or fail gracefully
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      }
    }

    if (isLoaded && user) {
      loadUserData()
    }
  }, [isLoaded, user, api])

  // Fetch expenses when user data or filters change
  useEffect(() => {
    if (meData?.family) {
      fetchExpenses(0, false)
    }
  }, [meData?.family, fetchExpenses])

  const handleLoadMore = () => {
    fetchExpenses(currentOffset, true)
  }

  const hasMore = currentOffset < totalExpenses

  // Handle question expense
  async function handleQuestionExpense() {
    if (!user || !questionModalExpense) return

    setIsQuestioning(true)
    setQuestionError(null)

    try {
      const result = await api.questionExpense(questionModalExpense.id, {
        reason: questionReason,
        note: questionNote || undefined,
      })

      // Update the expense in the list
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === result.expense.id ? result.expense : exp))
      )

      // Close modal and reset state
      setQuestionModalExpense(null)
      setQuestionReason('wrong_amount')
      setQuestionNote('')
    } catch (err) {
      console.error('Failed to question expense:', err)
      setQuestionError(err instanceof Error ? err.message : 'Failed to question expense')
    } finally {
      setIsQuestioning(false)
    }
  }

  // Handle resolve expense
  async function handleResolveExpense() {
    if (!user || !resolveModalExpense) return

    setIsResolving(true)
    setResolveError(null)

    try {
      const request: { action: ResolutionAction; newAmount?: number } = { action: resolveAction }
      if (resolveAction === 'edit') {
        const amount = parseFloat(resolveNewAmount)
        if (isNaN(amount) || amount <= 0) {
          setResolveError('Please enter a valid positive amount')
          setIsResolving(false)
          return
        }
        request.newAmount = amount
      }

      const result = await api.resolveExpense(resolveModalExpense.id, request)

      // Update the expense in the list (or remove if deleted)
      if (resolveAction === 'delete') {
        setExpenses((prev) => prev.filter((exp) => exp.id !== result.expense.id))
        setTotalExpenses((prev) => prev - 1)
      } else {
        setExpenses((prev) =>
          prev.map((exp) => (exp.id === result.expense.id ? result.expense : exp))
        )
      }

      // Close modal and reset state
      setResolveModalExpense(null)
      setResolveAction('keep')
      setResolveNewAmount('')
    } catch (err) {
      console.error('Failed to resolve expense:', err)
      setResolveError(err instanceof Error ? err.message : 'Failed to resolve expense')
    } finally {
      setIsResolving(false)
    }
  }

  // Handle satisfy expense
  async function handleSatisfyExpense(expenseId: string) {
    if (!user) return

    setSatisfyingExpenseId(expenseId)

    try {
      const result = await api.satisfyExpense(expenseId)

      // Update the expense in the list
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === result.expense.id ? result.expense : exp))
      )
    } catch (err) {
      console.error('Failed to satisfy expense:', err)
      // Could show a toast notification here
    } finally {
      setSatisfyingExpenseId(null)
    }
  }

  // Check if user can question an expense
  function canQuestion(expense: Expense): boolean {
    return expense.status === 'posted' && expense.created_by !== user?.id
  }

  // Check if user can resolve an expense
  function canResolve(expense: Expense): boolean {
    return expense.status === 'questioned' && expense.created_by === user?.id
  }

  // Check if user can satisfy an expense
  function canSatisfy(expense: Expense): boolean {
    return expense.status === 'pending_satisfaction' && expense.questioned_by === user?.id
  }

  async function handleExportCsv() {
    if (!meData?.family) return

    // Check subscription
    if (subscription && subscription.plan !== 'pro') {
      setShowUpgradeModal(true)
      return
    }

    setIsExporting(true)
    try {
      const blob = await api.exportExpensesCsv(meData.family.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export CSV:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Active filter count
  const activeFilterCount = [
    categoryFilter !== '',
    statusFilter !== '',
    dateRangePreset !== 'this-month',
    childFilter !== '',
  ].filter(Boolean).length

  function handleClearFilters() {
    setCategoryFilter('')
    setStatusFilter('')
    setDateRangePreset('this-month')
    setCustomStartDate('')
    setCustomEndDate('')
    setChildFilter('')
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ke-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
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
            <h1 className="text-xl font-semibold text-ke-primary">Expenses</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" variant="secondary" onClick={handleExportCsv} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Link href="/expenses/add">
              <Button size="sm">Add Expense</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-ke-primary">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ke-accent px-1.5 text-xs font-bold text-ke-inverse">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-medium text-ke-accent hover:text-ke-accent-hover"
                >
                  Clear Filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {/* Category Filter */}
              <div className="flex-1 min-w-[140px]">
                <label htmlFor="category" className="mb-1 block text-xs font-medium text-ke-muted">
                  Category
                </label>
                <select
                  id="category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | '')}
                  className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex-1 min-w-[140px]">
                <label htmlFor="status" className="mb-1 block text-xs font-medium text-ke-muted">
                  Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as ExpenseStatus | '' | 'needs_attention')
                  }
                  className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="flex-1 min-w-[140px]">
                <label htmlFor="dateRange" className="mb-1 block text-xs font-medium text-ke-muted">
                  Date Range
                </label>
                <select
                  id="dateRange"
                  value={dateRangePreset}
                  onChange={(e) => setDateRangePreset(e.target.value)}
                  className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                >
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Child Filter */}
              {children.length > 0 && (
                <div className="flex-1 min-w-[140px]">
                  <label htmlFor="child" className="mb-1 block text-xs font-medium text-ke-muted">
                    Child
                  </label>
                  <select
                    id="child"
                    value={childFilter}
                    onChange={(e) => setChildFilter(e.target.value)}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  >
                    <option value="">All Children</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Custom Date Range */}
            {dateRangePreset === 'custom' && (
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[150px]">
                  <label
                    htmlFor="startDate"
                    className="mb-1 block text-xs font-medium text-ke-muted"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label htmlFor="endDate" className="mb-1 block text-xs font-medium text-ke-muted">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-ke-muted">
          {isLoading ? (
            'Loading...'
          ) : (
            <>
              Showing {expenses.length} of {totalExpenses} expense{totalExpenses !== 1 ? 's' : ''}
            </>
          )}
        </div>

        {/* Expense List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-ke-muted">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No expenses found"
            description={
              categoryFilter || statusFilter || childFilter
                ? 'No expenses match your filters'
                : 'No expenses for this time period'
            }
            action={
              !categoryFilter && !statusFilter && !childFilter ? (
                <Link href="/expenses/add">
                  <Button size="sm">Add First Expense</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardBody>
                  <Link href={`/expenses/${expense.id}`} className="block">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-ke-primary truncate">
                            {expense.description}
                          </p>
                          <StatusBadge status={expense.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ke-muted">
                          <span className="inline-flex items-center gap-1">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            {formatCategory(expense.category)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-mono">
                              {new Date(expense.expense_date).toLocaleDateString()}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            {expense.paid_by === user?.id ? 'You paid' : 'Partner paid'}
                          </span>
                        </div>
                        {expense.memo && (
                          <p className="mt-2 text-sm text-ke-muted line-clamp-2">{expense.memo}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-lg font-semibold font-mono ${
                            expense.amount_cents < 0 ? 'text-ke-positive' : 'text-ke-primary'
                          }`}
                        >
                          {expense.amount_cents < 0 && '('}
                          {formatCurrency(Math.abs(expense.amount_cents))}
                          {expense.amount_cents < 0 && ')'}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Dispute Info for questioned expenses */}
                  {expense.status === 'questioned' && expense.question_reason && (
                    <div className="mt-3 rounded-lg bg-ke-status-questioned-bg p-3">
                      <p className="text-sm font-medium text-ke-status-questioned-text">
                        Questioned:{' '}
                        {QUESTION_REASONS.find((r) => r.value === expense.question_reason)?.label ||
                          expense.question_reason}
                      </p>
                      {expense.question_note && (
                        <p className="mt-1 text-sm text-ke-status-questioned-text opacity-80">
                          {expense.question_note}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pending satisfaction info */}
                  {expense.status === 'pending_satisfaction' && (
                    <div className="mt-3 rounded-lg bg-ke-attention-bg p-3">
                      <p className="text-sm font-medium text-ke-primary">
                        Creator responded:{' '}
                        {expense.resolution_action === 'kept'
                          ? 'Kept as-is'
                          : expense.resolution_action === 'edited'
                            ? 'Amount edited'
                            : expense.resolution_action}
                      </p>
                      <p className="mt-1 text-sm text-ke-secondary">
                        Waiting for questioner confirmation
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canQuestion(expense) && (
                      <button
                        onClick={() => setQuestionModalExpense(expense)}
                        className="rounded-lg border border-ke-status-questioned-bg bg-ke-status-questioned-bg px-3 py-1.5 text-sm font-medium text-ke-status-questioned-text transition-colors hover:opacity-80"
                      >
                        Question
                      </button>
                    )}

                    {canResolve(expense) && (
                      <button
                        onClick={() => {
                          setResolveModalExpense(expense)
                          setResolveNewAmount((expense.amount_cents / 100).toString())
                        }}
                        className="rounded-lg border border-ke-accent/30 bg-ke-accent/10 px-3 py-1.5 text-sm font-medium text-ke-accent transition-colors hover:opacity-80"
                      >
                        Respond
                      </button>
                    )}

                    {canSatisfy(expense) && (
                      <button
                        onClick={() => handleSatisfyExpense(expense.id)}
                        disabled={satisfyingExpenseId === expense.id}
                        className="rounded-lg border border-ke-status-posted-bg bg-ke-status-posted-bg px-3 py-1.5 text-sm font-medium text-ke-status-posted-text transition-colors hover:opacity-80 disabled:opacity-50"
                      >
                        {satisfyingExpenseId === expense.id ? '...' : 'Satisfied'}
                      </button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="mt-6 text-center">
            <Button variant="secondary" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </main>

      {/* Question Modal */}
      {questionModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <CardBody className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-ke-primary">Question Expense</h3>
              <p className="mb-4 text-sm text-ke-secondary">
                Questioning: <strong>{questionModalExpense.description}</strong> (
                <span className="font-mono">
                  {formatCurrency(questionModalExpense.amount_cents)}
                </span>
                )
              </p>

              {questionError && (
                <Alert variant="error" className="mb-4">
                  {questionError}
                </Alert>
              )}

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                  Reason *
                </label>
                <select
                  value={questionReason}
                  onChange={(e) => setQuestionReason(e.target.value as QuestionReason)}
                  className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                >
                  {QUESTION_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                  Note (optional)
                </label>
                <textarea
                  value={questionNote}
                  onChange={(e) => setQuestionNote(e.target.value)}
                  placeholder="Add additional details..."
                  rows={3}
                  className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuestionModalExpense(null)
                    setQuestionReason('wrong_amount')
                    setQuestionNote('')
                    setQuestionError(null)
                  }}
                  disabled={isQuestioning}
                >
                  Cancel
                </Button>
                <button
                  onClick={handleQuestionExpense}
                  disabled={isQuestioning}
                  className="rounded-lg bg-ke-status-questioned-text px-4 py-2 text-sm font-medium text-ke-inverse transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {isQuestioning ? 'Submitting...' : 'Question Expense'}
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Export Requires Pro"
        description="CSV export is a Pro feature. Upgrade to download your expense data."
      />

      {/* Resolve Modal */}
      {resolveModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md">
            <CardBody className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-ke-primary">Respond to Question</h3>
              <p className="mb-2 text-sm text-ke-secondary">
                Expense: <strong>{resolveModalExpense.description}</strong> (
                <span className="font-mono">
                  {formatCurrency(resolveModalExpense.amount_cents)}
                </span>
                )
              </p>
              {resolveModalExpense.question_reason && (
                <p className="mb-4 text-sm text-ke-status-questioned-text">
                  Questioned for:{' '}
                  {
                    QUESTION_REASONS.find((r) => r.value === resolveModalExpense.question_reason)
                      ?.label
                  }
                  {resolveModalExpense.question_note && ` - "${resolveModalExpense.question_note}"`}
                </p>
              )}

              {resolveError && (
                <Alert variant="error" className="mb-4">
                  {resolveError}
                </Alert>
              )}

              <div className="mb-4 space-y-2">
                {RESOLUTION_ACTIONS.map((action) => (
                  <label
                    key={action.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      resolveAction === action.value
                        ? 'border-ke-accent bg-ke-accent/10'
                        : 'border-ke-border hover:bg-ke-elevated'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolveAction"
                      value={action.value}
                      checked={resolveAction === action.value}
                      onChange={(e) => setResolveAction(e.target.value as ResolutionAction)}
                      className="h-4 w-4 text-ke-accent"
                    />
                    <div>
                      <p className="text-sm font-medium text-ke-primary">{action.label}</p>
                      <p className="text-xs text-ke-muted">{action.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {resolveAction === 'edit' && (
                <div className="mb-6">
                  <label className="mb-1.5 block text-sm font-medium text-ke-secondary">
                    New Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={resolveNewAmount}
                    onChange={(e) => setResolveNewAmount(e.target.value)}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setResolveModalExpense(null)
                    setResolveAction('keep')
                    setResolveNewAmount('')
                    setResolveError(null)
                  }}
                  disabled={isResolving}
                >
                  Cancel
                </Button>
                {resolveAction === 'delete' ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleResolveExpense}
                    disabled={isResolving}
                  >
                    {isResolving ? 'Submitting...' : 'Delete Expense'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResolveExpense}
                    disabled={isResolving}
                  >
                    {isResolving ? 'Submitting...' : 'Submit Response'}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
