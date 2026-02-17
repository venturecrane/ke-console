import { Hono } from 'hono'
import { dollarsToCents } from '../calculations'
import type {
  AppType,
  CreateFixedExpenseRequest,
  UpdateFixedExpenseRequest,
  Family,
  FixedExpense,
} from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId, getTodayDate } from '../utils'
import {
  createActivityEvent,
  checkFixedExpenseLimit,
  generateMonthlyExpenses,
} from '../services/activity'

const app = new Hono<AppType>()

app.use('*', authMiddleware)

// Create fixed expense
app.post('/:id/fixed-expenses', async (c) => {
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
      return c.json({ error: 'Not authorized to add fixed expenses to this family' }, 403)
    }

    // Check tier limit
    const tierCheck = await checkFixedExpenseLimit(c.env.DB, familyId)
    if (!tierCheck.allowed) {
      return c.json(
        {
          error: 'Fixed expense limit reached',
          current: tierCheck.current,
          limit: tierCheck.limit,
          upgrade: 'Upgrade to Pro for unlimited fixed expenses',
        },
        403
      )
    }

    const body = await c.req.json<CreateFixedExpenseRequest>()
    const {
      description,
      amount,
      category,
      frequency,
      effectiveFrom,
      effectiveUntil,
      linkUrl,
      memo,
    } = body
    const validFrequency = frequency || 'monthly'

    // Validate required fields
    if (!description || description.length === 0) {
      return c.json({ error: 'Description is required' }, 400)
    }
    if (description.length > 200) {
      return c.json({ error: 'Description must be 200 characters or less' }, 400)
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: 'Amount is required and must be a positive number' }, 400)
    }
    if (
      !category ||
      !['school', 'medical', 'activities', 'childcare', 'other'].includes(category)
    ) {
      return c.json(
        {
          error:
            'Category is required and must be: school, medical, activities, childcare, or other',
        },
        400
      )
    }
    if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      return c.json({ error: 'effectiveFrom is required in YYYY-MM-DD format' }, 400)
    }
    if (memo && memo.length > 500) {
      return c.json({ error: 'Memo must be 500 characters or less' }, 400)
    }

    const fixedExpenseId = generateId()
    const amountCents = dollarsToCents(amount)

    await c.env.DB.prepare(
      `INSERT INTO fixed_expenses (
        id, family_id, created_by, description, amount_cents, category,
        frequency, link_url, memo, effective_from, effective_until, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
      .bind(
        fixedExpenseId,
        familyId,
        userId,
        description,
        amountCents,
        category,
        validFrequency,
        linkUrl || null,
        memo || null,
        effectiveFrom,
        effectiveUntil || null
      )
      .run()

    // Fetch the created fixed expense
    const fixedExpense = await c.env.DB.prepare('SELECT * FROM fixed_expenses WHERE id = ?')
      .bind(fixedExpenseId)
      .first<FixedExpense>()

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'fixed_expense.created',
      'fixed_expense',
      fixedExpenseId,
      null,
      fixedExpense
    )

    return c.json({ success: true, fixedExpense }, 201)
  } catch (error) {
    console.error('Create fixed expense error:', error)
    return c.json({ error: 'Failed to create fixed expense' }, 500)
  }
})

// List fixed expenses
app.get('/:id/fixed-expenses', async (c) => {
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
      return c.json({ error: "Not authorized to view this family's fixed expenses" }, 403)
    }

    // Generate monthly expenses if needed (on app open check)
    await generateMonthlyExpenses(c.env.DB, familyId)

    const includeEnded = c.req.query('includeEnded') === 'true'

    let query = `SELECT * FROM fixed_expenses WHERE family_id = ? AND deleted_at IS NULL`
    if (!includeEnded) {
      query += ` AND (effective_until IS NULL OR effective_until >= date('now'))`
    }
    query += ` ORDER BY created_at DESC`

    const result = await c.env.DB.prepare(query).bind(familyId).all<FixedExpense>()

    // Get tier info
    const tierCheck = await checkFixedExpenseLimit(c.env.DB, familyId)

    return c.json({
      fixedExpenses: result.results || [],
      count: result.results?.length || 0,
      tier: {
        current: tierCheck.current,
        limit: tierCheck.limit,
        canAdd: tierCheck.allowed,
      },
    })
  } catch (error) {
    console.error('List fixed expenses error:', error)
    return c.json({ error: 'Failed to list fixed expenses' }, 500)
  }
})

// Update fixed expense
app.patch('/:id/fixed-expenses/:fixedExpenseId', async (c) => {
  const familyId = c.req.param('id')
  const fixedExpenseId = c.req.param('fixedExpenseId')
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
      return c.json({ error: "Not authorized to modify this family's fixed expenses" }, 403)
    }

    // Get the fixed expense
    const fixedExpense = await c.env.DB.prepare(
      'SELECT * FROM fixed_expenses WHERE id = ? AND family_id = ? AND deleted_at IS NULL'
    )
      .bind(fixedExpenseId, familyId)
      .first<FixedExpense>()

    if (!fixedExpense) {
      return c.json({ error: 'Fixed expense not found' }, 404)
    }

    const body = await c.req.json<UpdateFixedExpenseRequest>()
    const { description, amount, category, frequency, effectiveUntil, linkUrl, memo } = body

    // Build update query
    const updates: string[] = []
    const params: (string | number | null)[] = []

    if (description !== undefined) {
      if (description.length === 0 || description.length > 200) {
        return c.json({ error: 'Description must be between 1 and 200 characters' }, 400)
      }
      updates.push('description = ?')
      params.push(description)
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return c.json({ error: 'Amount must be a positive number' }, 400)
      }
      updates.push('amount_cents = ?')
      params.push(dollarsToCents(amount))
    }

    if (category !== undefined) {
      if (!['school', 'medical', 'activities', 'childcare', 'other'].includes(category)) {
        return c.json(
          { error: 'Category must be: school, medical, activities, childcare, or other' },
          400
        )
      }
      updates.push('category = ?')
      params.push(category)
    }

    if (frequency !== undefined) {
      if (!['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'].includes(frequency)) {
        return c.json(
          { error: 'Frequency must be: weekly, biweekly, monthly, quarterly, or annually' },
          400
        )
      }
      updates.push('frequency = ?')
      params.push(frequency)
    }

    if (effectiveUntil !== undefined) {
      updates.push('effective_until = ?')
      params.push(effectiveUntil)
    }

    if (linkUrl !== undefined) {
      updates.push('link_url = ?')
      params.push(linkUrl)
    }

    if (memo !== undefined) {
      if (memo && memo.length > 500) {
        return c.json({ error: 'Memo must be 500 characters or less' }, 400)
      }
      updates.push('memo = ?')
      params.push(memo)
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }

    updates.push("updated_at = datetime('now')")
    params.push(fixedExpenseId)

    await c.env.DB.prepare(`UPDATE fixed_expenses SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run()

    // Fetch updated fixed expense
    const updatedFixedExpense = await c.env.DB.prepare('SELECT * FROM fixed_expenses WHERE id = ?')
      .bind(fixedExpenseId)
      .first<FixedExpense>()

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'fixed_expense.updated',
      'fixed_expense',
      fixedExpenseId,
      fixedExpense,
      updatedFixedExpense
    )

    return c.json({ success: true, fixedExpense: updatedFixedExpense })
  } catch (error) {
    console.error('Update fixed expense error:', error)
    return c.json({ error: 'Failed to update fixed expense' }, 500)
  }
})

// End fixed expense (set effective_until to today)
app.delete('/:id/fixed-expenses/:fixedExpenseId', async (c) => {
  const familyId = c.req.param('id')
  const fixedExpenseId = c.req.param('fixedExpenseId')
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
      return c.json({ error: "Not authorized to modify this family's fixed expenses" }, 403)
    }

    // Get the fixed expense
    const fixedExpense = await c.env.DB.prepare(
      'SELECT * FROM fixed_expenses WHERE id = ? AND family_id = ? AND deleted_at IS NULL'
    )
      .bind(fixedExpenseId, familyId)
      .first<FixedExpense>()

    if (!fixedExpense) {
      return c.json({ error: 'Fixed expense not found' }, 404)
    }

    // Set effective_until to today (end the template, don't hard delete)
    const today = getTodayDate()
    await c.env.DB.prepare(
      `UPDATE fixed_expenses SET effective_until = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(today, fixedExpenseId)
      .run()

    // Fetch updated fixed expense
    const updatedFixedExpense = await c.env.DB.prepare('SELECT * FROM fixed_expenses WHERE id = ?')
      .bind(fixedExpenseId)
      .first<FixedExpense>()

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'fixed_expense.ended',
      'fixed_expense',
      fixedExpenseId,
      fixedExpense,
      updatedFixedExpense
    )

    return c.json({ success: true, fixedExpense: updatedFixedExpense })
  } catch (error) {
    console.error('End fixed expense error:', error)
    return c.json({ error: 'Failed to end fixed expense' }, 500)
  }
})

export default app
