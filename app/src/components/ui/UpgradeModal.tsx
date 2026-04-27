'use client'

import { useRouter } from 'next/navigation'
import { Button } from './Button'
import { Card, CardBody } from './Card'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  /** Optional: customize the title shown in the modal */
  title?: string
  /** Optional: customize the description */
  description?: string
}

const PRO_BENEFITS = [
  'Unlimited recurring expense templates',
  'Full expense history (no time limit)',
  'Priority support',
  'Advanced analytics (coming soon)',
]

function UpgradeModal({
  isOpen,
  onClose,
  title = 'Upgrade to Pro',
  description = "You've reached the limit on the Free plan. Unlock more with Pro.",
}: UpgradeModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h3 className="text-ke-body-lg font-semibold text-ke-primary">{title}</h3>
          <p className="mt-2 text-ke-caption text-ke-secondary">{description}</p>

          <ul className="mt-4 space-y-2">
            {PRO_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-ke-caption text-ke-primary">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-ke-positive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-3">
            <Button
              fullWidth
              onClick={() => {
                onClose()
                router.push('/settings/billing')
              }}
              className="min-h-[44px]"
            >
              Upgrade Now
            </Button>
            <Button variant="ghost" fullWidth onClick={onClose} className="min-h-[44px]">
              Maybe Later
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export { UpgradeModal, type UpgradeModalProps }
