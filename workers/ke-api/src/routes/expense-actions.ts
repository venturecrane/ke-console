import { Hono } from 'hono'
import { dollarsToCents } from '../calculations'
import type {
  AppType,
  Expense,
  Family,
  QuestionReason,
  QuestionExpenseRequest,
  ResolveExpenseRequest,
  EditExpenseRequest,
} from '../types'
import { authMiddleware } from '../middleware/auth'
import { createActivityEvent, applyTimeoutChecks } from '../services/activity'
import { sendNotification } from '../services/notifications'

const app = new Hono<AppType>()

app.use('*', authMiddleware)

// Get single expense (with timeout check)
app.get('/:id', async (c) => {
  const expenseId = c.req.param('id')
  const userId = c.get('userId')

  try {
    let expense = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?')
      .bind(expenseId)
      .first<Expense>()

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404)
    }

    // Get the family
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(expense.family_id)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403)
    }

    // Apply on-read timeout checks (7-day + 30-day)
    expense = await applyTimeoutChecks(c.env.DB, expense)

    return c.json({ expense })
  } catch (error) {
    console.error('Get expense error:', error)
    return c.json({ error: 'Failed to get expense' }, 500)
  }
})

// Question an expense (dispute initiation)
app.post('/:id/question', async (c) => {
  const expenseId = c.req.param('id')
  const userId = c.get('userId')

  try {
    // Get the expense
    const expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(expenseId)
      .first<Expense>()

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404)
    }

    // Get the family
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(expense.family_id)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403)
    }

    // Cannot question your own expense
    if (expense.created_by === userId) {
      return c.json({ error: 'Cannot question your own expense' }, 400)
    }

    // Cannot question if already questioned or resolved
    if (expense.status !== 'posted') {
      return c.json({ error: `Cannot question expense with status '${expense.status}'` }, 400)
    }

    // Parse request body
    const body = await c.req.json<QuestionExpenseRequest>()
    const { reason, note } = body

    // Validate reason
    const validReasons: QuestionReason[] = [
      'wrong_amount',
      'not_child_related',
      'duplicate',
      'split_dispute',
      'other',
    ]
    if (!reason || !validReasons.includes(reason)) {
      return c.json(
        {
          error:
            'Valid reason is required: wrong_amount, not_child_related, duplicate, split_dispute, or other',
        },
        400
      )
    }

    // Update expense
    await c.env.DB.prepare(
      `UPDATE expenses SET
        status = 'questioned',
        questioned_by = ?,
        questioned_at = datetime('now'),
        question_reason = ?,
        question_note = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(userId, reason, note || null, expenseId)
      .run()

    // Fetch updated expense
    const updatedExpense = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?')
      .bind(expenseId)
      .first<Expense>()

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      expense.family_id,
      userId,
      'expense.questioned',
      'expense',
      expenseId,
      expense,
      updatedExpense,
      { reason, note }
    )

    // Notify expense creator (BR-055: notify the OTHER parent)
    if (expense.created_by !== userId) {
      const actor = await c.env.DB.prepare('SELECT name, email FROM users WHERE id = ?')
        .bind(userId)
        .first<{ name: string | null; email: string }>()

      sendNotification(
        c.env.DB,
        c.env,
        expense.created_by,
        expense.family_id,
        'expense_questioned',
        {
          description: expense.description,
          reason,
          actor_name: actor?.name || actor?.email || 'Your co-parent',
        }
      ).catch(() => {})
    }

    return c.json({ success: true, expense: updatedExpense })
  } catch (error) {
    console.error('Question expense error:', error)
    return c.json({ error: 'Failed to question expense' }, 500)
  }
})

// Resolve a questioned expense (creator response)
app.post('/:id/resolve', async (c) => {
  const expenseId = c.req.param('id')
  const userId = c.get('userId')

  try {
    // Get the expense
    const expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(expenseId)
      .first<Expense>()

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404)
    }

    // Get the family
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(expense.family_id)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403)
    }

    // Only creator can resolve
    if (expense.created_by !== userId) {
      return c.json({ error: 'Only the expense creator can resolve' }, 403)
    }

    // Must be in questioned status
    if (expense.status !== 'questioned') {
      return c.json({ error: `Cannot resolve expense with status '${expense.status}'` }, 400)
    }

    // Parse request body
    const body = await c.req.json<ResolveExpenseRequest>()
    const { action, newAmount } = body

    // Validate action
    const validActions = ['keep', 'edit', 'personal', 'delete']
    if (!action || !validActions.includes(action)) {
      return c.json({ error: 'Valid action is required: keep, edit, personal, or delete' }, 400)
    }

    // Handle edit action
    if (action === 'edit' && (typeof newAmount !== 'number' || newAmount <= 0)) {
      return c.json({ error: 'newAmount is required for edit action and must be positive' }, 400)
    }

    let newStatus: string
    let newAmountCents = expense.amount_cents
    let resolvedAt: string | null = null
    let deletedAt: string | null = null

    switch (action) {
      case 'keep':
        newStatus = 'pending_satisfaction'
        resolvedAt = new Date().toISOString()
        break
      case 'edit':
        newStatus = 'pending_satisfaction'
        newAmountCents = dollarsToCents(newAmount!)
        resolvedAt = new Date().toISOString()
        break
      case 'personal':
        newStatus = 'resolved_personal'
        resolvedAt = new Date().toISOString()
        break
      case 'delete':
        newStatus = 'resolved_deleted'
        resolvedAt = new Date().toISOString()
        deletedAt = new Date().toISOString()
        break
      default:
        newStatus = 'questioned'
    }

    // Update expense
    await c.env.DB.prepare(
      `UPDATE expenses SET
        status = ?,
        amount_cents = ?,
        resolution_action = ?,
        resolved_at = ?,
        deleted_at = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(newStatus, newAmountCents, action, resolvedAt, deletedAt, expenseId)
      .run()

    // Fetch updated expense
    const updatedExpense = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?')
      .bind(expenseId)
      .first<Expense>()

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      expense.family_id,
      userId,
      'expense.resolved',
      'expense',
      expenseId,
      expense,
      updatedExpense,
      { action, newAmount: action === 'edit' ? newAmount : undefined }
    )

    // Notify the questioner (BR-055: notify the OTHER parent)
    if (expense.questioned_by && expense.questioned_by !== userId) {
      const actor = await c.env.DB.prepare('SELECT name, email FROM users WHERE id = ?')
        .bind(userId)
        .first<{ name: string | null; email: string }>()

      sendNotification(
        c.env.DB,
        c.env,
        expense.questioned_by,
        expense.family_id,
        'question_resolved',
        {
          description: expense.description,
          action,
          actor_name: actor?.name || actor?.email || 'The expense creator',
        }
      ).catch(() => {})
    }

    return c.json({ success: true, expense: updatedExpense })
  } catch (error) {
    console.error('Resolve expense error:', error)
    return c.json({ error: 'Failed to resolve expense' }, 500)
  }
})

// Satisfy a resolved expense (questioner confirms)
app.post('/:id/satisfy', async (c) => {
  const expenseId = c.req.param('id')
  const userId = c.get('userId')

  try {
    // Get the expense
    let expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(expenseId)
      .first<Expense>()

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404)
    }

    // Apply on-read timeout checks (7-day + 30-day)
    expense = await applyTimeoutChecks(c.env.DB, expense)

    // Get the family
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(expense.family_id)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403)
    }

    // Only questioner can satisfy
    if (expense.questioned_by !== userId) {
      return c.json({ error: 'Only the original questioner can mark as satisfied' }, 403)
    }

    // Must be in pending_satisfaction status
    if (expense.status !== 'pending_satisfaction') {
      return c.json({ error: `Cannot satisfy expense with status '${expense.status}'` }, 400)
    }

    // Update expense
    await c.env.DB.prepare(
      `UPDATE expenses SET
        status = 'resolved',
        satisfied_at = datetime('now'),
        updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(expenseId)
      .run()

    // Fetch updated expense
    const updatedExpense = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?')
      .bind(expenseId)
      .first<Expense>()

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      expense.family_id,
      userId,
      'expense.satisfied',
      'expense',
      expenseId,
      expense,
      updatedExpense
    )

    return c.json({ success: true, expense: updatedExpense })
  } catch (error) {
    console.error('Satisfy expense error:', error)
    return c.json({ error: 'Failed to satisfy expense' }, 500)
  }
})

// Edit own posted expense (creator only, posted status only)
app.patch('/:id', async (c) => {
  const expenseId = c.req.param('id')
  const userId = c.get('userId')

  try {
    // Get the expense
    const expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(expenseId)
      .first<Expense>()

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404)
    }

    // Get the family
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(expense.family_id)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403)
    }

    // Only creator can edit
    if (expense.created_by !== userId) {
      return c.json({ error: 'Only the expense creator can edit' }, 403)
    }

    // Can only edit posted expenses
    if (expense.status !== 'posted') {
      return c.json({ error: `Cannot edit expense with status '${expense.status}'` }, 400)
    }

    const body = await c.req.json<EditExpenseRequest>()
    const { description, amount, category, expenseDate, paidBy, memo, linkUrl, childIds } = body

    // Build update query dynamically
    const updates: string[] = []
    const params: (string | number | null)[] = []

    if (description !== undefined) {
      if (!description || description.length === 0) {
        return c.json({ error: 'Description cannot be empty' }, 400)
      }
      if (description.length > 200) {
        return c.json({ error: 'Description must be 200 characters or less' }, 400)
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

    if (expenseDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
        return c.json({ error: 'expenseDate must be in YYYY-MM-DD format' }, 400)
      }
      updates.push('expense_date = ?')
      params.push(expenseDate)
    }

    if (paidBy !== undefined) {
      if (paidBy !== family.parent_a_id && paidBy !== family.parent_b_id) {
        return c.json({ error: 'paidBy must be a member of the family' }, 400)
      }
      updates.push('paid_by = ?')
      params.push(paidBy)
    }

    if (memo !== undefined) {
      if (memo && memo.length > 500) {
        return c.json({ error: 'Memo must be 500 characters or less' }, 400)
      }
      updates.push('memo = ?')
      params.push(memo)
    }

    if (linkUrl !== undefined) {
      updates.push('link_url = ?')
      params.push(linkUrl)
    }

    if (childIds !== undefined) {
      updates.push('child_ids = ?')
      params.push(childIds && childIds.length > 0 ? JSON.stringify(childIds) : null)
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }

    // Re-check status before update to handle race condition
    // (co-parent may have questioned between our read and write)
    const freshExpense = await c.env.DB.prepare(
      'SELECT status FROM expenses WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(expenseId)
      .first<{ status: string }>()

    if (!freshExpense || freshExpense.status !== 'posted') {
      return c.json({ error: 'Expense status changed — it may have been questioned' }, 409)
    }

    updates.push("updated_at = datetime('now')")
    params.push(expenseId)

    await c.env.DB.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run()

    // Fetch updated expense
    const updatedExpense = await c.env.DB.prepare('SELECT * FROM expenses WHERE id = ?')
      .bind(expenseId)
      .first<Expense>()

    // Create activity event with before/after snapshots
    await createActivityEvent(
      c.env.DB,
      expense.family_id,
      userId,
      'expense.edited',
      'expense',
      expenseId,
      expense,
      updatedExpense
    )

    return c.json({ success: true, expense: updatedExpense })
  } catch (error) {
    console.error('Edit expense error:', error)
    return c.json({ error: 'Failed to edit expense' }, 500)
  }
})

// Delete own posted expense (creator only, posted status only)
app.delete('/:id', async (c) => {
  const expenseId = c.req.param('id')
  const userId = c.get('userId')

  try {
    // Get the expense
    const expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(expenseId)
      .first<Expense>()

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404)
    }

    // Get the family
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(expense.family_id)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403)
    }

    // Only creator can delete
    if (expense.created_by !== userId) {
      return c.json({ error: 'Only the expense creator can delete' }, 403)
    }

    // Can only delete posted expenses
    if (expense.status !== 'posted') {
      return c.json({ error: `Cannot delete expense with status '${expense.status}'` }, 400)
    }

    // Soft delete
    await c.env.DB.prepare(
      `UPDATE expenses SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    )
      .bind(expenseId)
      .run()

    // Create activity event with full snapshot before deletion
    await createActivityEvent(
      c.env.DB,
      expense.family_id,
      userId,
      'expense.deleted',
      'expense',
      expenseId,
      expense,
      null
    )

    return c.json({ success: true, id: expenseId })
  } catch (error) {
    console.error('Delete expense error:', error)
    return c.json({ error: 'Failed to delete expense' }, 500)
  }
})

export default app
