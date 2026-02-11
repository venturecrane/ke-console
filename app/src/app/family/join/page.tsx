'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import { Button, Card, CardBody, Alert } from '@/components/ui'

function JoinFamilyForm() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const api = useApi()
  const [inviteCode, setInviteCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill invite code from URL if provided
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setInviteCode(code.toUpperCase())
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !inviteCode.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      await api.joinFamily(inviteCode.trim().toUpperCase())
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join family')
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
        {/* App branding */}
        <div className="mb-8 text-center">
          {/* TODO: Replace with logo when available */}
          <h1 className="text-3xl font-bold text-ke-primary">KidExpenses</h1>
          <p className="mt-1 text-sm text-ke-muted">Shared expense tracking for co-parents</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-ke-primary">Join a Family</h2>
          <p className="mt-1 text-ke-secondary">Enter the invite code to get started.</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label
                  htmlFor="inviteCode"
                  className="mb-2 block text-sm font-medium text-ke-secondary"
                >
                  Invite Code
                </label>
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  maxLength={8}
                  className="w-full rounded-lg border border-ke-border bg-ke-surface px-4 py-2 text-center font-mono text-lg tracking-widest text-ke-primary placeholder-ke-muted uppercase focus:border-ke-focus focus:outline-none focus:ring-1 focus:ring-ke-focus"
                />
                <p className="mt-1 text-sm text-ke-muted">
                  8-character code provided by your co-parent
                </p>
              </div>

              {error && (
                <div className="mb-4">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting || inviteCode.length !== 8} fullWidth>
                {isSubmitting ? 'Joining...' : 'Join Family'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-ke-secondary">
            Need to create a new family instead?{' '}
            <Link href="/family/create" className="font-medium text-ke-primary hover:underline">
              Create a family
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function JoinFamilyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-ke-muted">Loading...</p>
        </div>
      }
    >
      <JoinFamilyForm />
    </Suspense>
  )
}
