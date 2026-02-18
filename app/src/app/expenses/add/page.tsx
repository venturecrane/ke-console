'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type { MeResponse, ExpenseCategory, Child } from '@/lib/api'
import { Button, Card, CardBody, Alert, Input, Select, Textarea } from '@/components/ui'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'medical', label: 'Medical' },
  { value: 'activities', label: 'Activities' },
  { value: 'childcare', label: 'Childcare' },
  { value: 'other', label: 'Other' },
]

export default function AddExpensePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const api = useApi()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [linkUrl, setLinkUrl] = useState('')
  const [memo, setMemo] = useState('')
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([])
  const [allChildrenSelected, setAllChildrenSelected] = useState(false)
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false)
  const [linkUrlError, setLinkUrlError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserData() {
      if (!user) return
      try {
        const data = await api.getMe()
        setMeData(data)
        if (!data.family) {
          router.push('/dashboard')
          return
        }
        // Fetch children for the family
        const childrenData = await api.getChildren(data.family.id)
        setChildren(childrenData.children)
        // Auto-assign when exactly one kid
        if (childrenData.children.length === 1) {
          setSelectedChildIds([childrenData.children[0].id])
        }
      } catch (err) {
        console.error('Failed to load user data:', err)
        setError('Failed to load user data')
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && user) {
      loadUserData()
    } else if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router, api])

  // Handle "All Children" toggle
  function handleAllChildrenChange(checked: boolean) {
    setAllChildrenSelected(checked)
    if (checked) {
      setSelectedChildIds(children.map((c) => c.id))
    } else {
      setSelectedChildIds([])
    }
  }

  // Handle individual child selection
  function handleChildToggle(childId: string, checked: boolean) {
    if (checked) {
      const newSelected = [...selectedChildIds, childId]
      setSelectedChildIds(newSelected)
      // Check if all children are now selected
      if (newSelected.length === children.length) {
        setAllChildrenSelected(true)
      }
    } else {
      setSelectedChildIds(selectedChildIds.filter((id) => id !== childId))
      setAllChildrenSelected(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !meData?.family) return

    setIsSubmitting(true)
    setError(null)

    // Validate URL if provided
    const trimmedLink = linkUrl.trim()
    if (trimmedLink && !trimmedLink.startsWith('http://') && !trimmedLink.startsWith('https://')) {
      setError('Receipt link must start with http:// or https://')
      setIsSubmitting(false)
      return
    }

    // Parse amount (allow negative for refunds)
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum)) {
      setError('Please enter a valid amount')
      setIsSubmitting(false)
      return
    }

    try {
      await api.createExpense(meData.family.id, {
        description: description.trim(),
        amount: amountNum,
        category,
        expenseDate,
        linkUrl: linkUrl.trim() || undefined,
        memo: memo.trim() || undefined,
        childIds: selectedChildIds.length > 0 ? selectedChildIds : undefined,
      })
      router.refresh()
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ke-muted">Loading...</p>
      </div>
    )
  }

  if (!meData?.family) {
    return null // Will redirect
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ke-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-secondary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-ke-primary">Add Expense</h1>
          </div>
          <p className="mt-2 text-ke-secondary">Log a kid-related expense</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              {/* Description */}
              <div className="mb-4">
                <Input
                  label={
                    <>
                      Description <span className="text-ke-negative">*</span>
                    </>
                  }
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., School supplies"
                  maxLength={200}
                  required
                  hint={`${description.length}/200 characters`}
                />
              </div>

              {/* Amount */}
              <div className="mb-4">
                <Input
                  label={
                    <>
                      Amount ($) <span className="text-ke-negative">*</span>
                    </>
                  }
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  required
                  hint="Use negative amount for refunds/credits"
                />
              </div>

              {/* Category */}
              <div className="mb-4">
                <Select
                  label={
                    <>
                      Category <span className="text-ke-negative">*</span>
                    </>
                  }
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Date */}
              <div className="mb-4">
                <Input
                  label={
                    <>
                      Date <span className="text-ke-negative">*</span>
                    </>
                  }
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              {/* Auto-assignment tag — visible when exactly 1 kid is auto-selected */}
              {children.length === 1 && selectedChildIds.length === 1 && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-ke-accent/10 px-3 py-1 text-xs font-medium text-ke-accent">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Tagged to {children[0].name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChildIds([])
                      setShowAdditionalDetails(true)
                    }}
                    className="text-xs text-ke-muted hover:text-ke-secondary"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Collapsible Additional Details */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                  className="flex w-full items-center justify-between rounded-lg border border-ke-border px-4 py-3 text-sm font-medium text-ke-secondary transition-colors hover:bg-ke-elevated"
                >
                  <span>Additional Details</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showAdditionalDetails ? 'rotate-180' : ''}`}
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

                {showAdditionalDetails && (
                  <div className="mt-3 space-y-4 rounded-lg border border-ke-border p-4">
                    {/* Memo (optional) */}
                    <div>
                      <Textarea
                        label={
                          <>
                            Memo <span className="text-ke-muted">(optional)</span>
                          </>
                        }
                        id="memo"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="Additional notes..."
                        maxLength={500}
                        rows={3}
                        hint={`${memo.length}/500 characters`}
                      />
                    </div>

                    {/* Receipt Link (optional) */}
                    <div>
                      <Input
                        label={
                          <>
                            Receipt Link <span className="text-ke-muted">(optional)</span>
                          </>
                        }
                        id="linkUrl"
                        type="url"
                        value={linkUrl}
                        onChange={(e) => {
                          setLinkUrl(e.target.value)
                          const val = e.target.value.trim()
                          if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                            setLinkUrlError('Must start with http:// or https://')
                          } else {
                            setLinkUrlError(null)
                          }
                        }}
                        placeholder="https://..."
                        hint={linkUrlError || undefined}
                      />
                    </div>

                    {/* Children */}
                    {children.length > 0 && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-ke-primary">
                          Kids <span className="text-ke-muted">(optional)</span>
                        </label>
                        <div className="rounded-lg border border-ke-border p-3">
                          {/* All Children option */}
                          <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-ke-divider pb-2">
                            <input
                              type="checkbox"
                              checked={allChildrenSelected}
                              onChange={(e) => handleAllChildrenChange(e.target.checked)}
                              className="h-4 w-4 rounded border-ke-border text-ke-accent focus:ring-ke-focus"
                            />
                            <span className="font-medium text-ke-primary">All Kids</span>
                          </label>
                          {/* Individual children */}
                          <div className="mt-2 space-y-2">
                            {children.map((child) => (
                              <label
                                key={child.id}
                                className="flex cursor-pointer items-center gap-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedChildIds.includes(child.id)}
                                  onChange={(e) => handleChildToggle(child.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-ke-border text-ke-accent focus:ring-ke-focus"
                                />
                                <span className="text-ke-secondary">{child.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-ke-muted">
                          Select which kids this expense applies to
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="error" className="mb-4">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting || !description.trim() || !amount}
              >
                {isSubmitting ? 'Adding...' : 'Add Expense'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
