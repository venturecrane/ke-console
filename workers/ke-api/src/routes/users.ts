import { Hono } from 'hono';
import type { AppType, UserSyncRequest } from '../types';

const app = new Hono<AppType>();

// User sync endpoint - creates or updates user from Clerk (no auth middleware)
app.post('/sync', async (c) => {
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

export default app;
