'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type { ActivityEvent } from '@/lib/api'
import { formatCurrency, formatStatus } from '@/lib/formatters'
import { Card, CardBody, Alert } from '@/components/ui'

function formatEventType(eventType: string): string {
  const labels: Record<string, string> = {
    'expense.created': 'Expense Created',
    'expense.edited': 'Expense Edited',
    'expense.questioned': 'Expense Questioned',
    'expense.resolved': 'Expense Resolved',
    'expense.satisfied': 'Expense Satisfied',
    'expense.generated': 'Expense Generated',
    'payment.created': 'Payment Created',
    'child.created': 'Child Added',
    'child.deleted': 'Child Removed',
    'fixed_expense.created': 'Recurring Expense Created',
    'fixed_expense.updated': 'Recurring Expense Updated',
    'fixed_expense.ended': 'Recurring Expense Ended',
    'family.ratio_updated': 'Split Ratio Updated',
  }
  return labels[eventType] || formatStatus(eventType.replace('.', ' '))
}

function getTargetLink(event: ActivityEvent): string | null {
  if (!event.target_type || !event.target_id) return null

  switch (event.target_type) {
    case 'expense':
      return `/expenses/${event.target_id}`
    case 'payment':
      return `/payments`
    case 'fixed_expense':
      return `/recurring`
    case 'child':
      return `/settings/children`
    case 'family':
      return `/settings/family`
    default:
      return null
  }
}

function isMoneyField(key: string): boolean {
  return key.endsWith('_cents') || key === 'amount_cents' || key === 'amount'
}

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '(none)'
  if (isMoneyField(key) && typeof value === 'number') {
    return formatCurrency(value)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') {
    // Try parsing as date
    if (key.endsWith('_at') || key.endsWith('_date')) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      }
    }
    if (key === 'status') return formatStatus(value)
    return value
  }
  return String(value)
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\w/g, (c) => c.toUpperCase())
    .replace('Cents', '(amount)')
    .replace(' Id', ' ID')
}

interface DiffEntry {
  field: string
  before: unknown
  after: unknown
}

function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): DiffEntry[] {
  if (!before || !after) return []

  const diffs: DiffEntry[] = []
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  // Skip metadata fields
  const skipKeys = new Set(['id', 'family_id', 'created_at', 'updated_at', 'deleted_at'])

  for (const key of allKeys) {
    if (skipKeys.has(key)) continue
    const bVal = before[key]
    const aVal = after[key]
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      diffs.push({ field: key, before: bVal, after: aVal })
    }
  }

  return diffs
}

export default function ActivityDetailPage() {
  const { user, isLoaded } = useUser()
  const params = useParams()
  const api = useApi()
  const eventId = params.id as string

  const [event, setEvent] = useState<ActivityEvent | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)

    try {
      const eventData = await api.getActivityEvent(eventId)
      setEvent(eventData)
    } catch (err) {
      console.error('Failed to load activity event:', err)
      setError(err instanceof Error ? err.message : 'Failed to load event')
    } finally {
      setIsLoading(false)
    }
  }, [user, eventId, api])

  useEffect(() => {
    if (isLoaded && user) {
      fetchData()
    }
  }, [isLoaded, user, fetchData])

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ke-bg">
        <p className="text-ke-muted">Loading...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-ke-bg">
        <header className="border-b border-ke-border bg-ke-surface">
          <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
            <Link href="/activity" className="text-ke-muted hover:text-ke-secondary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-ke-primary">Activity Detail</h1>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">
          <Alert variant="error">{error || 'Event not found'}</Alert>
        </main>
      </div>
    )
  }

  const targetLink = getTargetLink(event)
  const isTargetDeleted =
    event.after_snapshot &&
    (event.after_snapshot as Record<string, unknown>).deleted_at !== null &&
    (event.after_snapshot as Record<string, unknown>).deleted_at !== undefined
  const diffs = computeDiff(event.before_snapshot, event.after_snapshot)
  const actorName =
    event.user_id === user?.id ? 'You' : event.user_name || event.user_email || 'Unknown'

  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link
            href="/activity"
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
          <h1 className="text-xl font-semibold text-ke-primary">Activity Detail</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Event Summary */}
        <Card>
          <CardBody>
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center rounded-md bg-ke-elevated px-2.5 py-0.5 text-xs font-semibold text-ke-secondary">
                  {formatEventType(event.event_type)}
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-ke-muted">Actor</dt>
                  <dd className="font-medium text-ke-primary">{actorName}</dd>
                </div>
                <div>
                  <dt className="text-ke-muted">Time</dt>
                  <dd className="font-mono text-ke-primary">
                    {new Date(event.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    {new Date(event.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-ke-muted">Target</dt>
                  <dd className="font-medium text-ke-primary">
                    {formatStatus(event.target_type)}
                    {targetLink && !isTargetDeleted ? (
                      <Link href={targetLink} className="ml-2 text-ke-accent hover:underline">
                        View
                      </Link>
                    ) : isTargetDeleted ? (
                      <span className="ml-2 text-xs text-ke-muted">(deleted)</span>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </div>
          </CardBody>
        </Card>

        {/* Changes Diff */}
        {diffs.length > 0 && (
          <Card>
            <CardBody>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ke-muted">
                Changes
              </h2>
              <div className="divide-y divide-ke-divider">
                {diffs.map((diff) => (
                  <div key={diff.field} className="py-3 first:pt-0 last:pb-0">
                    <p className="mb-1 text-sm font-medium text-ke-secondary">
                      {formatFieldLabel(diff.field)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={`font-mono ${isMoneyField(diff.field) ? 'font-semibold' : ''} text-ke-muted line-through`}
                      >
                        {formatFieldValue(diff.field, diff.before)}
                      </span>
                      <svg
                        className="h-4 w-4 shrink-0 text-ke-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                      <span
                        className={`font-mono ${isMoneyField(diff.field) ? 'font-semibold text-ke-accent' : 'text-ke-primary'}`}
                      >
                        {formatFieldValue(diff.field, diff.after)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Snapshot (when no diff but we have a snapshot) */}
        {diffs.length === 0 && event.after_snapshot && (
          <Card>
            <CardBody>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ke-muted">
                Snapshot
              </h2>
              <dl className="divide-y divide-ke-divider">
                {Object.entries(event.after_snapshot)
                  .filter(([key]) => !['id', 'family_id', 'created_at', 'updated_at'].includes(key))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between py-2 text-sm first:pt-0 last:pb-0"
                    >
                      <dt className="text-ke-muted">{formatFieldLabel(key)}</dt>
                      <dd
                        className={`font-mono ${isMoneyField(key) ? 'font-semibold' : ''} text-ke-primary`}
                      >
                        {formatFieldValue(key, value)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </CardBody>
          </Card>
        )}

        {/* Metadata */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <Card>
            <CardBody>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ke-muted">
                Metadata
              </h2>
              <dl className="divide-y divide-ke-divider">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 text-sm first:pt-0 last:pb-0">
                    <dt className="text-ke-muted">{formatFieldLabel(key)}</dt>
                    <dd className="font-mono text-ke-primary">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  )
}
