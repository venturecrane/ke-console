import { Hono } from 'hono'
import type { AppType, Child, CreateChildRequest, Family } from '../types'
import { authMiddleware } from '../middleware/auth'
import { generateId } from '../utils'
import { createActivityEvent } from '../services/activity'

const app = new Hono<AppType>()

app.use('*', authMiddleware)

// Create a child for a family
app.post('/:id/children', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const body = await c.req.json<CreateChildRequest>()
    const { name } = body

    // Validate name
    if (!name || typeof name !== 'string') {
      return c.json({ error: 'Name is required' }, 400)
    }

    const trimmedName = name.trim()
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return c.json({ error: 'Name must be between 1 and 100 characters' }, 400)
    }

    // Check if family exists
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this family' }, 403)
    }

    const childId = generateId()

    // Create the child
    await c.env.DB.prepare(
      `INSERT INTO children (id, family_id, name, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    )
      .bind(childId, familyId, trimmedName)
      .run()

    // Log activity event
    await createActivityEvent(c.env.DB, familyId, userId, 'child.created', 'child', childId, null, {
      name: trimmedName,
    })

    const child = await c.env.DB.prepare('SELECT * FROM children WHERE id = ?')
      .bind(childId)
      .first<Child>()

    return c.json(child, 201)
  } catch (error) {
    console.error('Create child error:', error)
    return c.json({ error: 'Failed to create child', details: String(error) }, 500)
  }
})

// Get all children for a family
app.get('/:id/children', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')
  const includeDeleted = c.req.query('include_deleted') === 'true'

  try {
    // Check if family exists
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this family' }, 403)
    }

    // Fetch children
    let query = 'SELECT * FROM children WHERE family_id = ?'
    if (!includeDeleted) {
      query += ' AND deleted_at IS NULL'
    }
    query += ' ORDER BY created_at ASC'

    const result = await c.env.DB.prepare(query).bind(familyId).all<Child>()

    return c.json({
      children: result.results,
      count: result.results.length,
    })
  } catch (error) {
    console.error('Get children error:', error)
    return c.json({ error: 'Failed to get children', details: String(error) }, 500)
  }
})

// Update a child's name
app.patch('/:id/children/:childId', async (c) => {
  const familyId = c.req.param('id')
  const childId = c.req.param('childId')
  const userId = c.get('userId')

  try {
    // Check if family exists
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this family' }, 403)
    }

    // Check if child exists and belongs to this family
    const child = await c.env.DB.prepare(
      'SELECT * FROM children WHERE id = ? AND family_id = ? AND deleted_at IS NULL'
    )
      .bind(childId, familyId)
      .first<Child>()

    if (!child) {
      return c.json({ error: 'Child not found' }, 404)
    }

    const body = await c.req.json<{ name?: string }>()
    const { name } = body

    // Validate name
    if (name === undefined) {
      return c.json({ error: 'No fields to update' }, 400)
    }

    if (!name || typeof name !== 'string') {
      return c.json({ error: 'Name is required' }, 400)
    }

    const trimmedName = name.trim()
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return c.json({ error: 'Name must be between 1 and 100 characters' }, 400)
    }

    // Update the child
    await c.env.DB.prepare('UPDATE children SET name = ? WHERE id = ?')
      .bind(trimmedName, childId)
      .run()

    // Log activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'child.updated',
      'child',
      childId,
      { name: child.name },
      { name: trimmedName }
    )

    const updatedChild = await c.env.DB.prepare('SELECT * FROM children WHERE id = ?')
      .bind(childId)
      .first<Child>()

    return c.json(updatedChild)
  } catch (error) {
    console.error('Update child error:', error)
    return c.json({ error: 'Failed to update child', details: String(error) }, 500)
  }
})

// Soft-delete a child
app.delete('/:id/children/:childId', async (c) => {
  const familyId = c.req.param('id')
  const childId = c.req.param('childId')
  const userId = c.get('userId')

  try {
    // Check if family exists
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to access this family' }, 403)
    }

    // Check if child exists and belongs to this family
    const child = await c.env.DB.prepare('SELECT * FROM children WHERE id = ? AND family_id = ?')
      .bind(childId, familyId)
      .first<Child>()

    if (!child) {
      return c.json({ error: 'Child not found' }, 404)
    }

    // Check if already deleted
    if (child.deleted_at) {
      return c.json({ error: 'Child is already deleted' }, 400)
    }

    // Soft delete
    await c.env.DB.prepare(`UPDATE children SET deleted_at = datetime('now') WHERE id = ?`)
      .bind(childId)
      .run()

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
    )

    const updatedChild = await c.env.DB.prepare('SELECT id, deleted_at FROM children WHERE id = ?')
      .bind(childId)
      .first()

    return c.json(updatedChild)
  } catch (error) {
    console.error('Delete child error:', error)
    return c.json({ error: 'Failed to delete child', details: String(error) }, 500)
  }
})

export default app
