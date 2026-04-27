'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/use-api'
import type { MeResponse } from '@/lib/api'
import { Button, Card, CardBody, Alert } from '@/components/ui'

export default function LeaveFamilyPage() {
  const { user, isLoaded } = useUser()
  const api = useApi()
  const router = useRouter()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const data = await api.getMe()
      setMeData(data)
    } catch (err) {
      console.error('Failed to load user data:', err)
      setError('Failed to load your account data.')
    } finally {
      setIsLoading(false)
    }
  }, [user, api])

  useEffect(() => {
    if (isLoaded && user) {
      fetchData()
    }
  }, [isLoaded, user, fetchData])

  const isConfirmed = confirmText === 'LEAVE'

  async function handleLeaveFamily() {
    if (!meData?.family || !isConfirmed) return

    setIsLeaving(true)
    setError(null)

    try {
      await api.leaveFamily(meData.family.id)
      router.push('/family/create?left=true')
    } catch (err) {
      console.error('Failed to leave family:', err)
      setError(err instanceof Error ? err.message : 'Failed to leave family. Please try again.')
    } finally {
      setIsLeaving(false)
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-ke-section">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-ke-elevated" />
          <div className="h-40 rounded-xl bg-ke-elevated" />
        </div>
      </div>
    )
  }

  if (!meData?.family) {
    return (
      <div className="mx-auto max-w-lg px-4 py-ke-section">
        <Alert variant="attention">No family found. You are not part of a family.</Alert>
        <Link href="/dashboard" className="mt-4 inline-block text-ke-accent hover:underline">
          Go to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-ke-section">
      {/* Header */}
      <div className="mb-6 flex items-center gap-ke-row">
        <Link
          href="/settings/family"
          className="rounded-lg p-2 text-ke-secondary hover:bg-ke-elevated"
          aria-label="Back to family settings"
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
        <h1 className="text-ke-title font-bold text-ke-primary">Leave Family</h1>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Warning Card */}
      <Card className="mb-6 border-ke-negative/30">
        <CardBody>
          <div className="flex items-start gap-ke-row">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-ke-negative"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <h2 className="text-ke-caption font-semibold text-ke-primary">
                This action cannot be undone
              </h2>
              <p className="mt-2 text-ke-caption text-ke-secondary">
                Leaving will remove your access to the shared expense ledger. Historical data is
                preserved for your co-parent, but you will no longer be able to view or manage
                shared expenses.
              </p>
              <ul className="mt-3 space-y-1 text-ke-caption text-ke-secondary">
                <li className="flex items-center gap-2">
                  <span className="text-ke-negative">--</span>
                  You will lose access to all shared expenses
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ke-negative">--</span>
                  Your co-parent will retain all expense data
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-ke-negative">--</span>
                  Any outstanding balance will need to be settled separately
                </li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Confirmation */}
      <Card>
        <CardBody>
          <label
            htmlFor="confirmLeave"
            className="mb-2 block text-ke-caption font-medium text-ke-primary"
          >
            Type <span className="font-mono font-bold text-ke-negative">LEAVE</span> to confirm
          </label>
          <input
            type="text"
            id="confirmLeave"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="LEAVE"
            autoComplete="off"
            className="w-full rounded-lg border border-ke-border bg-ke-surface px-3 py-2 text-ke-caption text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
          />

          <div className="mt-4 flex gap-ke-row">
            <Link href="/settings/family" className="flex-1">
              <Button variant="secondary" fullWidth disabled={isLeaving}>
                Cancel
              </Button>
            </Link>
            <Button
              variant="danger"
              onClick={handleLeaveFamily}
              disabled={!isConfirmed || isLeaving}
              className="flex-1"
            >
              {isLeaving ? 'Leaving...' : 'Leave Family'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
