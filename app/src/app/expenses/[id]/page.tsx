'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type {
  MeResponse,
  Expense,
  ActivityEvent,
  QuestionReason,
  ResolutionAction,
  ExpenseCategory,
  Child,
} from '@/lib/api'
import { formatCurrency, formatCategory } from '@/lib/formatters'
import { canQuestion, canRespond, canSatisfy } from '@/lib/expenseActions'
import { renderTimelineEvent, formatReasonLabel, formatResolutionLabel } from '@/lib/timelineUtils'
import { Button, Card, CardBody, StatusBadge, Alert } from '@/components/ui'

// ---------- Constants ----------

const QUESTION_REASONS: { value: QuestionReason; label: string }[] = [
  { value: 'wrong_amount', label: 'Wrong amount' },
  { value: 'not_child_related', label: 'Not child-related' },
  { value: 'duplicate', label: 'Duplicate expense' },
  { value: 'split_dispute', label: 'Split percentage dispute' },
  { value: 'other', label: 'Other' },
]

const RESOLUTION_ACTIONS: {
  value: ResolutionAction
  label: string
  description: string
}[] = [
  { value: 'keep', label: 'Keep As-Is', description: 'Keep the expense unchanged' },
  { value: 'edit', label: 'Edit Amount', description: 'Update the amount' },
  { value: 'personal', label: 'Mark as Personal', description: "Won't count in split" },
  { value: 'delete', label: 'Delete Expense', description: 'Remove this expense' },
]

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'medical', label: 'Medical' },
  { value: 'activities', label: 'Activities' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'other', label: 'Other' },
]

const AUTO_RESOLVE_DAYS = 7

// ---------- Helpers ----------

function getAutoResolveDaysLeft(resolvedAt: string | null): number | null {
  if (!resolvedAt) return null
  const resolvedDate = new Date(resolvedAt)
  const deadlineMs = resolvedDate.getTime() + AUTO_RESOLVE_DAYS * 24 * 60 * 60 * 1000
  const nowMs = Date.now()
  const daysLeft = Math.ceil((deadlineMs - nowMs) / (24 * 60 * 60 * 1000))
  return Math.max(0, daysLeft)
}

// ---------- Page component ----------

export default function ExpenseDetailPage() {
  const { user, isLoaded } = useUser()
  const params = useParams()
  const router = useRouter()
  const api = useApi()
  const actionsRef = useRef<HTMLDivElement>(null)
  const expenseId = params.id as string

  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [expense, setExpense] = useState<Expense | null>(null)
  const [timeline, setTimeline] = useState<ActivityEvent[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Question form state
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [questionReason, setQuestionReason] = useState<QuestionReason>('wrong_amount')
  const [questionNote, setQuestionNote] = useState('')
  const [isQuestioning, setIsQuestioning] = useState(false)
  const [questionError, setQuestionError] = useState<string | null>(null)

  // Respond form state
  const [showRespondForm, setShowRespondForm] = useState(false)
  const [resolveAction, setResolveAction] = useState<ResolutionAction>('keep')
  const [resolveNewAmount, setResolveNewAmount] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  // Satisfy state
  const [isSatisfying, setIsSatisfying] = useState(false)

  // Edit form state (#90)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('other')
  const [editDate, setEditDate] = useState('')
  const [editMemo, setEditMemo] = useState('')
  const [editLinkUrl, setEditLinkUrl] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state (#90)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)

    try {
      const [me, expenseData] = await Promise.all([api.getMe(), api.getExpense(expenseId)])
      setMeData(me)
      setExpense(expenseData.expense)

      if (me.family) {
        const [activityData, childrenData] = await Promise.all([
          api.getActivity(me.family.id, {
            expenseId,
            limit: 50,
          }),
          api.getChildren(me.family.id),
        ])
        // API returns descending; reverse for chronological timeline
        setTimeline([...activityData.events].reverse())
        setChildren(childrenData.children)
      }
    } catch (err) {
      console.error('Failed to load expense:', err)
      setError(err instanceof Error ? err.message : 'Failed to load expense')
    } finally {
      setIsLoading(false)
    }
  }, [user, expenseId, api])

  useEffect(() => {
    if (isLoaded && user) {
      fetchData()
    }
  }, [isLoaded, user, fetchData])

  // Scroll to actions if ?focus=actions
  useEffect(() => {
    if (!isLoading && expense && actionsRef.current) {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get('focus') === 'actions') {
        actionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [isLoading, expense])

  // ---------- Action handlers ----------

  async function handleQuestion() {
    if (!user || !expense) return
    setIsQuestioning(true)
    setQuestionError(null)

    try {
      const result = await api.questionExpense(expense.id, {
        reason: questionReason,
        note: questionNote || undefined,
      })
      setExpense(result.expense)
      setShowQuestionForm(false)
      setQuestionReason('wrong_amount')
      setQuestionNote('')
      // Refresh timeline
      await refreshTimeline()
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Failed to question expense')
    } finally {
      setIsQuestioning(false)
    }
  }

  async function handleRespond() {
    if (!user || !expense) return
    setIsResolving(true)
    setResolveError(null)

    try {
      const request: { action: ResolutionAction; newAmount?: number } = {
        action: resolveAction,
      }
      if (resolveAction === 'edit') {
        const amount = parseFloat(resolveNewAmount)
        if (isNaN(amount) || amount <= 0) {
          setResolveError('Please enter a valid positive amount')
          setIsResolving(false)
          return
        }
        request.newAmount = amount
      }

      const result = await api.resolveExpense(expense.id, request)
      setExpense(result.expense)
      setShowRespondForm(false)
      setResolveAction('keep')
      setResolveNewAmount('')
      await refreshTimeline()

      // If deleted, redirect back to list
      if (resolveAction === 'delete') {
        router.push('/expenses')
      }
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : 'Failed to respond')
    } finally {
      setIsResolving(false)
    }
  }

  async function handleSatisfy() {
    if (!user || !expense) return
    setIsSatisfying(true)

    try {
      const result = await api.satisfyExpense(expense.id)
      setExpense(result.expense)
      await refreshTimeline()
    } catch (err) {
      console.error('Failed to confirm:', err)
    } finally {
      setIsSatisfying(false)
    }
  }

  async function handleStillNotSatisfied() {
    // Re-question the expense (same flow as initial question)
    if (!user || !expense) return
    setIsQuestioning(true)
    setQuestionError(null)

    try {
      const result = await api.questionExpense(expense.id, {
        reason: 'other',
        note: 'Still not satisfied with the response',
      })
      setExpense(result.expense)
      await refreshTimeline()
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Failed to re-question')
    } finally {
      setIsQuestioning(false)
    }
  }

  // Edit expense handler (#90)
  function openEditForm() {
    if (!expense) return
    setEditDescription(expense.description)
    setEditAmount((expense.amount_cents / 100).toFixed(2))
    setEditCategory(expense.category)
    setEditDate(expense.expense_date)
    setEditMemo(expense.memo || '')
    setEditLinkUrl(expense.link_url || '')
    setEditError(null)
    setShowEditForm(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !expense) return
    setIsEditing(true)
    setEditError(null)

    try {
      const amount = parseFloat(editAmount)
      if (isNaN(amount) || amount <= 0) {
        setEditError('Please enter a valid positive amount')
        setIsEditing(false)
        return
      }

      const result = await api.editExpense(expense.id, {
        description: editDescription.trim(),
        amount,
        category: editCategory,
        expenseDate: editDate,
        memo: editMemo.trim() || null,
        linkUrl: editLinkUrl.trim() || null,
      })
      setExpense(result.expense)
      setShowEditForm(false)
      await refreshTimeline()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to edit expense')
    } finally {
      setIsEditing(false)
    }
  }

  // Delete expense handler (#90)
  async function handleDelete() {
    if (!user || !expense) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await api.deleteExpense(expense.id)
      router.push('/expenses')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete expense')
      setIsDeleting(false)
    }
  }

  async function refreshTimeline() {
    if (!user || !meData?.family) return
    try {
      const activityData = await api.getActivity(meData.family.id, {
        expenseId,
        limit: 50,
      })
      setTimeline([...activityData.events].reverse())
    } catch {
      // Non-critical; timeline will refresh on next page load
    }
  }

  // ---------- Loading / error states ----------

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ke-bg">
        <p className="text-ke-muted">Loading...</p>
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-3xl items-center gap-ke-stack px-4 py-4">
            <Link href="/expenses" className="text-ke-muted hover:text-ke-secondary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-ke-title font-semibold text-ke-primary">Expense Detail</h1>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-ke-section">
          <Alert variant="error">{error || 'Expense not found'}</Alert>
        </main>
      </div>
    )
  }

  const userId = user?.id || ''
  const isCreator = expense.created_by === userId
  const canEdit = isCreator && expense.status === 'posted'
  const daysLeft =
    expense.status === 'pending_satisfaction' ? getAutoResolveDaysLeft(expense.resolved_at) : null

  return (
    <div className="min-h-screen bg-ke-bg">
      {/* Header */}
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-ke-stack px-4 py-4">
          <Link
            href="/expenses"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ke-muted hover:text-ke-secondary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="flex-1 text-ke-title font-semibold text-ke-primary">Expense Detail</h1>
          {/* Edit / Delete buttons in header for creator of posted expenses */}
          {canEdit && !showEditForm && (
            <div className="flex items-center gap-2">
              <button
                onClick={openEditForm}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2 text-ke-muted transition-colors hover:bg-ke-elevated hover:text-ke-secondary"
                title="Edit expense"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-2 text-ke-muted transition-colors hover:bg-ke-elevated hover:text-ke-negative"
                title="Delete expense"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-ke-card space-y-6">
        {/* ---------- Delete Confirmation ---------- */}
        {showDeleteConfirm && (
          <Alert variant="error">
            <div>
              <p className="font-medium">Delete this expense?</p>
              <p className="mt-1 text-ke-caption">
                This action cannot be undone. The expense will be permanently removed.
              </p>
              {deleteError && <p className="mt-2 text-ke-caption font-medium">{deleteError}</p>}
              <div className="mt-3 flex gap-ke-row">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="min-h-[44px]"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteError(null)
                  }}
                  disabled={isDeleting}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* ---------- Edit Form ---------- */}
        {showEditForm && (
          <Card>
            <CardBody>
              <h2 className="mb-4 text-ke-caption font-semibold uppercase tracking-widest text-ke-muted">
                Edit Expense
              </h2>

              {editError && (
                <Alert variant="error" className="mb-4">
                  {editError}
                </Alert>
              )}

              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    maxLength={200}
                    required
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-ke-stack">
                  <div>
                    <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                      Amount ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      required
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption font-mono text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                      Category *
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                      className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                    Link URL (optional)
                  </label>
                  <input
                    type="url"
                    value={editLinkUrl}
                    onChange={(e) => setEditLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                    Memo (optional)
                  </label>
                  <textarea
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                  />
                </div>

                <div className="flex justify-end gap-ke-row">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowEditForm(false)
                      setEditError(null)
                    }}
                    disabled={isEditing}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isEditing || !editDescription.trim() || !editAmount}
                    className="min-h-[44px]"
                  >
                    {isEditing ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* ---------- Expense Summary ---------- */}
        {!showEditForm && (
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-ke-stack">
                <div className="min-w-0 flex-1">
                  <h2 className="text-ke-body-lg font-medium text-ke-primary">
                    {expense.description}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-ke-stack gap-y-1 text-ke-caption text-ke-muted">
                    <span className="font-mono text-ke-caption">
                      {new Date(expense.expense_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Posted by {isCreator ? 'You' : meData?.family ? 'Partner' : 'Unknown'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-ke-elevated px-2 py-0.5 text-ke-label font-medium text-ke-secondary">
                      {formatCategory(expense.category)}
                    </span>
                    <StatusBadge status={expense.status} />
                  </div>
                </div>
                <p className="shrink-0 text-ke-display font-semibold font-mono text-ke-primary">
                  {formatCurrency(expense.amount_cents)}
                </p>
              </div>

              {/* Memo */}
              {expense.memo && (
                <p className="mt-3 text-ke-caption text-ke-secondary border-t border-ke-divider pt-3">
                  {expense.memo}
                </p>
              )}

              {/* Link */}
              {expense.link_url && (
                <p className="mt-2 text-ke-caption">
                  <a
                    href={expense.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ke-accent hover:underline"
                  >
                    View receipt
                  </a>
                </p>
              )}

              {/* Children */}
              {expense.child_ids && children.length > 0 && (
                <div className="mt-3 border-t border-ke-divider pt-3">
                  <p className="text-ke-label font-semibold uppercase tracking-widest text-ke-muted mb-1">
                    Kids
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {expense.child_ids.split(',').map((childId) => {
                      const child = children.find((c) => c.id === childId.trim())
                      return child ? (
                        <span
                          key={child.id}
                          className="inline-flex items-center rounded-md bg-ke-elevated px-2 py-0.5 text-ke-label font-medium text-ke-secondary"
                        >
                          {child.name}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* ---------- Actions ---------- */}
        <div ref={actionsRef}>
          {/* Question action */}
          {canQuestion(expense, userId) && (
            <Card>
              <CardBody>
                {!showQuestionForm ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowQuestionForm(true)}
                    className="min-h-[44px]"
                  >
                    Question This Expense
                  </Button>
                ) : (
                  <div>
                    <h3 className="mb-4 text-ke-caption font-semibold uppercase tracking-widest text-ke-muted">
                      Question Expense
                    </h3>

                    {questionError && (
                      <Alert variant="error" className="mb-4">
                        {questionError}
                      </Alert>
                    )}

                    <div className="mb-4">
                      <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                        Reason
                      </label>
                      <select
                        value={questionReason}
                        onChange={(e) => setQuestionReason(e.target.value as QuestionReason)}
                        className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                      >
                        {QUESTION_REASONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                        Note (optional)
                      </label>
                      <textarea
                        value={questionNote}
                        onChange={(e) => setQuestionNote(e.target.value)}
                        placeholder="Add details..."
                        rows={3}
                        className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                      />
                    </div>

                    <div className="flex justify-end gap-ke-row">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowQuestionForm(false)
                          setQuestionError(null)
                        }}
                        disabled={isQuestioning}
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleQuestion}
                        disabled={isQuestioning}
                        className="min-h-[44px]"
                      >
                        {isQuestioning ? 'Submitting...' : 'Submit Question'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Respond action */}
          {canRespond(expense, userId) && (
            <Card>
              <CardBody>
                {/* Show the question context */}
                {expense.question_reason && (
                  <div className="mb-4 rounded-lg bg-ke-status-questioned-bg p-3">
                    <p className="text-ke-caption font-medium text-ke-status-questioned-text">
                      Questioned: {formatReasonLabel(expense.question_reason)}
                    </p>
                    {expense.question_note && (
                      <p className="mt-1 text-ke-caption text-ke-status-questioned-text opacity-80">
                        &ldquo;{expense.question_note}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {!showRespondForm ? (
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      setShowRespondForm(true)
                      setResolveNewAmount((expense.amount_cents / 100).toString())
                    }}
                    className="min-h-[44px]"
                  >
                    Respond
                  </Button>
                ) : (
                  <div>
                    <h3 className="mb-4 text-ke-caption font-semibold uppercase tracking-widest text-ke-muted">
                      Respond to Question
                    </h3>

                    {resolveError && (
                      <Alert variant="error" className="mb-4">
                        {resolveError}
                      </Alert>
                    )}

                    <div className="mb-4 space-y-2">
                      {RESOLUTION_ACTIONS.map((action) => (
                        <label
                          key={action.value}
                          className={`flex cursor-pointer items-center gap-ke-row rounded-lg border p-3 transition-colors min-h-[44px] ${
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
                            <p className="text-ke-caption font-medium text-ke-primary">
                              {action.label}
                            </p>
                            <p className="text-ke-label text-ke-muted">{action.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {resolveAction === 'edit' && (
                      <div className="mb-4">
                        <label className="mb-1.5 block text-ke-caption font-medium text-ke-secondary">
                          New Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={resolveNewAmount}
                          onChange={(e) => setResolveNewAmount(e.target.value)}
                          className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption font-mono text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus min-h-[44px]"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-ke-row">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowRespondForm(false)
                          setResolveError(null)
                        }}
                        disabled={isResolving}
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                      {resolveAction === 'delete' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleRespond}
                          disabled={isResolving}
                          className="min-h-[44px]"
                        >
                          {isResolving ? 'Submitting...' : 'Delete Expense'}
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleRespond}
                          disabled={isResolving}
                          className="min-h-[44px]"
                        >
                          {isResolving ? 'Submitting...' : 'Submit Response'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Satisfy / Still Not Satisfied actions (#87) */}
          {canSatisfy(expense, userId) && (
            <Card>
              <CardBody>
                {/* Show resolution context */}
                {expense.resolution_action && (
                  <div className="mb-4 rounded-lg bg-ke-attention-bg p-3">
                    <p className="text-ke-caption font-medium text-ke-primary">
                      Creator responded: {formatResolutionLabel(expense.resolution_action)}
                    </p>
                    <p className="mt-1 text-ke-caption text-ke-secondary">
                      Waiting for your confirmation
                    </p>
                  </div>
                )}

                {/* Auto-resolve countdown (#87) */}
                {daysLeft !== null && (
                  <div className="mb-4 rounded-lg bg-ke-elevated p-3">
                    <p className="text-ke-caption text-ke-muted text-center">
                      {daysLeft === 0
                        ? 'Auto-resolves today if no action is taken'
                        : `Auto-resolves in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                    </p>
                  </div>
                )}

                <div className="flex gap-ke-row">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleSatisfy}
                    disabled={isSatisfying || isQuestioning}
                    className="min-h-[44px]"
                  >
                    {isSatisfying ? 'Confirming...' : 'Confirm Resolved'}
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleStillNotSatisfied}
                    disabled={isSatisfying || isQuestioning}
                    className="min-h-[44px]"
                  >
                    {isQuestioning ? '...' : 'Still Not Satisfied'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Closed unresolved -- read-only badge, no actions */}
          {expense.status === 'closed_unresolved' && (
            <Card>
              <CardBody>
                <p className="text-ke-caption text-ke-muted text-center">
                  This expense is closed with no resolution. No actions available.
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ---------- Timeline ---------- */}
        <div>
          <h2 className="mb-4 text-ke-label font-semibold uppercase tracking-widest text-ke-muted">
            Timeline
          </h2>

          {timeline.length === 0 ? (
            <p className="text-ke-caption text-ke-muted">No activity recorded yet.</p>
          ) : (
            <div className="relative border-l-2 border-ke-divider pl-ke-card space-y-6">
              {timeline.map((event) => {
                const rendered = renderTimelineEvent(event, userId)
                if (!rendered) return null

                return (
                  <div key={event.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-ke-border bg-ke-surface" />

                    <p className="font-mono text-ke-label text-ke-muted">
                      {new Date(event.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' · '}
                      {new Date(event.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="mt-0.5 text-ke-caption font-medium text-ke-primary">
                      {rendered.label}
                    </p>
                    {rendered.detail && (
                      <p className="mt-0.5 text-ke-caption text-ke-secondary">{rendered.detail}</p>
                    )}
                    {rendered.note && (
                      <p className="mt-1 text-ke-caption text-ke-muted italic">
                        &ldquo;{rendered.note}&rdquo;
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
