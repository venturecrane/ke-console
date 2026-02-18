import { Hono } from 'hono'
import type { AppType, Family } from '../types'
import { authMiddleware } from '../middleware/auth'

const app = new Hono<AppType>()

app.use('*', authMiddleware)

// Get current user info with family context
app.get('/', async (c) => {
  const userId = c.get('userId')

  try {
    // Get user
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, created_at FROM users WHERE id = ?'
    )
      .bind(userId)
      .first()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Get user's active family (as parent_a or parent_b), excluding archived
    const family = await c.env.DB.prepare(
      `SELECT id, name, parent_a_id, parent_b_id, parent_a_ratio,
              invite_code, invite_expires_at, created_at, updated_at
       FROM families
       WHERE (parent_a_id = ? OR parent_b_id = ?)
       AND (status IS NULL OR status != 'archived')`
    )
      .bind(userId, userId)
      .first<Family>()

    return c.json({
      user,
      family: family || null,
      role: family ? (family.parent_a_id === userId ? 'parent_a' : 'parent_b') : null,
    })
  } catch (error) {
    console.error('Get /me error:', error)
    return c.json({ error: 'Failed to get user info' }, 500)
  }
})

export default app
