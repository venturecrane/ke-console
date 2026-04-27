'use client'

import Link from 'next/link'
import { UserProfile } from '@clerk/nextjs'

export default function ProfileSettingsPage() {
  return (
    <div className="min-h-screen bg-ke-bg">
      <header className="border-b border-ke-border bg-ke-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-ke-stack px-4 py-4">
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
          <h1 className="text-ke-title font-semibold text-ke-primary">Profile Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-ke-card">
        <div className="flex justify-center">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full max-w-2xl',
                card: 'shadow-none border border-ke-border rounded-lg bg-ke-surface w-full',
                navbar: 'hidden',
                pageScrollBox: 'p-0',
                page: 'p-0',
              },
            }}
          />
        </div>
      </main>
    </div>
  )
}
