import { Hono } from 'hono'
import { dollarsToCents } from '../calculations'
import type { AppType, CreatePaymentRequest, Family, Payment } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId, getTodayDate } from '../utils'
import { createActivityEvent, getFamilyTier, getHistoryCutoffDate } from '../services/activity'
import { sendNotification } from '../services/notifications'

const app = new Hono<AppType>()

app.use('*', authMiddleware)

// Create payment
app.post('/:id/payments', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    // Verify family exists and user belongs to it
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to add payments to this family' }, 403)
    }

    const body = await c.req.json<CreatePaymentRequest>()
    const { amount, paymentDate, notes } = body

    // Validate required fields
    if (typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: 'Amount is required and must be a positive number' }, 400)
    }

    const paymentId = generateId()
    const amountCents = dollarsToCents(amount)
    const date = paymentDate || getTodayDate()

    await c.env.DB.prepare(
      `INSERT INTO payments (id, family_id, paid_by, amount_cents, payment_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(paymentId, familyId, userId, amountCents, date, notes || null)
      .run()

    // Fetch the created payment
    const payment = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?')
      .bind(paymentId)
      .first<Payment>()

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'payment.created',
      'payment',
      paymentId,
      null,
      payment
    )

    // Notify the other parent (BR-055: never notify self)
    const otherParentId = family.parent_a_id === userId ? family.parent_b_id : family.parent_a_id
    if (otherParentId) {
      const actor = await c.env.DB.prepare('SELECT name, email FROM users WHERE id = ?')
        .bind(userId)
        .first<{ name: string | null; email: string }>()

      // Fire-and-forget (BR-056)
      sendNotification(c.env.DB, c.env, otherParentId, familyId, 'payment_recorded', {
        amount_cents: amountCents,
        actor_name: actor?.name || actor?.email || 'Your co-parent',
      }).catch(() => {})
    }

    return c.json({ success: true, payment }, 201)
  } catch (error) {
    console.error('Create payment error:', error)
    return c.json({ error: 'Failed to create payment', details: String(error) }, 500)
  }
})

// List payments for family
app.get('/:id/payments', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    // Verify family exists and user belongs to it
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: "Not authorized to view this family's payments" }, 403)
    }

    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    // Apply tier-based history limit for Free tier
    const tier = await getFamilyTier(c.env.DB, familyId)
    let tierLimited = false
    let dateFilter = ''
    const queryParams: (string | number)[] = [familyId]

    if (tier.plan === 'free' && tier.historyMonths > 0) {
      const cutoff = getHistoryCutoffDate(tier.historyMonths)
      dateFilter = ' AND payment_date >= ?'
      queryParams.push(cutoff)
      tierLimited = true
    }

    const result = await c.env.DB.prepare(
      `SELECT * FROM payments
       WHERE family_id = ? AND deleted_at IS NULL${dateFilter}
       ORDER BY payment_date DESC, created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...queryParams, limit, offset)
      .all<Payment>()

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM payments WHERE family_id = ? AND deleted_at IS NULL${dateFilter}`
    )
      .bind(...queryParams)
      .first<{ count: number }>()

    return c.json({
      payments: result.results || [],
      pagination: {
        total: countResult?.count || 0,
        limit,
        offset,
      },
      tier: {
        plan: tier.plan,
        historyLimited: tierLimited,
        historyMonths: tier.historyMonths,
      },
    })
  } catch (error) {
    console.error('List payments error:', error)
    return c.json({ error: 'Failed to list payments', details: String(error) }, 500)
  }
})

export default app
