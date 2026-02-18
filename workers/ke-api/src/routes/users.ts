import { Hono } from 'hono'
import type { AppType, UserSyncRequest } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId } from '../utils'

const app = new Hono<AppType>()

app.use('*', authMiddleware)

// User sync endpoint - creates or updates authenticated user's record
app.post('/sync', async (c) => {
  try {
    const userId = c.get('userId')
    const body = await c.req.json<UserSyncRequest>()
    const { email, name } = body

    if (!email) {
      return c.json({ error: 'Missing required field: email' }, 400)
    }

    const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?')
      .bind(userId)
      .first()

    if (existingUser) {
      await c.env.DB.prepare(
        `UPDATE users SET email = ?, name = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(email, name || null, userId)
        .run()

      // Backfill: ensure existing user has an active family
      const existingFamily = await c.env.DB.prepare(
        `SELECT id FROM families
         WHERE (parent_a_id = ? OR parent_b_id = ?)
         AND (status IS NULL OR status != 'archived')`
      )
        .bind(userId, userId)
        .first()

      if (!existingFamily) {
        const familyId = generateId()
        await c.env.DB.prepare(
          `INSERT INTO families (id, name, parent_a_id, parent_a_ratio, created_at, updated_at)
           VALUES (?, NULL, ?, 0.5, datetime('now'), datetime('now'))`
        )
          .bind(familyId, userId)
          .run()
      }

      return c.json({ success: true, action: 'updated', userId })
    } else {
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, name, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      )
        .bind(userId, email, name || null)
        .run()

      // Auto-create a default family for the new user
      const familyId = generateId()
      await c.env.DB.prepare(
        `INSERT INTO families (id, name, parent_a_id, parent_a_ratio, created_at, updated_at)
         VALUES (?, NULL, ?, 0.5, datetime('now'), datetime('now'))`
      )
        .bind(familyId, userId)
        .run()

      return c.json({ success: true, action: 'created', userId })
    }
  } catch (error) {
    console.error('User sync error:', error)
    return c.json({ error: 'Failed to sync user' }, 500)
  }
})

export default app
