import { Hono } from 'hono';
import {
  dollarsToCents,
  calculateBalanceFromData,
  type Expense as CalcExpense,
  type Payment as CalcPayment,
} from '../calculations';
import type {
  AppType,
  CreateExpenseRequest,
  Expense,
  Family,
  Payment,
  BalanceBreakdown,
} from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId, getTodayDate } from '../utils';
import { createActivityEvent } from '../services/activity';

const app = new Hono<AppType>();

app.use('*', authMiddleware);

// Add expense to family
app.post('/:id/expenses', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.get('userId');

  try {
    // Verify family exists and user belongs to it
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to add expenses to this family' }, 403);
    }

    const body = await c.req.json<CreateExpenseRequest>();
    const { description, amount, category, expenseDate, paidBy, linkUrl, memo, childIds } = body;

    // Validate required fields
    if (!description || description.length === 0) {
      return c.json({ error: 'Description is required' }, 400);
    }
    if (description.length > 200) {
      return c.json({ error: 'Description must be 200 characters or less' }, 400);
    }
    if (typeof amount !== 'number') {
      return c.json({ error: 'Amount is required and must be a number' }, 400);
    }
    if (!category || !['school', 'medical', 'activities', 'childcare', 'other'].includes(category)) {
      return c.json({ error: 'Category is required and must be: school, medical, activities, childcare, or other' }, 400);
    }
    if (memo && memo.length > 500) {
      return c.json({ error: 'Memo must be 500 characters or less' }, 400);
    }

    // Validate paidBy if provided
    const paidByUserId = paidBy || userId;
    if (paidByUserId !== family.parent_a_id && paidByUserId !== family.parent_b_id) {
      return c.json({ error: 'paidBy must be a member of the family' }, 400);
    }

    const expenseId = generateId();
    const amountCents = dollarsToCents(amount);
    const date = expenseDate || getTodayDate();
    // Convert childIds array to JSON string for storage
    const childIdsJson = childIds && childIds.length > 0 ? JSON.stringify(childIds) : null;

    await c.env.DB.prepare(
      `INSERT INTO expenses (
        id, family_id, created_by, paid_by, description, amount_cents, category,
        expense_date, child_ids, link_url, memo, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', datetime('now'), datetime('now'))`
    ).bind(
      expenseId,
      familyId,
      userId,
      paidByUserId,
      description,
      amountCents,
      category,
      date,
      childIdsJson,
      linkUrl || null,
      memo || null
    ).run();

    // Fetch the created expense
    const expense = await c.env.DB.prepare(
      'SELECT * FROM expenses WHERE id = ?'
    ).bind(expenseId).first<Expense>();

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'expense.created',
      'expense',
      expenseId,
      null,
      expense
    );

    return c.json({ success: true, expense }, 201);
  } catch (error) {
    console.error('Create expense error:', error);
    return c.json({ error: 'Failed to create expense', details: String(error) }, 500);
  }
});

// List expenses for family
app.get('/:id/expenses', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.get('userId');

  try {
    // Verify family exists and user belongs to it
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to view this family\'s expenses' }, 403);
    }

    // Get query parameters for filtering
    const status = c.req.query('status');
    const category = c.req.query('category');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Build query
    let query = 'SELECT * FROM expenses WHERE family_id = ? AND deleted_at IS NULL';
    const params: (string | number)[] = [familyId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (startDate) {
      query += ' AND expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND expense_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY expense_date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all<Expense>();

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as count FROM expenses WHERE family_id = ? AND deleted_at IS NULL';
    const countParams: (string | number)[] = [familyId];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    if (startDate) {
      countQuery += ' AND expense_date >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND expense_date <= ?';
      countParams.push(endDate);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();

    return c.json({
      expenses: result.results || [],
      pagination: {
        total: countResult?.count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('List expenses error:', error);
    return c.json({ error: 'Failed to list expenses', details: String(error) }, 500);
  }
});

// Get balance for family
app.get('/:id/balance', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.get('userId');

  try {
    // Verify family exists and user belongs to it
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to view this family\'s balance' }, 403);
    }

    const parentARatio = family.parent_a_ratio;
    const parentAId = family.parent_a_id;
    const parentBId = family.parent_b_id;

    // Get current period (calendar month) boundaries
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const periodEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    // Get current period expenses (posted, resolved, resolved_creator_decided)
    const currentPeriodExpenses = await c.env.DB.prepare(
      `SELECT * FROM expenses
       WHERE family_id = ?
       AND deleted_at IS NULL
       AND status IN ('posted', 'resolved', 'resolved_creator_decided')
       AND expense_date >= ? AND expense_date < ?`
    ).bind(familyId, periodStart, periodEnd).all<Expense>();

    // Get prior period expenses (before current period)
    const priorPeriodExpenses = await c.env.DB.prepare(
      `SELECT * FROM expenses
       WHERE family_id = ?
       AND deleted_at IS NULL
       AND status IN ('posted', 'resolved', 'resolved_creator_decided')
       AND expense_date < ?`
    ).bind(familyId, periodStart).all<Expense>();

    // Get current period payments
    const currentPeriodPayments = await c.env.DB.prepare(
      `SELECT * FROM payments
       WHERE family_id = ?
       AND deleted_at IS NULL
       AND payment_date >= ? AND payment_date < ?`
    ).bind(familyId, periodStart, periodEnd).all<Payment>();

    // Get prior period payments
    const priorPeriodPayments = await c.env.DB.prepare(
      `SELECT * FROM payments
       WHERE family_id = ?
       AND deleted_at IS NULL
       AND payment_date < ?`
    ).bind(familyId, periodStart).all<Payment>();

    // Get all included expenses for overall totals
    const allIncludedExpenses = await c.env.DB.prepare(
      `SELECT * FROM expenses
       WHERE family_id = ?
       AND deleted_at IS NULL
       AND status IN ('posted', 'resolved', 'resolved_creator_decided')`
    ).bind(familyId).all<Expense>();

    // Get all payments
    const allPayments = await c.env.DB.prepare(
      `SELECT * FROM payments
       WHERE family_id = ?
       AND deleted_at IS NULL`
    ).bind(familyId).all<Payment>();

    // Get questioned expenses for the metric
    const questionedExpenses = await c.env.DB.prepare(
      `SELECT * FROM expenses
       WHERE family_id = ?
       AND deleted_at IS NULL
       AND status IN ('questioned', 'pending_satisfaction')`
    ).bind(familyId).all<Expense>();

    // Calculate current period breakdown per parent
    const currentExpensesList = currentPeriodExpenses.results || [];
    const currentPaymentsList = currentPeriodPayments.results || [];

    // Parent A's expenses and payments this period
    let aExpensesThisPeriod = 0;
    let aPaymentsThisPeriod = 0;
    let bExpensesThisPeriod = 0;
    let bPaymentsThisPeriod = 0;

    for (const expense of currentExpensesList) {
      if (expense.paid_by === parentAId) {
        aExpensesThisPeriod += expense.amount_cents;
      } else if (expense.paid_by === parentBId) {
        bExpensesThisPeriod += expense.amount_cents;
      }
    }

    for (const payment of currentPaymentsList) {
      if (payment.paid_by === parentAId) {
        aPaymentsThisPeriod += payment.amount_cents;
      } else if (payment.paid_by === parentBId) {
        bPaymentsThisPeriod += payment.amount_cents;
      }
    }

    // Calculate prior period balance (rollover)
    const priorCalc = calculateBalanceFromData(
      priorPeriodExpenses.results || [],
      priorPeriodPayments.results || [],
      parentAId,
      parentBId,
      parentARatio
    );

    // Calculate overall balance
    const overallCalc = calculateBalanceFromData(
      allIncludedExpenses.results || [],
      allPayments.results || [],
      parentAId,
      parentBId,
      parentARatio
    );

    // Calculate questioned totals
    let questionedTotalCents = 0;
    for (const expense of questionedExpenses.results || []) {
      questionedTotalCents += expense.amount_cents;
    }

    // Determine payer and payee
    let payerId: string | null = null;
    let payeeId: string | null = null;

    if (overallCalc.balance > 0) {
      // A owes B
      payerId = parentAId;
      payeeId = parentBId;
    } else if (overallCalc.balance < 0) {
      // B owes A
      payerId = parentBId;
      payeeId = parentAId;
    }

    // Prior balance: positive means A owes B, negative means B owes A
    let priorPayerId: string | null = null;
    let priorPayeeId: string | null = null;
    if (priorCalc.balance > 0) {
      priorPayerId = parentAId;
      priorPayeeId = parentBId;
    } else if (priorCalc.balance < 0) {
      priorPayerId = parentBId;
      priorPayeeId = parentAId;
    }

    const breakdown: BalanceBreakdown = {
      total_expenses_cents: overallCalc.totalExpensesCents,
      included_expenses_count: (allIncludedExpenses.results || []).length,
      a_share_cents: overallCalc.aShareCents,
      b_share_cents: overallCalc.bShareCents,
      a_paid_cents: overallCalc.aPaidCents,
      b_paid_cents: overallCalc.bPaidCents,
      payments_a_to_b_cents: overallCalc.paymentsAToBCents,
      payments_b_to_a_cents: overallCalc.paymentsBToACents,
      questioned_total_cents: questionedTotalCents,
      questioned_count: (questionedExpenses.results || []).length,
    };

    return c.json({
      balance_cents: Math.abs(overallCalc.balance),
      payer_id: payerId,
      payee_id: payeeId,
      parent_a_id: parentAId,
      parent_b_id: parentBId,
      breakdown,
      // Period-based breakdown
      period: {
        start: periodStart,
        end: periodEnd,
        label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      },
      current_period: {
        a_expenses_cents: aExpensesThisPeriod,
        a_payments_cents: aPaymentsThisPeriod,
        b_expenses_cents: bExpensesThisPeriod,
        b_payments_cents: bPaymentsThisPeriod,
      },
      prior_balance: {
        balance_cents: Math.abs(priorCalc.balance),
        payer_id: priorPayerId,
        payee_id: priorPayeeId,
      },
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return c.json({ error: 'Failed to get balance', details: String(error) }, 500);
  }
});

export default app;
