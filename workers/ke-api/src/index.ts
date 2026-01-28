import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface Env {
  DB: D1Database;
}

interface UserSyncRequest {
  id: string;
  email: string;
  name?: string | null;
}

interface CreateFamilyRequest {
  userId: string;
  name?: string;
}

interface JoinFamilyRequest {
  userId: string;
  inviteCode: string;
}

interface CreateExpenseRequest {
  description: string;
  amount: number; // in dollars, will be converted to cents
  category: 'school' | 'medical' | 'activities' | 'childcare' | 'other';
  expenseDate?: string; // ISO date string, defaults to today
  paidBy?: string; // defaults to current user
  linkUrl?: string;
  memo?: string;
}

interface Expense {
  id: string;
  family_id: string;
  created_by: string;
  paid_by: string;
  fixed_expense_id: string | null;
  description: string;
  amount_cents: number;
  category: string;
  expense_date: string;
  child_ids: string | null;
  link_url: string | null;
  memo: string | null;
  status: string;
  questioned_by: string | null;
  questioned_at: string | null;
  question_reason: string | null;
  question_note: string | null;
  resolved_at: string | null;
  resolution_action: string | null;
  satisfied_at: string | null;
  closed_unresolved_at: string | null;
  closed_unresolved_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface Family {
  id: string;
  name: string | null;
  parent_a_id: string;
  parent_b_id: string | null;
  parent_a_ratio: number;
  invite_code: string | null;
  invite_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Generate 8-character alphanumeric invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (I,O,0,1)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate UUID for IDs
function generateId(): string {
  return crypto.randomUUID();
}

// Get invite expiry date (7 days from now)
function getInviteExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString();
}

// Convert dollars to cents (multiply by 100 and round)
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// Get today's date in ISO format (YYYY-MM-DD)
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Create activity event
async function createActivityEvent(
  db: D1Database,
  familyId: string,
  userId: string,
  eventType: string,
  targetType: string,
  targetId: string,
  beforeSnapshot: unknown | null,
  afterSnapshot: unknown | null,
  metadata?: unknown
): Promise<void> {
  const id = generateId();
  await db.prepare(
    `INSERT INTO activity_events (id, family_id, user_id, event_type, target_type, target_id, before_snapshot, after_snapshot, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    id,
    familyId,
    userId,
    eventType,
    targetType,
    targetId,
    beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
    afterSnapshot ? JSON.stringify(afterSnapshot) : null,
    metadata ? JSON.stringify(metadata) : null
  ).run();
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
}));

// Health check
app.get('/health', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 as ok').first();
    return c.json({ status: 'ok', db: result?.ok === 1 ? 'connected' : 'error' });
  } catch (error) {
    return c.json({ status: 'error', db: 'disconnected', error: String(error) }, 500);
  }
});

// User sync endpoint - creates or updates user from Clerk
app.post('/users/sync', async (c) => {
  try {
    const body = await c.req.json<UserSyncRequest>();
    const { id, email, name } = body;

    if (!id || !email) {
      return c.json({ error: 'Missing required fields: id and email' }, 400);
    }

    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(id).first();

    if (existingUser) {
      await c.env.DB.prepare(
        `UPDATE users SET email = ?, name = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(email, name || null, id).run();

      return c.json({ success: true, action: 'updated', userId: id });
    } else {
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, name, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(id, email, name || null).run();

      return c.json({ success: true, action: 'created', userId: id });
    }
  } catch (error) {
    console.error('User sync error:', error);
    return c.json({ error: 'Failed to sync user', details: String(error) }, 500);
  }
});

// Get current user info with family context
app.get('/me', async (c) => {
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

  try {
    // Get user
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, created_at FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user's family (as parent_a or parent_b)
    const family = await c.env.DB.prepare(
      `SELECT id, name, parent_a_id, parent_b_id, parent_a_ratio,
              invite_code, invite_expires_at, created_at, updated_at
       FROM families
       WHERE parent_a_id = ? OR parent_b_id = ?`
    ).bind(userId, userId).first<Family>();

    return c.json({
      user,
      family: family || null,
      role: family ? (family.parent_a_id === userId ? 'parent_a' : 'parent_b') : null,
    });
  } catch (error) {
    console.error('Get /me error:', error);
    return c.json({ error: 'Failed to get user info', details: String(error) }, 500);
  }
});

// Create a new family
app.post('/families', async (c) => {
  try {
    const body = await c.req.json<CreateFamilyRequest>();
    const { userId, name } = body;

    if (!userId) {
      return c.json({ error: 'Missing required field: userId' }, 400);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if user already belongs to a family
    const existingFamily = await c.env.DB.prepare(
      'SELECT id FROM families WHERE parent_a_id = ? OR parent_b_id = ?'
    ).bind(userId, userId).first();

    if (existingFamily) {
      return c.json({ error: 'User already belongs to a family' }, 400);
    }

    const familyId = generateId();

    await c.env.DB.prepare(
      `INSERT INTO families (id, name, parent_a_id, parent_a_ratio, created_at, updated_at)
       VALUES (?, ?, ?, 0.5, datetime('now'), datetime('now'))`
    ).bind(familyId, name || null, userId).run();

    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    return c.json({ success: true, family }, 201);
  } catch (error) {
    console.error('Create family error:', error);
    return c.json({ error: 'Failed to create family', details: String(error) }, 500);
  }
});

// Get family details
app.get('/families/:id', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

  try {
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to view this family' }, 403);
    }

    // Get parent info
    const parentA = await c.env.DB.prepare(
      'SELECT id, email, name FROM users WHERE id = ?'
    ).bind(family.parent_a_id).first();

    let parentB = null;
    if (family.parent_b_id) {
      parentB = await c.env.DB.prepare(
        'SELECT id, email, name FROM users WHERE id = ?'
      ).bind(family.parent_b_id).first();
    }

    return c.json({
      family,
      parentA,
      parentB,
    });
  } catch (error) {
    console.error('Get family error:', error);
    return c.json({ error: 'Failed to get family', details: String(error) }, 500);
  }
});

// Generate invite code for a family
app.post('/families/:id/invite', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

  try {
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Only parent_a can generate invite code
    if (family.parent_a_id !== userId) {
      return c.json({ error: 'Only the family creator can generate invite codes' }, 403);
    }

    // Check if family already has parent_b
    if (family.parent_b_id) {
      return c.json({ error: 'Family already has two parents' }, 400);
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM families WHERE invite_code = ?'
      ).bind(inviteCode).first();

      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return c.json({ error: 'Failed to generate unique invite code' }, 500);
    }

    const expiresAt = getInviteExpiry();

    await c.env.DB.prepare(
      `UPDATE families SET invite_code = ?, invite_expires_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(inviteCode, expiresAt, familyId).run();

    return c.json({
      success: true,
      inviteCode,
      expiresAt,
    });
  } catch (error) {
    console.error('Generate invite error:', error);
    return c.json({ error: 'Failed to generate invite code', details: String(error) }, 500);
  }
});

// Join a family with invite code
app.post('/families/join', async (c) => {
  try {
    const body = await c.req.json<JoinFamilyRequest>();
    const { userId, inviteCode } = body;

    if (!userId || !inviteCode) {
      return c.json({ error: 'Missing required fields: userId and inviteCode' }, 400);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if user already belongs to a family
    const existingFamily = await c.env.DB.prepare(
      'SELECT id FROM families WHERE parent_a_id = ? OR parent_b_id = ?'
    ).bind(userId, userId).first();

    if (existingFamily) {
      return c.json({ error: 'User already belongs to a family' }, 400);
    }

    // Find family with invite code
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE invite_code = ?'
    ).bind(inviteCode.toUpperCase()).first<Family>();

    if (!family) {
      return c.json({ error: 'Invalid invite code' }, 400);
    }

    // Check if code is expired
    if (family.invite_expires_at) {
      const expiresAt = new Date(family.invite_expires_at);
      if (expiresAt < new Date()) {
        return c.json({ error: 'Invite code has expired' }, 400);
      }
    }

    // Check if family already has parent_b
    if (family.parent_b_id) {
      return c.json({ error: 'Family already has two parents' }, 400);
    }

    // Cannot join your own family
    if (family.parent_a_id === userId) {
      return c.json({ error: 'Cannot join your own family' }, 400);
    }

    // Join the family - set parent_b and nullify invite code
    await c.env.DB.prepare(
      `UPDATE families
       SET parent_b_id = ?, invite_code = NULL, invite_expires_at = NULL, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(userId, family.id).run();

    const updatedFamily = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(family.id).first<Family>();

    return c.json({
      success: true,
      family: updatedFamily,
    });
  } catch (error) {
    console.error('Join family error:', error);
    return c.json({ error: 'Failed to join family', details: String(error) }, 500);
  }
});

// Add expense to family
app.post('/families/:id/expenses', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

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
    const { description, amount, category, expenseDate, paidBy, linkUrl, memo } = body;

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

    await c.env.DB.prepare(
      `INSERT INTO expenses (
        id, family_id, created_by, paid_by, description, amount_cents, category,
        expense_date, link_url, memo, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', datetime('now'), datetime('now'))`
    ).bind(
      expenseId,
      familyId,
      userId,
      paidByUserId,
      description,
      amountCents,
      category,
      date,
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
app.get('/families/:id/expenses', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

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

// ============================================
// BALANCE ENDPOINT
// ============================================

interface Payment {
  id: string;
  family_id: string;
  paid_by: string;
  amount_cents: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface BalanceBreakdown {
  total_expenses_cents: number;
  included_expenses_count: number;
  a_share_cents: number;
  b_share_cents: number;
  a_paid_cents: number;
  b_paid_cents: number;
  payments_a_to_b_cents: number;
  payments_b_to_a_cents: number;
  questioned_total_cents: number;
  questioned_count: number;
}

// Get balance for family
app.get('/families/:id/balance', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

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

    // Get all included expenses (posted, resolved, resolved_creator_decided)
    const includedExpenses = await c.env.DB.prepare(
      `SELECT * FROM expenses
       WHERE family_id = ?
       AND deleted_at IS NULL
       AND status IN ('posted', 'resolved', 'resolved_creator_decided')`
    ).bind(familyId).all<Expense>();

    // Get questioned expenses for the metric
    const questionedExpenses = await c.env.DB.prepare(
      `SELECT * FROM expenses
       WHERE family_id = ?
       AND deleted_at IS NULL
       AND status IN ('questioned', 'pending_satisfaction')`
    ).bind(familyId).all<Expense>();

    // Get all payments
    const payments = await c.env.DB.prepare(
      `SELECT * FROM payments
       WHERE family_id = ?
       AND deleted_at IS NULL`
    ).bind(familyId).all<Payment>();

    // Calculate balance
    // Positive = A owes B, Negative = B owes A
    let balance = 0;
    let totalExpensesCents = 0;
    let aShareCents = 0;
    let bShareCents = 0;
    let aPaidCents = 0;
    let bPaidCents = 0;

    for (const expense of includedExpenses.results || []) {
      totalExpensesCents += expense.amount_cents;
      const aShare = Math.floor(expense.amount_cents * parentARatio);
      const bShare = expense.amount_cents - aShare;
      aShareCents += aShare;
      bShareCents += bShare;

      if (expense.paid_by === parentAId) {
        aPaidCents += expense.amount_cents;
        // A paid full amount, but only owes aShare
        // So A is owed (amount - aShare) = bShare from B
        // balance -= bShare means B owes A more
        balance += (aShare - expense.amount_cents);
      } else if (expense.paid_by === parentBId) {
        bPaidCents += expense.amount_cents;
        // B paid full amount, but only owes bShare
        // So B is owed (amount - bShare) = aShare from A
        // balance += aShare means A owes B more
        balance += aShare;
      }
    }

    // Calculate payments
    let paymentsAToBCents = 0;
    let paymentsBToACents = 0;

    for (const payment of payments.results || []) {
      if (payment.paid_by === parentAId) {
        // A paid B, reduces A's debt to B
        paymentsAToBCents += payment.amount_cents;
        balance -= payment.amount_cents;
      } else if (payment.paid_by === parentBId) {
        // B paid A, increases A's debt to B (or reduces B's debt to A)
        paymentsBToACents += payment.amount_cents;
        balance += payment.amount_cents;
      }
    }

    // Calculate questioned totals
    let questionedTotalCents = 0;
    for (const expense of questionedExpenses.results || []) {
      questionedTotalCents += expense.amount_cents;
    }

    // Determine payer and payee
    let payerId: string | null = null;
    let payeeId: string | null = null;

    if (balance > 0) {
      // A owes B
      payerId = parentAId;
      payeeId = parentBId;
    } else if (balance < 0) {
      // B owes A
      payerId = parentBId;
      payeeId = parentAId;
    }

    const breakdown: BalanceBreakdown = {
      total_expenses_cents: totalExpensesCents,
      included_expenses_count: (includedExpenses.results || []).length,
      a_share_cents: aShareCents,
      b_share_cents: bShareCents,
      a_paid_cents: aPaidCents,
      b_paid_cents: bPaidCents,
      payments_a_to_b_cents: paymentsAToBCents,
      payments_b_to_a_cents: paymentsBToACents,
      questioned_total_cents: questionedTotalCents,
      questioned_count: (questionedExpenses.results || []).length,
    };

    return c.json({
      balance_cents: Math.abs(balance),
      payer_id: payerId,
      payee_id: payeeId,
      parent_a_id: parentAId,
      parent_b_id: parentBId,
      breakdown,
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return c.json({ error: 'Failed to get balance', details: String(error) }, 500);
  }
});

// ============================================
// CHILDREN ENDPOINTS
// ============================================

interface Child {
  id: string;
  family_id: string;
  name: string;
  created_at: string;
  deleted_at: string | null;
}

interface CreateChildRequest {
  name: string;
}

// Create a child for a family
app.post('/families/:id/children', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

  try {
    const body = await c.req.json<CreateChildRequest>();
    const { name } = body;

    // Validate name
    if (!name || typeof name !== 'string') {
      return c.json({ error: 'Name is required' }, 400);
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return c.json({ error: 'Name must be between 1 and 100 characters' }, 400);
    }

    // Check if family exists
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this family' }, 403);
    }

    const childId = generateId();

    // Create the child
    await c.env.DB.prepare(
      `INSERT INTO children (id, family_id, name, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).bind(childId, familyId, trimmedName).run();

    // Log activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'child.created',
      'child',
      childId,
      null,
      { name: trimmedName }
    );

    const child = await c.env.DB.prepare(
      'SELECT * FROM children WHERE id = ?'
    ).bind(childId).first<Child>();

    return c.json(child, 201);
  } catch (error) {
    console.error('Create child error:', error);
    return c.json({ error: 'Failed to create child', details: String(error) }, 500);
  }
});

// Get all children for a family
app.get('/families/:id/children', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.req.header('X-User-Id');
  const includeDeleted = c.req.query('include_deleted') === 'true';

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

  try {
    // Check if family exists
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this family' }, 403);
    }

    // Fetch children
    let query = 'SELECT * FROM children WHERE family_id = ?';
    if (!includeDeleted) {
      query += ' AND deleted_at IS NULL';
    }
    query += ' ORDER BY created_at ASC';

    const result = await c.env.DB.prepare(query).bind(familyId).all<Child>();

    return c.json({
      children: result.results,
      count: result.results.length,
    });
  } catch (error) {
    console.error('Get children error:', error);
    return c.json({ error: 'Failed to get children', details: String(error) }, 500);
  }
});

// Soft-delete a child
app.delete('/families/:id/children/:childId', async (c) => {
  const familyId = c.req.param('id');
  const childId = c.req.param('childId');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

  try {
    // Check if family exists
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this family' }, 403);
    }

    // Check if child exists and belongs to this family
    const child = await c.env.DB.prepare(
      'SELECT * FROM children WHERE id = ? AND family_id = ?'
    ).bind(childId, familyId).first<Child>();

    if (!child) {
      return c.json({ error: 'Child not found' }, 404);
    }

    // Check if already deleted
    if (child.deleted_at) {
      return c.json({ error: 'Child is already deleted' }, 400);
    }

    // Soft delete
    await c.env.DB.prepare(
      `UPDATE children SET deleted_at = datetime('now') WHERE id = ?`
    ).bind(childId).run();

    // Log activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'child.deleted',
      'child',
      childId,
      { name: child.name },
      null
    );

    const updatedChild = await c.env.DB.prepare(
      'SELECT id, deleted_at FROM children WHERE id = ?'
    ).bind(childId).first();

    return c.json(updatedChild);
  } catch (error) {
    console.error('Delete child error:', error);
    return c.json({ error: 'Failed to delete child', details: String(error) }, 500);
  }
});

// API info
app.get('/', (c) => {
  return c.json({
    name: 'ke-api',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/users/sync',
      '/me',
      '/families',
      '/families/:id',
      '/families/:id/invite',
      '/families/join',
      '/families/:id/expenses',
      '/families/:id/balance',
      '/families/:id/children',
      '/families/:id/children/:childId',
    ],
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
