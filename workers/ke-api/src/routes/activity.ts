import { Hono } from 'hono';
import type { AppType, Family, ActivityEventWithUser } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<AppType>();

app.use('*', authMiddleware);

// Get activity feed for family
app.get('/:id/activity', async (c) => {
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
      return c.json({ error: 'Not authorized to view this family\'s activity' }, 403);
    }

    const rawLimit = parseInt(c.req.query('limit') || '20');
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const offset = parseInt(c.req.query('offset') || '0');
    const typeFilter = c.req.query('type'); // expenses, payments, fixed_expenses, disputes, children
    const search = c.req.query('search');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const expenseId = c.req.query('expense_id');

    // Build query with filters
    let query = `SELECT ae.*, u.email as user_email, u.name as user_name
       FROM activity_events ae
       LEFT JOIN users u ON ae.user_id = u.id
       WHERE ae.family_id = ?`;
    const params: (string | number)[] = [familyId];

    // Expense ID filter - scope activity to a single expense
    if (expenseId) {
      query += ` AND ae.target_id = ?`;
      params.push(expenseId);
    }

    // Type filter - map category to event types
    if (typeFilter) {
      let eventTypes: string[] = [];
      switch (typeFilter) {
        case 'expenses':
          eventTypes = ['expense.created', 'expense.edited', 'expense.generated'];
          break;
        case 'payments':
          eventTypes = ['payment.created'];
          break;
        case 'fixed_expenses':
          eventTypes = ['fixed_expense.created', 'fixed_expense.updated', 'fixed_expense.ended'];
          break;
        case 'disputes':
          eventTypes = ['expense.questioned', 'expense.resolved', 'expense.satisfied'];
          break;
        case 'children':
          eventTypes = ['child.created', 'child.deleted'];
          break;
      }
      if (eventTypes.length > 0) {
        query += ` AND ae.event_type IN (${eventTypes.map(() => '?').join(', ')})`;
        params.push(...eventTypes);
      }
    }

    // Date filters
    if (startDate) {
      query += ` AND ae.created_at >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      // Add time to include the whole end date
      query += ` AND ae.created_at <= ?`;
      params.push(endDate + 'T23:59:59.999Z');
    }

    // Search filter - search in JSON snapshots
    if (search) {
      query += ` AND (ae.after_snapshot LIKE ? OR ae.before_snapshot LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY ae.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Get activity events with user info
    const result = await c.env.DB.prepare(query).bind(...params).all<ActivityEventWithUser>();

    // Build count query with same filters (excluding limit/offset)
    let countQuery = `SELECT COUNT(*) as count FROM activity_events ae
       LEFT JOIN users u ON ae.user_id = u.id
       WHERE ae.family_id = ?`;
    const countParams: (string | number)[] = [familyId];

    if (expenseId) {
      countQuery += ` AND ae.target_id = ?`;
      countParams.push(expenseId);
    }

    if (typeFilter) {
      let eventTypes: string[] = [];
      switch (typeFilter) {
        case 'expenses':
          eventTypes = ['expense.created', 'expense.edited', 'expense.generated'];
          break;
        case 'payments':
          eventTypes = ['payment.created'];
          break;
        case 'fixed_expenses':
          eventTypes = ['fixed_expense.created', 'fixed_expense.updated', 'fixed_expense.ended'];
          break;
        case 'disputes':
          eventTypes = ['expense.questioned', 'expense.resolved', 'expense.satisfied'];
          break;
        case 'children':
          eventTypes = ['child.created', 'child.deleted'];
          break;
      }
      if (eventTypes.length > 0) {
        countQuery += ` AND ae.event_type IN (${eventTypes.map(() => '?').join(', ')})`;
        countParams.push(...eventTypes);
      }
    }

    if (startDate) {
      countQuery += ` AND ae.created_at >= ?`;
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ` AND ae.created_at <= ?`;
      countParams.push(endDate + 'T23:59:59.999Z');
    }

    if (search) {
      countQuery += ` AND (ae.after_snapshot LIKE ? OR ae.before_snapshot LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Get total count for pagination
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ count: number }>();

    // Parse JSON fields for each event
    const events = (result.results || []).map(event => ({
      ...event,
      before_snapshot: event.before_snapshot ? JSON.parse(event.before_snapshot) : null,
      after_snapshot: event.after_snapshot ? JSON.parse(event.after_snapshot) : null,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
    }));

    return c.json({
      events,
      pagination: {
        total: countResult?.count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Get activity error:', error);
    return c.json({ error: 'Failed to get activity', details: String(error) }, 500);
  }
});

export default app;
