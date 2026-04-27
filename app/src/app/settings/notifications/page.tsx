'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type { MeResponse, NotificationPreferences } from '@/lib/api'
import { Button, Card, CardHeader, CardBody, Alert } from '@/components/ui'

type PreferenceKey = keyof NotificationPreferences

const NOTIFICATION_TYPES: { key: PreferenceKey; label: string; description: string }[] = [
  {
    key: 'expense_created',
    label: 'Expense Created',
    description: 'When your co-parent adds an expense',
  },
  {
    key: 'expense_questioned',
    label: 'Expense Questioned',
    description: 'When your co-parent questions your expense',
  },
  {
    key: 'question_resolved',
    label: 'Question Resolved',
    description: 'When the creator resolves your question',
  },
  {
    key: 'payment_recorded',
    label: 'Payment Recorded',
    description: 'When your co-parent records a payment',
  },
  {
    key: 'recurring_generated',
    label: 'Recurring Generated',
    description: 'Monthly auto-generated expense summary',
  },
]

export default function NotificationSettingsPage() {
  const { user, isLoaded } = useUser()
  const api = useApi()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null)
  const [savedKey, setSavedKey] = useState<PreferenceKey | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const me = await api.getMe()
      setMeData(me)

      if (me.family) {
        const prefs = await api.getNotificationPreferences(me.family.id)
        setPreferences(prefs)
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err)
      setError('Failed to load notification preferences. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [user, api])

  useEffect(() => {
    if (isLoaded && user) {
      fetchData()
    }
  }, [isLoaded, user, fetchData])

  async function handleToggle(key: PreferenceKey) {
    if (!meData?.family || !preferences) return

    const newValue = !preferences[key]
    setSavingKey(key)
    setSavedKey(null)

    // Optimistic update
    setPreferences((prev) => (prev ? { ...prev, [key]: newValue } : prev))

    try {
      const updated = await api.updateNotificationPreferences(meData.family.id, {
        [key]: newValue,
      })
      setPreferences(updated)
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 2000)
    } catch (err) {
      console.error('Failed to update preference:', err)
      // Revert optimistic update
      setPreferences((prev) => (prev ? { ...prev, [key]: !newValue } : prev))
      setError('Failed to save. Please try again.')
    } finally {
      setSavingKey(null)
    }
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
            <div className="flex items-center gap-ke-stack">
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
              <h1 className="text-ke-title font-semibold text-ke-primary">Notifications</h1>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-ke-section">
          <Card>
            <CardBody className="text-center">
              <p className="text-ke-secondary">You need to create or join a family first.</p>
              <Link href="/dashboard" className="mt-4 inline-block">
                <Button>Go to Dashboard</Button>
              </Link>
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
          <div className="flex items-center gap-ke-stack">
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
            <h1 className="text-ke-title font-semibold text-ke-primary">Notifications</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-ke-card">
        {error && (
          <Alert variant="error" className="mb-6">
            <p>{error}</p>
          </Alert>
        )}

        <Card>
          <CardHeader className="border-b border-ke-border">
            <h2 className="text-ke-body-lg font-medium text-ke-primary">Email Notifications</h2>
            <p className="mt-1 text-ke-caption text-ke-muted">
              Choose which notifications you want to receive by email.
            </p>
          </CardHeader>

          {isLoading ? (
            <div className="divide-y divide-ke-divider">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between px-ke-card py-4">
                  <div className="space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-ke-elevated" />
                    <div className="h-3 w-48 animate-pulse rounded bg-ke-elevated" />
                  </div>
                  <div className="h-6 w-11 animate-pulse rounded-full bg-ke-elevated" />
                </div>
              ))}
            </div>
          ) : preferences ? (
            <ul className="divide-y divide-ke-divider">
              {NOTIFICATION_TYPES.map(({ key, label, description }) => (
                <li key={key} className="flex items-center justify-between px-ke-card py-4">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-medium text-ke-primary">{label}</p>
                    <p className="mt-0.5 text-ke-caption text-ke-muted">{description}</p>
                  </div>
                  <div className="flex items-center gap-ke-row shrink-0">
                    {savedKey === key && (
                      <span className="text-ke-label font-medium text-ke-positive">Saved</span>
                    )}
                    <button
                      onClick={() => handleToggle(key)}
                      disabled={savingKey === key}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ke-focus focus:ring-offset-2 disabled:opacity-50 ${
                        preferences[key] ? 'bg-ke-accent' : 'bg-ke-border'
                      }`}
                      role="switch"
                      aria-checked={preferences[key]}
                      aria-label={`Toggle ${label}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preferences[key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </main>
    </div>
  )
}
