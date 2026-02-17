import { Hono } from 'hono'
import { centsToDollars } from '../calculations'
import type { AppType, Expense, Family, Payment } from '../types'
import { authMiddleware } from '../middleware/auth'
import { getFamilyTier } from '../services/activity'

const app = new Hono<AppType>()

app.use('*', authMiddleware)

// GET /families/:id/expenses/export/csv
app.get('/:id/expenses/export/csv', async (c) => {
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
      return c.json({ error: 'Not authorized' }, 403)
    }

    // Check tier
    const tier = await getFamilyTier(c.env.DB, familyId)
    if (tier.plan !== 'pro') {
      return c.json({ error: 'Pro tier required for CSV export' }, 403)
    }

    // Get all non-deleted expenses
    const result = await c.env.DB.prepare(
      `SELECT e.*, u.name as creator_name, u.email as creator_email,
              p.name as payer_name, p.email as payer_email
       FROM expenses e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users p ON e.paid_by = p.id
       WHERE e.family_id = ? AND e.deleted_at IS NULL
       ORDER BY e.expense_date DESC, e.created_at DESC`
    )
      .bind(familyId)
      .all<
        Expense & {
          creator_name: string | null
          creator_email: string
          payer_name: string | null
          payer_email: string
        }
      >()

    const expenses = result.results || []

    // Build CSV
    const headers = 'Date,Description,Amount,Category,Paid By,Status,Created By'
    const rows = expenses.map((e) => {
      const amount = centsToDollars(e.amount_cents).toFixed(2)
      const paidBy = e.payer_name || e.payer_email || e.paid_by
      const createdBy = e.creator_name || e.creator_email || e.created_by
      // Escape CSV values that might contain commas or quotes
      const desc = csvEscape(e.description)
      const paidByEscaped = csvEscape(paidBy)
      const createdByEscaped = csvEscape(createdBy)
      return `${e.expense_date},${desc},${amount},${e.category},${paidByEscaped},${e.status},${createdByEscaped}`
    })

    const csv = [headers, ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="expenses-${familyId}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export expenses CSV error:', error)
    return c.json({ error: 'Failed to export expenses' }, 500)
  }
})

// GET /families/:id/payments/export/csv
app.get('/:id/payments/export/csv', async (c) => {
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
      return c.json({ error: 'Not authorized' }, 403)
    }

    // Check tier
    const tier = await getFamilyTier(c.env.DB, familyId)
    if (tier.plan !== 'pro') {
      return c.json({ error: 'Pro tier required for CSV export' }, 403)
    }

    // Get all non-deleted payments
    const result = await c.env.DB.prepare(
      `SELECT p.*, u.name as payer_name, u.email as payer_email
       FROM payments p
       LEFT JOIN users u ON p.paid_by = u.id
       WHERE p.family_id = ? AND p.deleted_at IS NULL
       ORDER BY p.payment_date DESC, p.created_at DESC`
    )
      .bind(familyId)
      .all<
        Payment & {
          payer_name: string | null
          payer_email: string
        }
      >()

    const payments = result.results || []

    // Build CSV
    const headers = 'Date,Amount,Paid By,Method,Notes'
    const rows = payments.map((p) => {
      const amount = centsToDollars(p.amount_cents).toFixed(2)
      const paidBy = p.payer_name || p.payer_email || p.paid_by
      const notes = p.notes || ''
      return `${p.payment_date},${amount},${csvEscape(paidBy)},,${csvEscape(notes)}`
    })

    const csv = [headers, ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-${familyId}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export payments CSV error:', error)
    return c.json({ error: 'Failed to export payments' }, 500)
  }
})

// Escape CSV value: wrap in quotes if it contains comma, quote, or newline
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export default app
