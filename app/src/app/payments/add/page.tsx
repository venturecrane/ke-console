'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import type { MeResponse } from '@/lib/api'
import { Button, Card, CardBody, Alert, Input, Textarea } from '@/components/ui'

export default function AddPaymentPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const api = useApi()
  const [meData, setMeData] = useState<MeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function loadUserData() {
      if (!user) return
      try {
        const data = await api.getMe()
        setMeData(data)
        if (!data.family) {
          router.push('/dashboard')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !meData?.family) return

    setIsSubmitting(true)
    setError(null)

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid positive amount')
      setIsSubmitting(false)
      return
    }

    try {
      await api.createPayment(meData.family.id, {
        amount: amountNum,
        paymentDate,
        notes: notes.trim() || undefined,
      })
      router.refresh()
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
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
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ke-bg px-4 py-ke-section">
      <div className="w-full max-w-md">
        <div className="mb-ke-section">
          <div className="flex items-center gap-ke-stack">
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
            <h1 className="text-ke-display font-semibold text-ke-primary">Record Payment</h1>
          </div>
          <p className="mt-2 text-ke-secondary">Log a payment you made to your co-parent</p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              {/* Amount */}
              <div className="mb-4">
                <Input
                  label={
                    <>
                      Amount ($) <span className="text-ke-negative">*</span>
                    </>
                  }
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                  hint="Enter the amount you paid via Venmo, Zelle, cash, etc."
                />
              </div>

              {/* Date */}
              <div className="mb-4">
                <Input
                  label={
                    <>
                      Date <span className="text-ke-negative">*</span>
                    </>
                  }
                  type="date"
                  id="paymentDate"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              {/* Notes (optional) */}
              <div className="mb-6">
                <Textarea
                  label={
                    <>
                      Notes <span className="text-ke-muted">(optional)</span>
                    </>
                  }
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Venmo transfer, Cash payment..."
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="error" className="mb-4">
                  {error}
                </Alert>
              )}

              <Button type="submit" disabled={isSubmitting || !amount} fullWidth>
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
