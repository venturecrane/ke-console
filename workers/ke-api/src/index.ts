import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  dollarsToCents,
  calculateBalanceFromData,
  type Expense as CalcExpense,
  type Payment as CalcPayment,
} from './calculations';

export interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  APP_URL?: string;
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
  childIds?: string[]; // array of child IDs, stored as JSON string
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

interface PendingInvite {
  id: string;
  family_id: string;
  invited_by: string;
  invited_email: string;
  invite_code: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  sent_at: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface SendEmailInviteRequest {
  email: string;
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

// dollarsToCents imported from ./calculations

// Get today's date in ISO format (YYYY-MM-DD)
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Send email via Resend API
async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kid Expenses <invites@kidexpenses.app>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return { success: false, error: 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: String(error) };
  }
}

// Generate invite email HTML
function generateInviteEmailHtml(
  inviterName: string,
  familyName: string | null,
  inviteCode: string,
  inviteLink: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #18181b; font-size: 24px; margin: 0;">Kid Expenses</h1>
  </div>

  <div style="background: #f4f4f5; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #18181b; font-size: 20px; margin: 0 0 15px 0;">You've been invited!</h2>
    <p style="margin: 0 0 15px 0;">
      <strong>${inviterName}</strong> has invited you to join ${familyName ? `"${familyName}"` : 'their family'} on Kid Expenses to share and track child-related expenses together.
    </p>

    <a href="${inviteLink}" style="display: inline-block; background: #18181b; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin: 15px 0;">
      Join Family
    </a>

    <p style="margin: 20px 0 10px 0; font-size: 14px; color: #71717a;">
      Or enter this code manually:
    </p>
    <div style="background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 15px; text-align: center;">
      <code style="font-size: 24px; letter-spacing: 4px; color: #18181b;">${inviteCode}</code>
    </div>

    <p style="margin: 15px 0 0 0; font-size: 13px; color: #a1a1aa;">
      This invite expires in 7 days.
    </p>
  </div>

  <p style="font-size: 13px; color: #71717a; text-align: center;">
    If you didn't expect this invitation, you can safely ignore this email.
  </p>
</body>
</html>
  `.trim();
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
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

// Update family settings (e.g., split ratio)
app.patch('/families/:id', async (c) => {
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

    // Only allow members of the family to update
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to update this family' }, 403);
    }

    const body = await c.req.json<{ parentARatio?: number; name?: string }>();
    const { parentARatio, name } = body;

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (parentARatio !== undefined) {
      if (parentARatio < 0 || parentARatio > 1) {
        return c.json({ error: 'parentARatio must be between 0 and 1' }, 400);
      }
      updates.push('parent_a_ratio = ?');
      values.push(parentARatio);
    }

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name || null as unknown as string);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(familyId);

    await c.env.DB.prepare(
      `UPDATE families SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    // Log activity for ratio change
    if (parentARatio !== undefined) {
      await createActivityEvent(
        c.env.DB,
        familyId,
        userId,
        'family.ratio_updated',
        'family',
        familyId,
        { parent_a_ratio: family.parent_a_ratio },
        { parent_a_ratio: parentARatio }
      );
    }

    const updatedFamily = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    return c.json({ success: true, family: updatedFamily });
  } catch (error) {
    console.error('Update family error:', error);
    return c.json({ error: 'Failed to update family', details: String(error) }, 500);
  }
});

// Send email invite for a family (must be before /families/:id/invite for Hono routing)
app.post('/families/:id/invite/email', async (c) => {
  const familyId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

  try {
    const body = await c.req.json<SendEmailInviteRequest>();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return c.json({ error: 'Email is required' }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    const family = await c.env.DB.prepare(
      'SELECT * FROM families WHERE id = ?'
    ).bind(familyId).first<Family>();

    if (!family) {
      return c.json({ error: 'Family not found' }, 404);
    }

    // Only parent_a can send invites
    if (family.parent_a_id !== userId) {
      return c.json({ error: 'Only the family creator can send invites' }, 403);
    }

    // Check if family already has parent_b
    if (family.parent_b_id) {
      return c.json({ error: 'Family already has two parents' }, 400);
    }

    // Get inviter info
    const inviter = await c.env.DB.prepare(
      'SELECT id, email, name FROM users WHERE id = ?'
    ).bind(userId).first<{ id: string; email: string; name: string | null }>();

    if (!inviter) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if inviter is trying to invite themselves
    if (inviter.email.toLowerCase() === email.toLowerCase()) {
      return c.json({ error: 'You cannot invite yourself' }, 400);
    }

    // Check for existing pending invite to this email
    const existingInvite = await c.env.DB.prepare(
      `SELECT * FROM pending_invites
       WHERE family_id = ? AND invited_email = ? AND status = 'pending'
       AND expires_at > datetime('now')`
    ).bind(familyId, email.toLowerCase()).first<PendingInvite>();

    // Generate unique invite code (reuse existing if pending invite exists)
    let inviteCode: string;
    let expiresAt: string;

    if (existingInvite) {
      // Resend existing invite
      inviteCode = existingInvite.invite_code;
      expiresAt = existingInvite.expires_at;
    } else {
      // Generate new invite code
      inviteCode = generateInviteCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existing = await c.env.DB.prepare(
          'SELECT id FROM families WHERE invite_code = ?'
        ).bind(inviteCode).first();

        const existingPending = await c.env.DB.prepare(
          `SELECT id FROM pending_invites WHERE invite_code = ? AND status = 'pending'`
        ).bind(inviteCode).first();

        if (!existing && !existingPending) break;
        inviteCode = generateInviteCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return c.json({ error: 'Failed to generate unique invite code' }, 500);
      }

      expiresAt = getInviteExpiry();

      // Update family invite code
      await c.env.DB.prepare(
        `UPDATE families SET invite_code = ?, invite_expires_at = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(inviteCode, expiresAt, familyId).run();

      // Create pending invite record
      const inviteId = generateId();
      await c.env.DB.prepare(
        `INSERT INTO pending_invites (id, family_id, invited_by, invited_email, invite_code, status, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'))`
      ).bind(inviteId, familyId, userId, email.toLowerCase(), inviteCode, expiresAt).run();
    }

    // Generate invite link
    const appUrl = c.env.APP_URL || 'https://ke-console.vercel.app';
    const inviteLink = `${appUrl}/family/join?code=${inviteCode}`;

    // Send email if Resend API key is configured
    if (c.env.RESEND_API_KEY) {
      const inviterName = inviter.name || inviter.email.split('@')[0];
      const emailHtml = generateInviteEmailHtml(
        inviterName,
        family.name,
        inviteCode,
        inviteLink
      );

      const emailResult = await sendEmail(
        c.env.RESEND_API_KEY,
        email,
        `${inviterName} invited you to Kid Expenses`,
        emailHtml
      );

      if (!emailResult.success) {
        console.error('Failed to send invite email:', emailResult.error);
        // Continue anyway - user can still share the link manually
      }
    }

    return c.json({
      success: true,
      inviteCode,
      inviteLink,
      expiresAt,
      emailSent: !!c.env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error('Send email invite error:', error);
    return c.json({ error: 'Failed to send invite', details: String(error) }, 500);
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

// Get pending invites for a family
app.get('/families/:id/invites', async (c) => {
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

    // Only family members can view invites
    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized to view invites' }, 403);
    }

    // Get pending invites
    const invites = await c.env.DB.prepare(
      `SELECT * FROM pending_invites
       WHERE family_id = ? AND status = 'pending'
       ORDER BY created_at DESC`
    ).bind(familyId).all<PendingInvite>();

    // Mark expired invites
    const now = new Date();
    const processedInvites = (invites.results || []).map(invite => ({
      ...invite,
      is_expired: new Date(invite.expires_at) < now,
    }));

    return c.json({
      invites: processedInvites,
    });
  } catch (error) {
    console.error('Get invites error:', error);
    return c.json({ error: 'Failed to get invites', details: String(error) }, 500);
  }
});

// Cancel a pending invite
app.delete('/families/:id/invites/:inviteId', async (c) => {
  const familyId = c.req.param('id');
  const inviteId = c.req.param('inviteId');
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

    // Only parent_a can cancel invites
    if (family.parent_a_id !== userId) {
      return c.json({ error: 'Only the family creator can cancel invites' }, 403);
    }

    // Get the invite
    const invite = await c.env.DB.prepare(
      'SELECT * FROM pending_invites WHERE id = ? AND family_id = ?'
    ).bind(inviteId, familyId).first<PendingInvite>();

    if (!invite) {
      return c.json({ error: 'Invite not found' }, 404);
    }

    if (invite.status !== 'pending') {
      return c.json({ error: 'Invite is not pending' }, 400);
    }

    // Cancel the invite
    await c.env.DB.prepare(
      `UPDATE pending_invites SET status = 'cancelled' WHERE id = ?`
    ).bind(inviteId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Cancel invite error:', error);
    return c.json({ error: 'Failed to cancel invite', details: String(error) }, 500);
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

    // Mark any pending invites with this code as accepted
    await c.env.DB.prepare(
      `UPDATE pending_invites
       SET status = 'accepted', accepted_at = datetime('now')
       WHERE invite_code = ? AND status = 'pending'`
    ).bind(inviteCode.toUpperCase()).run();

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

// calculateBalanceFromData imported from ./calculations

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

// ============================================
// PAYMENTS ENDPOINTS
// ============================================

interface CreatePaymentRequest {
  amount: number; // in dollars, will be converted to cents
  paymentDate?: string; // ISO date string, defaults to today
  notes?: string;
}

// Create payment
app.post('/families/:id/payments', async (c) => {
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
      return c.json({ error: 'Not authorized to add payments to this family' }, 403);
    }

    const body = await c.req.json<CreatePaymentRequest>();
    const { amount, paymentDate, notes } = body;

    // Validate required fields
    if (typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: 'Amount is required and must be a positive number' }, 400);
    }

    const paymentId = generateId();
    const amountCents = dollarsToCents(amount);
    const date = paymentDate || getTodayDate();

    await c.env.DB.prepare(
      `INSERT INTO payments (id, family_id, paid_by, amount_cents, payment_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      paymentId,
      familyId,
      userId,
      amountCents,
      date,
      notes || null
    ).run();

    // Fetch the created payment
    const payment = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE id = ?'
    ).bind(paymentId).first<Payment>();

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'payment.created',
      'payment',
      paymentId,
      null,
      payment
    );

    return c.json({ success: true, payment }, 201);
  } catch (error) {
    console.error('Create payment error:', error);
    return c.json({ error: 'Failed to create payment', details: String(error) }, 500);
  }
});

// List payments for family
app.get('/families/:id/payments', async (c) => {
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
      return c.json({ error: 'Not authorized to view this family\'s payments' }, 403);
    }

    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const result = await c.env.DB.prepare(
      `SELECT * FROM payments
       WHERE family_id = ? AND deleted_at IS NULL
       ORDER BY payment_date DESC, created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(familyId, limit, offset).all<Payment>();

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM payments WHERE family_id = ? AND deleted_at IS NULL'
    ).bind(familyId).first<{ count: number }>();

    return c.json({
      payments: result.results || [],
      pagination: {
        total: countResult?.count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('List payments error:', error);
    return c.json({ error: 'Failed to list payments', details: String(error) }, 500);
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

// ============================================
// DISPUTE ENDPOINTS
// ============================================

type QuestionReason = 'wrong_amount' | 'not_child_related' | 'duplicate' | 'split_dispute' | 'other';

interface QuestionExpenseRequest {
  reason: QuestionReason;
  note?: string;
}

interface ResolveExpenseRequest {
  action: 'keep' | 'edit' | 'personal' | 'delete';
  newAmount?: number; // in dollars, only for 'edit' action
}

// Helper to check 7-day timeout and auto-resolve
async function checkAndApplyTimeout(db: D1Database, expense: Expense): Promise<Expense> {
  if (expense.status !== 'pending_satisfaction') return expense;

  const resolvedAt = new Date(expense.resolved_at!);
  const now = new Date();
  const daysDiff = (now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff >= 7) {
    await db.prepare(
      `UPDATE expenses SET status = 'resolved_creator_decided', updated_at = datetime('now') WHERE id = ?`
    ).bind(expense.id).run();

    return { ...expense, status: 'resolved_creator_decided' };
  }

  return expense;
}

// Question an expense (dispute initiation)
app.post('/expenses/:id/question', async (c) => {
  const expenseId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

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
app.post('/expenses/:id/resolve', async (c) => {
  const expenseId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

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
app.post('/expenses/:id/satisfy', async (c) => {
  const expenseId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

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

// Get single expense (with timeout check)
app.get('/expenses/:id', async (c) => {
  const expenseId = c.req.param('id');
  const userId = c.req.header('X-User-Id');

  if (!userId) {
    return c.json({ error: 'Missing X-User-Id header' }, 401);
  }

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

// ============================================
// FIXED EXPENSES ENDPOINTS
// ============================================

type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';

interface FixedExpense {
  id: string;
  family_id: string;
  created_by: string;
  description: string;
  amount_cents: number;
  category: string;
  child_ids: string | null;
  link_url: string | null;
  memo: string | null;
  frequency: RecurringFrequency;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface CreateFixedExpenseRequest {
  description: string;
  amount: number; // in dollars
  category: 'school' | 'medical' | 'activities' | 'childcare' | 'other';
  frequency?: RecurringFrequency; // defaults to 'monthly'
  effectiveFrom: string; // YYYY-MM-DD
  effectiveUntil?: string; // YYYY-MM-DD
  linkUrl?: string;
  memo?: string;
}

interface UpdateFixedExpenseRequest {
  description?: string;
  amount?: number; // in dollars
  category?: 'school' | 'medical' | 'activities' | 'childcare' | 'other';
  frequency?: RecurringFrequency;
  effectiveUntil?: string | null;
  linkUrl?: string | null;
  memo?: string | null;
}

// Check tier limit for fixed expenses
async function checkFixedExpenseLimit(db: D1Database, familyId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Check if family has pro subscription
  const subscription = await db.prepare(
    `SELECT * FROM subscriptions WHERE family_id = ? AND status = 'active'`
  ).bind(familyId).first();

  const isPro = subscription !== null;
  const limit = isPro ? Infinity : 2;

  // Count current active fixed expenses
  const result = await db.prepare(
    `SELECT COUNT(*) as count FROM fixed_expenses
     WHERE family_id = ? AND deleted_at IS NULL
     AND (effective_until IS NULL OR effective_until >= date('now'))`
  ).bind(familyId).first<{ count: number }>();

  const current = result?.count || 0;

  return {
    allowed: current < limit,
    current,
    limit: isPro ? -1 : 2, // -1 means unlimited
  };
}

// Generate monthly expenses from fixed expense templates
async function generateMonthlyExpenses(db: D1Database, familyId: string): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

  // Get active fixed expenses for this family
  const fixedExpenses = await db.prepare(
    `SELECT * FROM fixed_expenses
     WHERE family_id = ?
     AND deleted_at IS NULL
     AND effective_from <= date('now')
     AND (effective_until IS NULL OR effective_until >= date('now'))`
  ).bind(familyId).all<FixedExpense>();

  let generated = 0;

  for (const fixed of fixedExpenses.results || []) {
    // Check if expense already exists for this month
    const existingExpense = await db.prepare(
      `SELECT id FROM expenses
       WHERE fixed_expense_id = ?
       AND strftime('%Y-%m', expense_date) = ?
       AND deleted_at IS NULL`
    ).bind(fixed.id, monthStr).first();

    if (existingExpense) {
      continue; // Already generated for this month
    }

    // Create expense from template
    const expenseId = generateId();
    const expenseDate = `${monthStr}-01`; // 1st of month

    await db.prepare(
      `INSERT INTO expenses (
        id, family_id, created_by, paid_by, fixed_expense_id, description, amount_cents,
        category, expense_date, child_ids, link_url, memo, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', datetime('now'), datetime('now'))`
    ).bind(
      expenseId,
      fixed.family_id,
      fixed.created_by,
      fixed.created_by, // paid_by defaults to creator
      fixed.id,
      fixed.description,
      fixed.amount_cents,
      fixed.category,
      expenseDate,
      fixed.child_ids,
      fixed.link_url,
      fixed.memo
    ).run();

    // Log activity - include expense details for better activity feed display
    await createActivityEvent(
      db,
      fixed.family_id,
      fixed.created_by,
      'expense.generated',
      'expense',
      expenseId,
      null,
      {
        fixed_expense_id: fixed.id,
        description: fixed.description,
        amount_cents: fixed.amount_cents,
        category: fixed.category,
      }
    );

    generated++;
  }

  return generated;
}

// Create fixed expense
app.post('/families/:id/fixed-expenses', async (c) => {
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
      return c.json({ error: 'Not authorized to add fixed expenses to this family' }, 403);
    }

    // Check tier limit
    const tierCheck = await checkFixedExpenseLimit(c.env.DB, familyId);
    if (!tierCheck.allowed) {
      return c.json({
        error: 'Fixed expense limit reached',
        current: tierCheck.current,
        limit: tierCheck.limit,
        upgrade: 'Upgrade to Pro for unlimited fixed expenses',
      }, 403);
    }

    const body = await c.req.json<CreateFixedExpenseRequest>();
    const { description, amount, category, frequency, effectiveFrom, effectiveUntil, linkUrl, memo } = body;
    const validFrequency = frequency || 'monthly';

    // Validate required fields
    if (!description || description.length === 0) {
      return c.json({ error: 'Description is required' }, 400);
    }
    if (description.length > 200) {
      return c.json({ error: 'Description must be 200 characters or less' }, 400);
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return c.json({ error: 'Amount is required and must be a positive number' }, 400);
    }
    if (!category || !['school', 'medical', 'activities', 'childcare', 'other'].includes(category)) {
      return c.json({ error: 'Category is required and must be: school, medical, activities, childcare, or other' }, 400);
    }
    if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      return c.json({ error: 'effectiveFrom is required in YYYY-MM-DD format' }, 400);
    }
    if (memo && memo.length > 500) {
      return c.json({ error: 'Memo must be 500 characters or less' }, 400);
    }

    const fixedExpenseId = generateId();
    const amountCents = dollarsToCents(amount);

    await c.env.DB.prepare(
      `INSERT INTO fixed_expenses (
        id, family_id, created_by, description, amount_cents, category,
        frequency, link_url, memo, effective_from, effective_until, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      fixedExpenseId,
      familyId,
      userId,
      description,
      amountCents,
      category,
      validFrequency,
      linkUrl || null,
      memo || null,
      effectiveFrom,
      effectiveUntil || null
    ).run();

    // Fetch the created fixed expense
    const fixedExpense = await c.env.DB.prepare(
      'SELECT * FROM fixed_expenses WHERE id = ?'
    ).bind(fixedExpenseId).first<FixedExpense>();

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'fixed_expense.created',
      'fixed_expense',
      fixedExpenseId,
      null,
      fixedExpense
    );

    return c.json({ success: true, fixedExpense }, 201);
  } catch (error) {
    console.error('Create fixed expense error:', error);
    return c.json({ error: 'Failed to create fixed expense', details: String(error) }, 500);
  }
});

// List fixed expenses
app.get('/families/:id/fixed-expenses', async (c) => {
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
      return c.json({ error: 'Not authorized to view this family\'s fixed expenses' }, 403);
    }

    // Generate monthly expenses if needed (on app open check)
    await generateMonthlyExpenses(c.env.DB, familyId);

    const includeEnded = c.req.query('includeEnded') === 'true';

    let query = `SELECT * FROM fixed_expenses WHERE family_id = ? AND deleted_at IS NULL`;
    if (!includeEnded) {
      query += ` AND (effective_until IS NULL OR effective_until >= date('now'))`;
    }
    query += ` ORDER BY created_at DESC`;

    const result = await c.env.DB.prepare(query).bind(familyId).all<FixedExpense>();

    // Get tier info
    const tierCheck = await checkFixedExpenseLimit(c.env.DB, familyId);

    return c.json({
      fixedExpenses: result.results || [],
      count: result.results?.length || 0,
      tier: {
        current: tierCheck.current,
        limit: tierCheck.limit,
        canAdd: tierCheck.allowed,
      },
    });
  } catch (error) {
    console.error('List fixed expenses error:', error);
    return c.json({ error: 'Failed to list fixed expenses', details: String(error) }, 500);
  }
});

// Update fixed expense
app.patch('/families/:id/fixed-expenses/:fixedExpenseId', async (c) => {
  const familyId = c.req.param('id');
  const fixedExpenseId = c.req.param('fixedExpenseId');
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
      return c.json({ error: 'Not authorized to modify this family\'s fixed expenses' }, 403);
    }

    // Get the fixed expense
    const fixedExpense = await c.env.DB.prepare(
      'SELECT * FROM fixed_expenses WHERE id = ? AND family_id = ? AND deleted_at IS NULL'
    ).bind(fixedExpenseId, familyId).first<FixedExpense>();

    if (!fixedExpense) {
      return c.json({ error: 'Fixed expense not found' }, 404);
    }

    const body = await c.req.json<UpdateFixedExpenseRequest>();
    const { description, amount, category, frequency, effectiveUntil, linkUrl, memo } = body;

    // Build update query
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (description !== undefined) {
      if (description.length === 0 || description.length > 200) {
        return c.json({ error: 'Description must be between 1 and 200 characters' }, 400);
      }
      updates.push('description = ?');
      params.push(description);
    }

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return c.json({ error: 'Amount must be a positive number' }, 400);
      }
      updates.push('amount_cents = ?');
      params.push(dollarsToCents(amount));
    }

    if (category !== undefined) {
      if (!['school', 'medical', 'activities', 'childcare', 'other'].includes(category)) {
        return c.json({ error: 'Category must be: school, medical, activities, childcare, or other' }, 400);
      }
      updates.push('category = ?');
      params.push(category);
    }

    if (frequency !== undefined) {
      if (!['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'].includes(frequency)) {
        return c.json({ error: 'Frequency must be: weekly, biweekly, monthly, quarterly, or annually' }, 400);
      }
      updates.push('frequency = ?');
      params.push(frequency);
    }

    if (effectiveUntil !== undefined) {
      updates.push('effective_until = ?');
      params.push(effectiveUntil);
    }

    if (linkUrl !== undefined) {
      updates.push('link_url = ?');
      params.push(linkUrl);
    }

    if (memo !== undefined) {
      if (memo && memo.length > 500) {
        return c.json({ error: 'Memo must be 500 characters or less' }, 400);
      }
      updates.push('memo = ?');
      params.push(memo);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    params.push(fixedExpenseId);

    await c.env.DB.prepare(
      `UPDATE fixed_expenses SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // Fetch updated fixed expense
    const updatedFixedExpense = await c.env.DB.prepare(
      'SELECT * FROM fixed_expenses WHERE id = ?'
    ).bind(fixedExpenseId).first<FixedExpense>();

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'fixed_expense.updated',
      'fixed_expense',
      fixedExpenseId,
      fixedExpense,
      updatedFixedExpense
    );

    return c.json({ success: true, fixedExpense: updatedFixedExpense });
  } catch (error) {
    console.error('Update fixed expense error:', error);
    return c.json({ error: 'Failed to update fixed expense', details: String(error) }, 500);
  }
});

// End fixed expense (set effective_until to today)
app.delete('/families/:id/fixed-expenses/:fixedExpenseId', async (c) => {
  const familyId = c.req.param('id');
  const fixedExpenseId = c.req.param('fixedExpenseId');
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
      return c.json({ error: 'Not authorized to modify this family\'s fixed expenses' }, 403);
    }

    // Get the fixed expense
    const fixedExpense = await c.env.DB.prepare(
      'SELECT * FROM fixed_expenses WHERE id = ? AND family_id = ? AND deleted_at IS NULL'
    ).bind(fixedExpenseId, familyId).first<FixedExpense>();

    if (!fixedExpense) {
      return c.json({ error: 'Fixed expense not found' }, 404);
    }

    // Set effective_until to today (end the template, don't hard delete)
    const today = getTodayDate();
    await c.env.DB.prepare(
      `UPDATE fixed_expenses SET effective_until = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(today, fixedExpenseId).run();

    // Fetch updated fixed expense
    const updatedFixedExpense = await c.env.DB.prepare(
      'SELECT * FROM fixed_expenses WHERE id = ?'
    ).bind(fixedExpenseId).first<FixedExpense>();

    // Create activity event
    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'fixed_expense.ended',
      'fixed_expense',
      fixedExpenseId,
      fixedExpense,
      updatedFixedExpense
    );

    return c.json({ success: true, fixedExpense: updatedFixedExpense });
  } catch (error) {
    console.error('End fixed expense error:', error);
    return c.json({ error: 'Failed to end fixed expense', details: String(error) }, 500);
  }
});

// ============================================
// ACTIVITY FEED ENDPOINT
// ============================================

interface ActivityEvent {
  id: string;
  family_id: string;
  user_id: string;
  event_type: string;
  target_type: string;
  target_id: string;
  before_snapshot: string | null;
  after_snapshot: string | null;
  metadata: string | null;
  created_at: string;
}

interface ActivityEventWithUser extends ActivityEvent {
  user_email: string;
  user_name: string | null;
}

// Get activity feed for family
app.get('/families/:id/activity', async (c) => {
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
      return c.json({ error: 'Not authorized to view this family\'s activity' }, 403);
    }

    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const typeFilter = c.req.query('type'); // expenses, payments, fixed_expenses, disputes, children
    const search = c.req.query('search');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // Build query with filters
    let query = `SELECT ae.*, u.email as user_email, u.name as user_name
       FROM activity_events ae
       LEFT JOIN users u ON ae.user_id = u.id
       WHERE ae.family_id = ?`;
    const params: (string | number)[] = [familyId];

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
      '/families/:id/invite/email',
      '/families/:id/invites',
      '/families/:id/invites/:inviteId',
      '/families/join',
      '/families/:id/expenses',
      '/families/:id/balance',
      '/families/:id/payments',
      '/families/:id/children',
      '/families/:id/children/:childId',
      '/families/:id/fixed-expenses',
      '/families/:id/fixed-expenses/:fixedExpenseId',
      '/families/:id/activity',
      '/expenses/:id',
      '/expenses/:id/question',
      '/expenses/:id/resolve',
      '/expenses/:id/satisfy',
    ],
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
