import { Hono } from 'hono'
import type { AppType, SendEmailInviteRequest, Family, PendingInvite } from '../types'
import { authMiddleware } from '../middleware/auth'
import {
  generateId,
  generateInviteCode,
  getInviteExpiry,
  sendEmail,
  generateInviteEmailHtml,
} from '../utils'
import { createActivityEvent } from '../services/activity'
import { sendNotification } from '../services/notifications'

const app = new Hono<AppType>()

// Apply auth middleware to all family routes
app.use('*', authMiddleware)

// POST /families — create a new family
app.post('/', async (c) => {
  try {
    const userId = c.get('userId')
    const body = await c.req.json<{ name?: string }>()
    const { name } = body

    // Check if user exists
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Check if user already belongs to a family
    const existingFamily = await c.env.DB.prepare(
      'SELECT id FROM families WHERE parent_a_id = ? OR parent_b_id = ?'
    )
      .bind(userId, userId)
      .first()

    if (existingFamily) {
      return c.json({ error: 'User already belongs to a family' }, 400)
    }

    const familyId = generateId()

    await c.env.DB.prepare(
      `INSERT INTO families (id, name, parent_a_id, parent_a_ratio, created_at, updated_at)
       VALUES (?, ?, ?, 0.5, datetime('now'), datetime('now'))`
    )
      .bind(familyId, name || null, userId)
      .run()

    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    return c.json({ success: true, family }, 201)
  } catch (error) {
    console.error('Create family error:', error)
    return c.json({ error: 'Failed to create family' }, 500)
  }
})

// POST /families/join — join with invite code
// Must be registered before GET /:id to avoid route capture
app.post('/join', async (c) => {
  try {
    const userId = c.get('userId')
    const body = await c.req.json<{ inviteCode: string }>()
    const { inviteCode } = body

    if (!inviteCode) {
      return c.json({ error: 'Missing required field: inviteCode' }, 400)
    }

    // Check if user exists
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Check if user already belongs to an active family
    const existingFamily = await c.env.DB.prepare(
      `SELECT * FROM families
       WHERE (parent_a_id = ? OR parent_b_id = ?)
       AND (status IS NULL OR status != 'archived')`
    )
      .bind(userId, userId)
      .first<Family>()

    if (existingFamily) {
      // Allow joining if the existing family is an empty auto-created one
      // (no partner, no expenses, no children, no payments)
      if (existingFamily.parent_b_id) {
        return c.json({ error: 'User already belongs to a family' }, 400)
      }

      const expenseCount = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM expenses WHERE family_id = ? AND deleted_at IS NULL`
      )
        .bind(existingFamily.id)
        .first<{ cnt: number }>()

      const childCount = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM children WHERE family_id = ? AND deleted_at IS NULL`
      )
        .bind(existingFamily.id)
        .first<{ cnt: number }>()

      const paymentCount = await c.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM payments WHERE family_id = ? AND deleted_at IS NULL`
      )
        .bind(existingFamily.id)
        .first<{ cnt: number }>()

      const isEmpty =
        (expenseCount?.cnt ?? 0) === 0 &&
        (childCount?.cnt ?? 0) === 0 &&
        (paymentCount?.cnt ?? 0) === 0

      if (!isEmpty) {
        return c.json({ error: 'User already belongs to a family' }, 400)
      }

      // Delete the empty auto-created family so the user can join
      await c.env.DB.prepare(`DELETE FROM families WHERE id = ?`).bind(existingFamily.id).run()
    }

    // Find family with invite code
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE invite_code = ?')
      .bind(inviteCode.toUpperCase())
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Invalid invite code' }, 400)
    }

    // Check if code is expired
    if (family.invite_expires_at) {
      const expiresAt = new Date(family.invite_expires_at)
      if (expiresAt < new Date()) {
        return c.json({ error: 'Invite code has expired' }, 400)
      }
    }

    // Check if family already has parent_b
    if (family.parent_b_id) {
      return c.json({ error: 'Family already has two parents' }, 400)
    }

    // Cannot join your own family
    if (family.parent_a_id === userId) {
      return c.json({ error: 'Cannot join your own family' }, 400)
    }

    // Join the family - set parent_b and nullify invite code
    await c.env.DB.prepare(
      `UPDATE families
       SET parent_b_id = ?, invite_code = NULL, invite_expires_at = NULL, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(userId, family.id)
      .run()

    // Mark any pending invites with this code as accepted
    await c.env.DB.prepare(
      `UPDATE pending_invites
       SET status = 'accepted', accepted_at = datetime('now')
       WHERE invite_code = ? AND status = 'pending'`
    )
      .bind(inviteCode.toUpperCase())
      .run()

    const updatedFamily = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(family.id)
      .first<Family>()

    return c.json({
      success: true,
      family: updatedFamily,
    })
  } catch (error) {
    console.error('Join family error:', error)
    return c.json({ error: 'Failed to join family' }, 500)
  }
})

// Get family details
app.get('/:id', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Check if user belongs to this family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to view this family' }, 403)
    }

    // Get parent info
    const parentA = await c.env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?')
      .bind(family.parent_a_id)
      .first()

    let parentB = null
    if (family.parent_b_id) {
      parentB = await c.env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?')
        .bind(family.parent_b_id)
        .first()
    }

    return c.json({
      family,
      parentA,
      parentB,
    })
  } catch (error) {
    console.error('Get family error:', error)
    return c.json({ error: 'Failed to get family' }, 500)
  }
})

// Update family settings (e.g., split ratio)
app.patch('/:id', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Only allow members of the family to update
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to update this family' }, 403)
    }

    const body = await c.req.json<{ parentARatio?: number; name?: string }>()
    const { parentARatio, name } = body

    const updates: string[] = []
    const values: (string | number)[] = []

    if (parentARatio !== undefined) {
      if (parentARatio < 0 || parentARatio > 1) {
        return c.json({ error: 'parentARatio must be between 0 and 1' }, 400)
      }
      updates.push('parent_a_ratio = ?')
      values.push(parentARatio)
    }

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name || (null as unknown as string))
    }

    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400)
    }

    updates.push("updated_at = datetime('now')")
    values.push(familyId)

    await c.env.DB.prepare(`UPDATE families SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    // Log activity for ratio change
    if (parentARatio !== undefined) {
      const { createActivityEvent } = await import('../services/activity')
      await createActivityEvent(
        c.env.DB,
        familyId,
        userId,
        'family.ratio_updated',
        'family',
        familyId,
        { parent_a_ratio: family.parent_a_ratio },
        { parent_a_ratio: parentARatio }
      )
    }

    const updatedFamily = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    return c.json({ success: true, family: updatedFamily })
  } catch (error) {
    console.error('Update family error:', error)
    return c.json({ error: 'Failed to update family' }, 500)
  }
})

// Send email invite for a family (must be before /:id/invite for Hono routing)
app.post('/:id/invite/email', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const body = await c.req.json<SendEmailInviteRequest>()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return c.json({ error: 'Email is required' }, 400)
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email address' }, 400)
    }

    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Only parent_a can send invites
    if (family.parent_a_id !== userId) {
      return c.json({ error: 'Only the family creator can send invites' }, 403)
    }

    // Check if family already has parent_b
    if (family.parent_b_id) {
      return c.json({ error: 'Family already has two parents' }, 400)
    }

    // Get inviter info
    const inviter = await c.env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string; email: string; name: string | null }>()

    if (!inviter) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Check if inviter is trying to invite themselves
    if (inviter.email.toLowerCase() === email.toLowerCase()) {
      return c.json({ error: 'You cannot invite yourself' }, 400)
    }

    // Check for existing pending invite to this email
    const existingInvite = await c.env.DB.prepare(
      `SELECT * FROM pending_invites
       WHERE family_id = ? AND invited_email = ? AND status = 'pending'
       AND expires_at > datetime('now')`
    )
      .bind(familyId, email.toLowerCase())
      .first<PendingInvite>()

    // Generate unique invite code (reuse existing if pending invite exists)
    let inviteCode: string
    let expiresAt: string

    if (existingInvite) {
      // Resend existing invite
      inviteCode = existingInvite.invite_code
      expiresAt = existingInvite.expires_at
    } else {
      // Generate new invite code
      inviteCode = generateInviteCode()
      let attempts = 0
      const maxAttempts = 10

      while (attempts < maxAttempts) {
        const existing = await c.env.DB.prepare('SELECT id FROM families WHERE invite_code = ?')
          .bind(inviteCode)
          .first()

        const existingPending = await c.env.DB.prepare(
          `SELECT id FROM pending_invites WHERE invite_code = ? AND status = 'pending'`
        )
          .bind(inviteCode)
          .first()

        if (!existing && !existingPending) break
        inviteCode = generateInviteCode()
        attempts++
      }

      if (attempts >= maxAttempts) {
        return c.json({ error: 'Failed to generate unique invite code' }, 500)
      }

      expiresAt = getInviteExpiry()

      // Update family invite code
      await c.env.DB.prepare(
        `UPDATE families SET invite_code = ?, invite_expires_at = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
        .bind(inviteCode, expiresAt, familyId)
        .run()

      // Create pending invite record
      const inviteId = generateId()
      await c.env.DB.prepare(
        `INSERT INTO pending_invites (id, family_id, invited_by, invited_email, invite_code, status, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`
      )
        .bind(inviteId, familyId, userId, email.toLowerCase(), inviteCode, expiresAt)
        .run()
    }

    // Generate invite link
    const appUrl = c.env.APP_URL || 'https://ke-console.vercel.app'
    const inviteLink = `${appUrl}/family/join?code=${inviteCode}`

    // Send email if Resend API key is configured
    if (c.env.RESEND_API_KEY) {
      const inviterName = inviter.name || inviter.email.split('@')[0]
      const emailHtml = generateInviteEmailHtml(inviterName, family.name, inviteCode, inviteLink)

      const emailResult = await sendEmail(
        c.env.RESEND_API_KEY,
        email,
        `${inviterName} invited you to Kid Expenses`,
        emailHtml
      )

      if (!emailResult.success) {
        console.error('Failed to send invite email:', emailResult.error)
        // Continue anyway - user can still share the link manually
      }
    }

    return c.json({
      success: true,
      inviteCode,
      inviteLink,
      expiresAt,
      emailSent: !!c.env.RESEND_API_KEY,
    })
  } catch (error) {
    console.error('Send email invite error:', error)
    return c.json({ error: 'Failed to send invite' }, 500)
  }
})

// Generate invite code for a family
app.post('/:id/invite', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Only parent_a can generate invite code
    if (family.parent_a_id !== userId) {
      return c.json({ error: 'Only the family creator can generate invite codes' }, 403)
    }

    // Check if family already has parent_b
    if (family.parent_b_id) {
      return c.json({ error: 'Family already has two parents' }, 400)
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const existing = await c.env.DB.prepare('SELECT id FROM families WHERE invite_code = ?')
        .bind(inviteCode)
        .first()

      if (!existing) break
      inviteCode = generateInviteCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return c.json({ error: 'Failed to generate unique invite code' }, 500)
    }

    const expiresAt = getInviteExpiry()

    await c.env.DB.prepare(
      `UPDATE families SET invite_code = ?, invite_expires_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(inviteCode, expiresAt, familyId)
      .run()

    return c.json({
      success: true,
      inviteCode,
      expiresAt,
    })
  } catch (error) {
    console.error('Generate invite error:', error)
    return c.json({ error: 'Failed to generate invite code' }, 500)
  }
})

// Get pending invites for a family
app.get('/:id/invites', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Only family members can view invites
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to view invites' }, 403)
    }

    // Get pending invites
    const invites = await c.env.DB.prepare(
      `SELECT * FROM pending_invites
       WHERE family_id = ? AND status = 'pending'
       ORDER BY created_at DESC`
    )
      .bind(familyId)
      .all<PendingInvite>()

    // Mark expired invites
    const now = new Date()
    const processedInvites = (invites.results || []).map((invite) => ({
      ...invite,
      is_expired: new Date(invite.expires_at) < now,
    }))

    return c.json({
      invites: processedInvites,
    })
  } catch (error) {
    console.error('Get invites error:', error)
    return c.json({ error: 'Failed to get invites' }, 500)
  }
})

// Cancel a pending invite
app.delete('/:id/invites/:inviteId', async (c) => {
  const familyId = c.req.param('id')
  const inviteId = c.req.param('inviteId')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Only parent_a can cancel invites
    if (family.parent_a_id !== userId) {
      return c.json({ error: 'Only the family creator can cancel invites' }, 403)
    }

    // Get the invite
    const invite = await c.env.DB.prepare(
      'SELECT * FROM pending_invites WHERE id = ? AND family_id = ?'
    )
      .bind(inviteId, familyId)
      .first<PendingInvite>()

    if (!invite) {
      return c.json({ error: 'Invite not found' }, 404)
    }

    if (invite.status !== 'pending') {
      return c.json({ error: 'Invite is not pending' }, 400)
    }

    // Cancel the invite
    await c.env.DB.prepare(`UPDATE pending_invites SET status = 'cancelled' WHERE id = ?`)
      .bind(inviteId)
      .run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Cancel invite error:', error)
    return c.json({ error: 'Failed to cancel invite' }, 500)
  }
})

// Leave family
app.post('/:id/leave', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    // Verify user is member of family
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not a member of this family' }, 403)
    }

    // Determine which parent slot to clear and who the other parent is
    let otherParentId: string | null = null
    if (family.parent_a_id === userId) {
      otherParentId = family.parent_b_id
      await c.env.DB.prepare(
        `UPDATE families SET parent_a_id = NULL, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(familyId)
        .run()
    } else {
      otherParentId = family.parent_a_id
      await c.env.DB.prepare(
        `UPDATE families SET parent_b_id = NULL, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(familyId)
        .run()
    }

    // Re-fetch family to check if both parents are now null
    const updatedFamily = await c.env.DB.prepare(
      'SELECT parent_a_id, parent_b_id FROM families WHERE id = ?'
    )
      .bind(familyId)
      .first<{ parent_a_id: string | null; parent_b_id: string | null }>()

    let familyArchived = false
    if (updatedFamily && !updatedFamily.parent_a_id && !updatedFamily.parent_b_id) {
      await c.env.DB.prepare(
        `UPDATE families SET status = 'archived', updated_at = datetime('now') WHERE id = ?`
      )
        .bind(familyId)
        .run()
      familyArchived = true
    }

    // Log activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'family.member_left',
      'family',
      familyId,
      null,
      { left_by: userId, family_archived: familyArchived }
    )

    // Send notification to other parent if they exist (fire-and-forget)
    if (otherParentId) {
      const actor = await c.env.DB.prepare('SELECT name, email FROM users WHERE id = ?')
        .bind(userId)
        .first<{ name: string | null; email: string }>()

      sendNotification(c.env.DB, c.env, otherParentId, familyId, 'member_left', {
        actor_name: actor?.name || actor?.email || 'Your co-parent',
      }).catch(() => {})
    }

    return c.json({ success: true, family_archived: familyArchived })
  } catch (error) {
    console.error('Leave family error:', error)
    return c.json({ error: 'Failed to leave family' }, 500)
  }
})

export default app
