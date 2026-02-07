import { Hono } from 'hono';
import type {
  AppType,
  Family,
  UpdateNotificationPreferencesRequest,
} from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils';

const app = new Hono<AppType>();

app.use('*', authMiddleware);

// GET /me/notification-preferences — returns preferences (auto-creates with defaults if none exist)
app.get('/notification-preferences', async (c) => {
  const userId = c.get('userId');

  try {
    // Get user's family
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE parent_a_id = ? OR parent_b_id = ?'
    ).bind(userId, userId).first<Family>();

    if (!family) {
      return c.json({ error: 'User does not belong to a family' }, 404);
    }

    // Try to get existing preferences
    let prefs = await c.env.DB.prepare(
      'SELECT * FROM notification_preferences WHERE user_id = ? AND family_id = ?'
    ).bind(userId, family.id).first<{
      id: string;
      user_id: string;
      family_id: string;
      expense_created: number;
      expense_questioned: number;
      question_resolved: number;
      payment_recorded: number;
      recurring_generated: number;
      created_at: string;
      updated_at: string;
    }>();

    // Auto-create with defaults if none exist
    if (!prefs) {
      const id = generateId();
      await c.env.DB.prepare(
        `INSERT INTO notification_preferences (id, user_id, family_id, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(id, userId, family.id).run();

      prefs = await c.env.DB.prepare(
        'SELECT * FROM notification_preferences WHERE id = ?'
      ).bind(id).first();
    }

    if (!prefs) {
      return c.json({ error: 'Failed to get notification preferences' }, 500);
    }

    // Convert SQLite integers (0/1) to booleans
    return c.json({
      preferences: {
        id: prefs.id,
        user_id: prefs.user_id,
        family_id: prefs.family_id,
        expense_created: !!prefs.expense_created,
        expense_questioned: !!prefs.expense_questioned,
        question_resolved: !!prefs.question_resolved,
        payment_recorded: !!prefs.payment_recorded,
        recurring_generated: !!prefs.recurring_generated,
      },
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return c.json({ error: 'Failed to get notification preferences', details: String(error) }, 500);
  }
});

// PATCH /me/notification-preferences — updates specific toggles
app.patch('/notification-preferences', async (c) => {
  const userId = c.get('userId');

  try {
    // Get user's family
    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE parent_a_id = ? OR parent_b_id = ?'
    ).bind(userId, userId).first<Family>();

    if (!family) {
      return c.json({ error: 'User does not belong to a family' }, 404);
    }

    const body = await c.req.json<UpdateNotificationPreferencesRequest>();
    const validKeys = ['expense_created', 'expense_questioned', 'question_resolved', 'payment_recorded', 'recurring_generated'];

    // Validate that at least one valid key is provided
    const updates: string[] = [];
    const params: (number | string)[] = [];

    for (const key of validKeys) {
      const value = body[key as keyof UpdateNotificationPreferencesRequest];
      if (value !== undefined) {
        if (typeof value !== 'boolean') {
          return c.json({ error: `${key} must be a boolean` }, 400);
        }
        updates.push(`${key} = ?`);
        params.push(value ? 1 : 0);
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    // Ensure preferences exist (auto-create if needed)
    let prefs = await c.env.DB.prepare(
      'SELECT id FROM notification_preferences WHERE user_id = ? AND family_id = ?'
    ).bind(userId, family.id).first<{ id: string }>();

    if (!prefs) {
      const id = generateId();
      await c.env.DB.prepare(
        `INSERT INTO notification_preferences (id, user_id, family_id, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(id, userId, family.id).run();
      prefs = { id };
    }

    // Update
    updates.push("updated_at = datetime('now')");
    params.push(prefs.id);

    await c.env.DB.prepare(
      `UPDATE notification_preferences SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // Fetch updated
    const updated = await c.env.DB.prepare(
      'SELECT * FROM notification_preferences WHERE id = ?'
    ).bind(prefs.id).first<{
      id: string;
      user_id: string;
      family_id: string;
      expense_created: number;
      expense_questioned: number;
      question_resolved: number;
      payment_recorded: number;
      recurring_generated: number;
    }>();

    if (!updated) {
      return c.json({ error: 'Failed to update notification preferences' }, 500);
    }

    return c.json({
      preferences: {
        id: updated.id,
        user_id: updated.user_id,
        family_id: updated.family_id,
        expense_created: !!updated.expense_created,
        expense_questioned: !!updated.expense_questioned,
        question_resolved: !!updated.question_resolved,
        payment_recorded: !!updated.payment_recorded,
        recurring_generated: !!updated.recurring_generated,
      },
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return c.json({ error: 'Failed to update notification preferences', details: String(error) }, 500);
  }
});

export default app;
