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

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
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
    ],
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
