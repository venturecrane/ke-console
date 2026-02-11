'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type { MeResponse, ActivityEvent, ActivityTypeFilter, ActivityFilters } from '@/lib/api'
import { formatCurrency } from '@/lib/statusColors'
import { Button, Card, CardBody, EmptyState, Alert } from '@/components/ui'

const ITEMS_PER_PAGE = 25

// Get date 30 days ago in YYYY-MM-DD format
function getDefaultStartDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'just now'
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Get event icon and color based on event type
function getEventStyle(eventType: string): {
  icon: React.ReactNode
  bgColor: string
  textColor: string
} {
  switch (eventType) {
    case 'expense.created':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        ),
        bgColor: 'bg-ke-status-posted-bg',
        textColor: 'text-ke-status-posted-text',
      }
    case 'expense.edited':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        ),
        bgColor: 'bg-ke-status-resolved-bg',
        textColor: 'text-ke-status-resolved-text',
      }
    case 'expense.questioned':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        bgColor: 'bg-ke-status-questioned-bg',
        textColor: 'text-ke-status-questioned-text',
      }
    case 'expense.resolved':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        bgColor: 'bg-ke-status-resolved-bg',
        textColor: 'text-ke-status-resolved-text',
      }
    case 'expense.satisfied':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
          </svg>
        ),
        bgColor: 'bg-ke-status-posted-bg',
        textColor: 'text-ke-status-posted-text',
      }
    case 'expense.generated':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        ),
        bgColor: 'bg-ke-accent/10',
        textColor: 'text-ke-accent',
      }
    case 'payment.created':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        bgColor: 'bg-ke-status-posted-bg',
        textColor: 'text-ke-positive',
      }
    case 'child.created':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        ),
        bgColor: 'bg-ke-accent/10',
        textColor: 'text-ke-accent',
      }
    case 'child.deleted':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
            />
          </svg>
        ),
        bgColor: 'bg-ke-status-closed-bg',
        textColor: 'text-ke-status-closed-text',
      }
    case 'fixed_expense.created':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        ),
        bgColor: 'bg-ke-accent/10',
        textColor: 'text-ke-accent',
      }
    case 'fixed_expense.updated':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        ),
        bgColor: 'bg-ke-accent/10',
        textColor: 'text-ke-accent',
      }
    case 'fixed_expense.ended':
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ),
        bgColor: 'bg-ke-status-settled-bg',
        textColor: 'text-ke-status-settled-text',
      }
    default:
      return {
        icon: (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        bgColor: 'bg-ke-elevated',
        textColor: 'text-ke-muted',
      }
  }
}

// Generate event description
function getEventDescription(
  event: ActivityEvent,
  currentUserId: string | undefined
): { action: string; details: string | null } {
  const isCurrentUser = event.user_id === currentUserId
  const userName = isCurrentUser ? 'You' : event.user_name || event.user_email

  switch (event.event_type) {
    case 'expense.created': {
      const expense = event.after_snapshot as { description?: string; amount_cents?: number } | null
      const amount = expense?.amount_cents ? formatCurrency(expense.amount_cents) : ''
      return {
        action: `${userName} added an expense`,
        details: expense?.description
          ? `${expense.description}${amount ? ` - ${amount}` : ''}`
          : null,
      }
    }
    case 'expense.edited': {
      const before = event.before_snapshot as { description?: string } | null
      const after = event.after_snapshot as { description?: string } | null
      return {
        action: `${userName} edited an expense`,
        details: after?.description || before?.description || null,
      }
    }
    case 'expense.questioned': {
      const expense = event.after_snapshot as { description?: string } | null
      return {
        action: `${userName} questioned an expense`,
        details: expense?.description || null,
      }
    }
    case 'expense.resolved': {
      const expense = event.after_snapshot as { description?: string } | null
      return {
        action: `${userName} resolved an expense`,
        details: expense?.description || null,
      }
    }
    case 'expense.satisfied': {
      const expense = event.after_snapshot as { description?: string } | null
      return {
        action: `${userName} accepted the resolution`,
        details: expense?.description || null,
      }
    }
    case 'expense.generated': {
      const expense = event.after_snapshot as { description?: string; amount_cents?: number } | null
      const amount = expense?.amount_cents ? formatCurrency(expense.amount_cents) : ''
      return {
        action: 'Monthly expense auto-generated',
        details: expense?.description
          ? `${expense.description}${amount ? ` - ${amount}` : ''}`
          : null,
      }
    }
    case 'payment.created': {
      const payment = event.after_snapshot as { amount_cents?: number } | null
      const amount = payment?.amount_cents ? formatCurrency(payment.amount_cents) : ''
      return {
        action: `${userName} recorded a payment`,
        details: amount || null,
      }
    }
    case 'child.created': {
      const child = event.after_snapshot as { name?: string } | null
      return {
        action: `${userName} added a kid`,
        details: child?.name || null,
      }
    }
    case 'child.deleted': {
      const child = event.before_snapshot as { name?: string } | null
      return {
        action: `${userName} removed a kid`,
        details: child?.name || null,
      }
    }
    case 'fixed_expense.created': {
      const fixed = event.after_snapshot as { description?: string; amount_cents?: number } | null
      const amount = fixed?.amount_cents ? formatCurrency(fixed.amount_cents) : ''
      return {
        action: `${userName} created a recurring expense`,
        details: fixed?.description
          ? `${fixed.description}${amount ? ` - ${amount}/month` : ''}`
          : null,
      }
    }
    case 'fixed_expense.updated': {
      const fixed = event.after_snapshot as { description?: string } | null
      return {
        action: `${userName} updated a recurring expense`,
        details: fixed?.description || null,
      }
    }
    case 'fixed_expense.ended': {
      const fixed = event.before_snapshot as { description?: string } | null
      return {
        action: `${userName} ended a recurring expense`,
        details: fixed?.description || null,
      }
    }
    case 'family.ratio_updated': {
      const after = event.after_snapshot as { parent_a_ratio?: number } | null
      const ratio = after?.parent_a_ratio
      return {
        action: `${userName} updated the split ratio`,
        details:
          ratio !== undefined
            ? `${Math.round(ratio * 100)}% / ${Math.round((1 - ratio) * 100)}%`
            : null,
      }
    }
    default: {
      // Handle unknown event types gracefully (for forward compatibility)
      const after = event.after_snapshot as {
        description?: string
        name?: string
        amount_cents?: number
      } | null
      const before = event.before_snapshot as { description?: string; name?: string } | null
      const eventTypeStr = event.event_type as string
      const eventAction = eventTypeStr.includes('.') ? eventTypeStr.split('.')[1] : 'updated'
      const targetName = event.target_type.replace(/_/g, ' ')
      const itemName = after?.description || after?.name || before?.description || before?.name

      return {
        action: `${userName} ${eventAction} a ${targetName}`,
        details: itemName || null,
      }
    }
  }
}

// Get link for event target
function getEventLink(event: ActivityEvent): string | null {
  switch (event.target_type) {
    case 'expense':
      return `/expenses/${event.target_id}`
    case 'payment':
      return `/payments`
    case 'child':
      return `/settings/children`
    case 'fixed_expense':
      return `/settings/fixed-expenses`
    default:
      return null
  }
}

// Type filter options
const TYPE_FILTER_OPTIONS: { value: ActivityTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'payments', label: 'Payments' },
  { value: 'fixed_expenses', label: 'Fixed Expenses' },
  { value: 'disputes', label: 'Disputes' },
  { value: 'children', label: 'Kids' },
]

export default function ActivityFeedPage() {
  const { user, isLoaded } = useUser()
  const api = useApi()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalEvents, setTotalEvents] = useState(0)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startDate, setStartDate] = useState(getDefaultStartDate())
  const [endDate, setEndDate] = useState(getTodayDate())

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Build filters object
  const filters: ActivityFilters = useMemo(
    () => ({
      type: typeFilter,
      search: debouncedSearch || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: ITEMS_PER_PAGE,
      offset: 0,
    }),
    [typeFilter, debouncedSearch, startDate, endDate]
  )

  const fetchActivity = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      if (!user || !meData?.family) return

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const data = await api.getActivity(meData.family.id, {
          ...filters,
          offset,
        })

        if (append) {
          setEvents((prev) => [...prev, ...data.events])
        } else {
          setEvents(data.events)
        }
        setTotalEvents(data.pagination.total)
        setCurrentOffset(offset + data.events.length)
      } catch (err) {
        console.error('Failed to fetch activity:', err)
        setError('Failed to load activity. Please try again.')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [user, meData?.family, filters, api]
  )

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

  // Fetch activity when user data is loaded or filters change
  useEffect(() => {
    if (meData?.family) {
      fetchActivity(0, false)
    }
  }, [meData?.family, fetchActivity])

  const handleLoadMore = () => {
    fetchActivity(currentOffset, true)
  }

  const handleClearFilters = () => {
    setTypeFilter('all')
    setSearchQuery('')
    setStartDate(getDefaultStartDate())
    setEndDate(getTodayDate())
  }

  const hasMore = currentOffset < totalEvents
  const hasActiveFilters =
    typeFilter !== 'all' ||
    debouncedSearch ||
    startDate !== getDefaultStartDate() ||
    endDate !== getTodayDate()

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
              <h1 className="text-xl font-semibold text-ke-primary">Activity Feed</h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Card className="p-6 text-center">
            <p className="text-ke-secondary">You need to create or join a family first.</p>
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button>Go to Dashboard</Button>
            </Link>
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
            <h1 className="text-xl font-semibold text-ke-primary">Activity Feed</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Error Display */}
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Filters Section */}
        <Card className="mb-6">
          <CardBody>
            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ke-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-ke-border bg-ke-surface py-2 pl-10 pr-4 text-sm text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                />
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Type Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="type-filter" className="text-sm font-medium text-ke-secondary">
                  Type:
                </label>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as ActivityTypeFilter)}
                  className="rounded-lg border border-ke-border bg-ke-surface px-3 py-1.5 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                >
                  {TYPE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <label htmlFor="start-date" className="text-sm font-medium text-ke-secondary">
                  From:
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-ke-border bg-ke-surface px-3 py-1.5 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="end-date" className="text-sm font-medium text-ke-secondary">
                  To:
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-ke-border bg-ke-surface px-3 py-1.5 text-sm text-ke-primary focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                />
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-ke-muted hover:text-ke-primary"
                >
                  Clear filters
                </button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-ke-muted">
          {isLoading ? (
            'Loading...'
          ) : (
            <>
              Showing {events.length} of {totalEvents} event{totalEvents !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtered)'}
            </>
          )}
        </div>

        {/* Activity List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-ke-muted">Loading activity...</p>
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? 'No matching activity' : 'No activity yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting your filters to see more results.'
                : 'Activity will appear here when you or your co-parent add expenses, payments, or kids.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <ul className="divide-y divide-ke-divider">
              {events.map((event) => {
                const style = getEventStyle(event.event_type)
                const { action, details } = getEventDescription(event, user?.id)
                const link = getEventLink(event)

                const content = (
                  <div className="flex items-start gap-4 px-4 py-4 sm:px-6">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.bgColor}`}
                    >
                      <span className={style.textColor}>{style.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ke-primary">{action}</p>
                      {details && (
                        <p className="mt-0.5 text-sm font-mono text-ke-secondary truncate">
                          {details}
                        </p>
                      )}
                      <p className="mt-1 text-xs font-mono text-ke-muted">
                        {formatRelativeTime(event.created_at)}
                      </p>
                    </div>
                    {link && (
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-ke-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </div>
                )

                return (
                  <li key={event.id}>
                    <Link
                      href={`/activity/${event.id}`}
                      className="block transition-colors hover:bg-ke-elevated"
                    >
                      {content}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="mt-6 text-center">
            <Button variant="secondary" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}

        {/* Info Box */}
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
              <p className="text-sm font-medium">About Activity Feed</p>
              <p className="mt-1 text-sm opacity-80">
                This feed shows all actions taken by you and your co-parent, including expenses
                added, edited, questioned, resolved, payments made, and kids added or removed. By
                default, it shows activity from the last 30 days.
              </p>
            </div>
          </div>
        </Alert>
      </main>
    </div>
  )
}
