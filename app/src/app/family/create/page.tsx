'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import { Button, Card, CardBody, Alert } from '@/components/ui'

export default function CreateFamilyPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const api = useApi()
  const [familyName, setFamilyName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      await api.createFamily(familyName || undefined)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create family')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-ke-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ke-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-ke-section">
          <div className="flex items-center gap-ke-stack">
            <Link href="/dashboard" className="text-ke-muted hover:text-ke-primary">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-ke-display font-semibold text-ke-primary">Create Your Family</h1>
          </div>
          <p className="mt-2 text-ke-secondary">
            Set up a shared expense ledger with your co-parent
          </p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="familyName"
                  className="mb-2 block text-ke-caption font-medium text-ke-secondary"
                >
                  Family Name (optional)
                </label>
                <input
                  type="text"
                  id="familyName"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g., Smith Family"
                  className="w-full rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-ke-primary placeholder-ke-muted focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                />
                <p className="mt-1 text-ke-caption text-ke-muted">
                  You can leave this blank and add it later
                </p>
              </div>

              {error && (
                <Alert variant="error" className="mb-4">
                  {error}
                </Alert>
              )}

              <Button type="submit" disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Creating...' : 'Create Family'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-ke-caption text-ke-secondary">
            Already have an invite code?{' '}
            <Link href="/family/join" className="font-medium text-ke-primary hover:underline">
              Join a family
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
