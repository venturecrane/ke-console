import { centsToDollars } from '../calculations'

// Check notification preference for a user+family+eventType
async function isNotificationEnabled(
  db: D1Database,
  recipientUserId: string,
  familyId: string,
  eventType: string
): Promise<boolean> {
  const prefs = await db
    .prepare('SELECT * FROM notification_preferences WHERE user_id = ? AND family_id = ?')
    .bind(recipientUserId, familyId)
    .first<{
      expense_created: number
      expense_questioned: number
      question_resolved: number
      payment_recorded: number
      recurring_generated: number
    }>()

  // If no preferences row, all notifications are enabled by default
  if (!prefs) return true

  switch (eventType) {
    case 'expense_created':
      return !!prefs.expense_created
    case 'expense_questioned':
      return !!prefs.expense_questioned
    case 'question_resolved':
      return !!prefs.question_resolved
    case 'payment_recorded':
      return !!prefs.payment_recorded
    case 'recurring_generated':
      return !!prefs.recurring_generated
    default:
      return true
  }
}

// Build email subject and body based on event type
function buildEmail(
  eventType: string,
  data: Record<string, unknown>
): { subject: string; html: string } {
  const appUrl = (data._appUrl as string) || 'https://ke-console.vercel.app'

  switch (eventType) {
    case 'expense_created': {
      const description = (data.description as string) || 'an expense'
      const amount = data.amount_cents
        ? `$${centsToDollars(data.amount_cents as number).toFixed(2)}`
        : ''
      const actorName = (data.actor_name as string) || 'Your co-parent'
      return {
        subject: `${actorName} added a new expense: ${description}`,
        html: `
          <p><strong>${actorName}</strong> added a new expense:</p>
          <p><strong>${description}</strong> ${amount}</p>
          <p><a href="${appUrl}">View in Kid Expenses</a></p>
        `.trim(),
      }
    }
    case 'expense_questioned': {
      const description = (data.description as string) || 'an expense'
      const reason = (data.reason as string) || ''
      const actorName = (data.actor_name as string) || 'Your co-parent'
      return {
        subject: `${actorName} questioned your expense: ${description}`,
        html: `
          <p><strong>${actorName}</strong> questioned your expense <strong>${description}</strong>.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p><a href="${appUrl}">View and respond in Kid Expenses</a></p>
        `.trim(),
      }
    }
    case 'question_resolved': {
      const description = (data.description as string) || 'an expense'
      const action = (data.action as string) || ''
      const actorName = (data.actor_name as string) || 'The expense creator'
      return {
        subject: `${actorName} resolved the questioned expense: ${description}`,
        html: `
          <p><strong>${actorName}</strong> resolved the questioned expense <strong>${description}</strong>.</p>
          ${action ? `<p>Resolution: ${action}</p>` : ''}
          <p><a href="${appUrl}">View in Kid Expenses</a></p>
        `.trim(),
      }
    }
    case 'payment_recorded': {
      const amount = data.amount_cents
        ? `$${centsToDollars(data.amount_cents as number).toFixed(2)}`
        : ''
      const actorName = (data.actor_name as string) || 'Your co-parent'
      return {
        subject: `${actorName} recorded a payment of ${amount}`,
        html: `
          <p><strong>${actorName}</strong> recorded a payment of <strong>${amount}</strong>.</p>
          <p><a href="${appUrl}">View in Kid Expenses</a></p>
        `.trim(),
      }
    }
    case 'member_left': {
      const actorName = (data.actor_name as string) || 'Your co-parent'
      return {
        subject: 'Your co-parent has left the family',
        html: `
          <p><strong>${actorName}</strong> has left the family on Kid Expenses.</p>
          <p>You can invite a new co-parent at any time.</p>
          <p><a href="${appUrl}">Go to Kid Expenses</a></p>
        `.trim(),
      }
    }
    default:
      return {
        subject: 'Kid Expenses notification',
        html: '<p>You have a new notification in Kid Expenses.</p>',
      }
  }
}

/**
 * Send a notification email to a user. Fire-and-forget: never throws.
 *
 * BR-055: Caller must pass recipientUserId as the OTHER parent, not the actor.
 * BR-056: Never block mutations on email failure.
 */
export async function sendNotification(
  db: D1Database,
  env: { RESEND_API_KEY?: string; APP_URL?: string },
  recipientUserId: string,
  familyId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    // 1. Check notification preference
    const enabled = await isNotificationEnabled(db, recipientUserId, familyId, eventType)
    if (!enabled) return

    // 2. Get recipient email
    const user = await db
      .prepare('SELECT email, name FROM users WHERE id = ?')
      .bind(recipientUserId)
      .first<{ email: string; name: string | null }>()

    if (!user || !user.email) return

    // 3. Build email
    const enrichedData = { ...data, _appUrl: env.APP_URL || 'https://ke-console.vercel.app' }
    const { subject, html } = buildEmail(eventType, enrichedData)

    // 4. Send via Resend API
    if (!env.RESEND_API_KEY) {
      console.log(`[notifications] No RESEND_API_KEY, skipping email to ${user.email}: ${subject}`)
      return
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kid Expenses <notifications@kidexpenses.app>',
        to: [user.email],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[notifications] Resend API error for ${eventType}:`, errorText)
    }
  } catch (error) {
    // BR-056: Never throw from notification sending
    console.error(`[notifications] Failed to send ${eventType} notification:`, error)
  }
}

/**
 * Send generation summary emails after recurring expense generation.
 * Checks each parent's recurring_generated preference before sending.
 */
export async function sendGenerationSummary(
  db: D1Database,
  env: { RESEND_API_KEY?: string; APP_URL?: string },
  generatedDetails: Array<{ family_id: string; description: string; amount_cents: number }>
): Promise<void> {
  try {
    // Group generated expenses by family
    const byFamily = new Map<string, Array<{ description: string; amount_cents: number }>>()
    for (const detail of generatedDetails) {
      const existing = byFamily.get(detail.family_id) || []
      existing.push({ description: detail.description, amount_cents: detail.amount_cents })
      byFamily.set(detail.family_id, existing)
    }

    for (const [familyId, expenses] of byFamily) {
      // Get both parents
      const family = await db
        .prepare('SELECT parent_a_id, parent_b_id FROM families WHERE id = ?')
        .bind(familyId)
        .first<{ parent_a_id: string; parent_b_id: string | null }>()

      if (!family) continue

      const parentIds = [family.parent_a_id]
      if (family.parent_b_id) parentIds.push(family.parent_b_id)

      // Build expense list HTML
      const expenseListHtml = expenses
        .map((e) => `<li>${e.description}: $${centsToDollars(e.amount_cents).toFixed(2)}</li>`)
        .join('')

      const appUrl = env.APP_URL || 'https://ke-console.vercel.app'
      const subject = `${expenses.length} recurring expense${expenses.length > 1 ? 's' : ''} generated`
      const html = `
        <p>The following recurring expenses were automatically generated:</p>
        <ul>${expenseListHtml}</ul>
        <p><a href="${appUrl}">View in Kid Expenses</a></p>
      `.trim()

      for (const parentId of parentIds) {
        try {
          // Check preference
          const enabled = await isNotificationEnabled(db, parentId, familyId, 'recurring_generated')
          if (!enabled) continue

          const user = await db
            .prepare('SELECT email FROM users WHERE id = ?')
            .bind(parentId)
            .first<{ email: string }>()

          if (!user || !user.email || !env.RESEND_API_KEY) continue

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Kid Expenses <notifications@kidexpenses.app>',
              to: [user.email],
              subject,
              html,
            }),
          })
        } catch (error) {
          console.error(`[notifications] Failed to send generation summary to ${parentId}:`, error)
        }
      }
    }
  } catch (error) {
    console.error('[notifications] Failed to send generation summaries:', error)
  }
}
