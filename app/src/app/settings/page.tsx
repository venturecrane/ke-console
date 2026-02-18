'use client'

import Link from 'next/link'
import { Card } from '@/components/ui'

const SETTINGS_SECTIONS = [
  {
    label: 'Manage Kids',
    href: '/settings/children',
    description: 'Add, rename, or remove kids from your family',
  },
  {
    label: 'Family Settings',
    href: '/settings/family',
    description: 'Expense split ratio, family name, and invite management',
  },
  {
    label: 'Recurring Expenses',
    href: '/settings/fixed-expenses',
    description: 'Set up templates for predictable recurring costs',
  },
  {
    label: 'Notifications',
    href: '/settings/notifications',
    description: 'Choose which email notifications you receive',
  },
  {
    label: 'Billing',
    href: '/settings/billing',
    description: 'Manage your subscription and payment method',
  },
  {
    label: 'Profile',
    href: '/settings/profile',
    description: 'Update your name and account details',
  },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-ke-bg">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
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
          <h1 className="text-2xl font-semibold text-ke-primary">Settings</h1>
        </div>

        <Card>
          <div className="divide-y divide-ke-divider">
            {SETTINGS_SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-ke-elevated"
              >
                <div>
                  <p className="font-medium text-ke-primary">{section.label}</p>
                  <p className="mt-0.5 text-sm text-ke-muted">{section.description}</p>
                </div>
                <svg
                  className="h-5 w-5 shrink-0 text-ke-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
