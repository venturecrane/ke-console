import type { ActivityEvent, QuestionReason } from '@/lib/api'
import { formatCurrency, formatCategory } from '@/lib/statusColors'

const QUESTION_REASONS: { value: QuestionReason; label: string }[] = [
  { value: 'wrong_amount', label: 'Wrong amount' },
  { value: 'not_child_related', label: 'Not child-related' },
  { value: 'duplicate', label: 'Duplicate expense' },
  { value: 'split_dispute', label: 'Split percentage dispute' },
  { value: 'other', label: 'Other' },
]

export function formatReasonLabel(reason: string): string {
  return QUESTION_REASONS.find((r) => r.value === reason)?.label || reason
}

export function formatResolutionLabel(action: string): string {
  switch (action) {
    case 'keep':
    case 'kept':
      return 'Keep as-is'
    case 'edit':
    case 'edited':
      return 'Edit amount'
    case 'personal':
      return 'Mark as personal'
    case 'delete':
    case 'deleted':
      return 'Delete expense'
    default:
      return action
  }
}

type NameResolver = (userId: string) => string

function defaultNameResolver(event: ActivityEvent): string {
  return event.user_name || event.user_email
}

export function renderTimelineEvent(
  event: ActivityEvent,
  currentUserId: string,
  nameResolver?: NameResolver
): { label: string; detail?: string; note?: string } | null {
  const actor =
    event.user_id === currentUserId
      ? 'You'
      : nameResolver
        ? nameResolver(event.user_id)
        : defaultNameResolver(event)
  const after = event.after_snapshot as Record<string, unknown> | null
  const meta = event.metadata as Record<string, unknown> | null

  switch (event.event_type) {
    case 'expense.created': {
      const amount =
        typeof after?.amount_cents === 'number' ? formatCurrency(after.amount_cents) : ''
      const category = typeof after?.category === 'string' ? formatCategory(after.category) : ''
      return {
        label: `${actor} added this expense`,
        detail: [amount, category].filter(Boolean).join(' · '),
      }
    }
    case 'expense.edited': {
      const newAmount =
        typeof after?.amount_cents === 'number' ? formatCurrency(after.amount_cents) : null
      return {
        label: `${actor} edited this expense`,
        detail: newAmount ? `Amount changed to ${newAmount}` : undefined,
      }
    }
    case 'expense.questioned': {
      const reason =
        typeof meta?.reason === 'string'
          ? formatReasonLabel(meta.reason)
          : typeof after?.question_reason === 'string'
            ? formatReasonLabel(after.question_reason)
            : null
      const note =
        typeof meta?.note === 'string'
          ? meta.note
          : typeof after?.question_note === 'string'
            ? (after.question_note as string)
            : null
      return {
        label: `${actor} questioned this expense`,
        detail: reason ? `Reason: ${reason}` : undefined,
        note: note || undefined,
      }
    }
    case 'expense.resolved': {
      const action =
        typeof meta?.action === 'string'
          ? formatResolutionLabel(meta.action)
          : typeof after?.resolution_action === 'string'
            ? formatResolutionLabel(after.resolution_action as string)
            : null
      const note = typeof meta?.note === 'string' ? meta.note : undefined
      return {
        label: `${actor} responded: ${action || 'resolved'}`,
        note: note as string | undefined,
      }
    }
    case 'expense.satisfied':
      return {
        label: `${actor} confirmed — expense resolved`,
      }
    default:
      // Fallback for unknown event types (e.g. expense.generated, timeout)
      if (event.event_type === 'expense.generated') {
        return {
          label: 'Auto-resolved after 7 days — no response from questioner',
        }
      }
      return null
  }
}
