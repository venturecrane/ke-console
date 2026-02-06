import { Hono } from 'hono';
import { dollarsToCents } from '../calculations';
import type {
  AppType,
  Expense,
  Family,
  QuestionReason,
  QuestionExpenseRequest,
  ResolveExpenseRequest,
} from '../types';
import { authMiddleware } from '../middleware/auth';
import { createActivityEvent, checkAndApplyTimeout } from '../services/activity';

const app = new Hono<AppType>();

app.use('*', authMiddleware);

// Get single expense (with timeout check)
app.get('/:id', async (c) => {
  const expenseId = c.req.param('id');
  const userId = c.get('userId');

  try {
    let expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ?'
    ).bind(expenseId).first<Expense>();

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    // Get the family
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(expense.family_id).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403);
    }

    // Check for 7-day timeout
    expense = await checkAndApplyTimeout(c.env.DB, expense);

    return c.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    return c.json({ error: 'Failed to get expense', details: String(error) }, 500);
  }
});

// Question an expense (dispute initiation)
app.post('/:id/question', async (c) => {
  const expenseId = c.req.param('id');
  const userId = c.get('userId');

  try {
    // Get the expense
    const expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
    ).bind(expenseId).first<Expense>();

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    // Get the family
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(expense.family_id).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403);
    }

    // Cannot question your own expense
    if (expense.created_by === userId) {
      return c.json({ error: 'Cannot question your own expense' }, 400);
    }

    // Cannot question if already questioned or resolved
    if (expense.status !== 'posted') {
      return c.json({ error: `Cannot question expense with status '${expense.status}'` }, 400);
    }

    // Parse request body
    const body = await c.req.json<QuestionExpenseRequest>();
    const { reason, note } = body;

    // Validate reason
    const validReasons: QuestionReason[] = ['wrong_amount', 'not_child_related', 'duplicate', 'split_dispute', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return c.json({ error: 'Valid reason is required: wrong_amount, not_child_related, duplicate, split_dispute, or other' }, 400);
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
    ).bind(userId, reason, note || null, expenseId).run();

    // Fetch updated expense
    const updatedExpense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ?'
    ).bind(expenseId).first<Expense>();

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
    );

    return c.json({ success: true, expense: updatedExpense });
  } catch (error) {
    console.error('Question expense error:', error);
    return c.json({ error: 'Failed to question expense', details: String(error) }, 500);
  }
});

// Resolve a questioned expense (creator response)
app.post('/:id/resolve', async (c) => {
  const expenseId = c.req.param('id');
  const userId = c.get('userId');

  try {
    // Get the expense
    const expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
    ).bind(expenseId).first<Expense>();

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    // Get the family
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(expense.family_id).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403);
    }

    // Only creator can resolve
    if (expense.created_by !== userId) {
      return c.json({ error: 'Only the expense creator can resolve' }, 403);
    }

    // Must be in questioned status
    if (expense.status !== 'questioned') {
      return c.json({ error: `Cannot resolve expense with status '${expense.status}'` }, 400);
    }

    // Parse request body
    const body = await c.req.json<ResolveExpenseRequest>();
    const { action, newAmount } = body;

    // Validate action
    const validActions = ['keep', 'edit', 'personal', 'delete'];
    if (!action || !validActions.includes(action)) {
      return c.json({ error: 'Valid action is required: keep, edit, personal, or delete' }, 400);
    }

    // Handle edit action
    if (action === 'edit' && (typeof newAmount !== 'number' || newAmount <= 0)) {
      return c.json({ error: 'newAmount is required for edit action and must be positive' }, 400);
    }

    let newStatus: string;
    let newAmountCents = expense.amount_cents;
    let resolvedAt: string | null = null;
    let deletedAt: string | null = null;

    switch (action) {
      case 'keep':
        newStatus = 'pending_satisfaction';
        resolvedAt = new Date().toISOString();
        break;
      case 'edit':
        newStatus = 'pending_satisfaction';
        newAmountCents = dollarsToCents(newAmount!);
        resolvedAt = new Date().toISOString();
        break;
      case 'personal':
        newStatus = 'resolved_personal';
        resolvedAt = new Date().toISOString();
        break;
      case 'delete':
        newStatus = 'resolved_deleted';
        resolvedAt = new Date().toISOString();
        deletedAt = new Date().toISOString();
        break;
      default:
        newStatus = 'questioned';
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
    ).bind(newStatus, newAmountCents, action, resolvedAt, deletedAt, expenseId).run();

    // Fetch updated expense
    const updatedExpense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ?'
    ).bind(expenseId).first<Expense>();

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
    );

    return c.json({ success: true, expense: updatedExpense });
  } catch (error) {
    console.error('Resolve expense error:', error);
    return c.json({ error: 'Failed to resolve expense', details: String(error) }, 500);
  }
});

// Satisfy a resolved expense (questioner confirms)
app.post('/:id/satisfy', async (c) => {
  const expenseId = c.req.param('id');
  const userId = c.get('userId');

  try {
    // Get the expense
    let expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL'
    ).bind(expenseId).first<Expense>();

    if (!expense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    // Check for 7-day timeout
    expense = await checkAndApplyTimeout(c.env.DB, expense);

    // Get the family
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(expense.family_id).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Check user belongs to family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this expense' }, 403);
    }

    // Only questioner can satisfy
    if (expense.questioned_by !== userId) {
      return c.json({ error: 'Only the original questioner can mark as satisfied' }, 403);
    }

    // Must be in pending_satisfaction status
    if (expense.status !== 'pending_satisfaction') {
      return c.json({ error: `Cannot satisfy expense with status '${expense.status}'` }, 400);
    }

    // Update expense
    await c.env.DB.prepare(
      `UPDATE expenses SET
        status = 'resolved',
        satisfied_at = datetime('now'),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(expenseId).run();

    // Fetch updated expense
    const updatedExpense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ?'
    ).bind(expenseId).first<Expense>();

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
    );

    return c.json({ success: true, expense: updatedExpense });
  } catch (error) {
    console.error('Satisfy expense error:', error);
    return c.json({ error: 'Failed to satisfy expense', details: String(error) }, 500);
  }
});

export default app;
