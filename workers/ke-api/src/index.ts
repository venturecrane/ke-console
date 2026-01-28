export interface Env {
  DB: D1Database;
}

interface UserSyncRequest {
  id: string;
  email: string;
  name?: string | null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      try {
        const result = await env.DB.prepare('SELECT 1 as ok').first();
        return Response.json(
          { status: 'ok', db: result?.ok === 1 ? 'connected' : 'error' },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          { status: 'error', db: 'disconnected', error: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // User sync endpoint - creates or updates user from Clerk
    if (url.pathname === '/users/sync' && request.method === 'POST') {
      try {
        const body = await request.json() as UserSyncRequest;
        const { id, email, name } = body;

        if (!id || !email) {
          return Response.json(
            { error: 'Missing required fields: id and email' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Check if user already exists
        const existingUser = await env.DB.prepare(
          'SELECT id FROM users WHERE id = ?'
        ).bind(id).first();

        if (existingUser) {
          // Update existing user
          await env.DB.prepare(
            `UPDATE users SET email = ?, name = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(email, name || null, id).run();

          return Response.json(
            { success: true, action: 'updated', userId: id },
            { headers: corsHeaders }
          );
        } else {
          // Create new user
          await env.DB.prepare(
            `INSERT INTO users (id, email, name, created_at, updated_at)
             VALUES (?, ?, ?, datetime('now'), datetime('now'))`
          ).bind(id, email, name || null).run();

          return Response.json(
            { success: true, action: 'created', userId: id },
            { headers: corsHeaders }
          );
        }
      } catch (error) {
        console.error('User sync error:', error);
        return Response.json(
          { error: 'Failed to sync user', details: String(error) },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Get current user info
    if (url.pathname === '/me' && request.method === 'GET') {
      // TODO: Add Clerk JWT verification
      return Response.json(
        { error: 'Not implemented - requires auth' },
        { status: 501, headers: corsHeaders }
      );
    }

    // API info
    if (url.pathname === '/') {
      return Response.json(
        {
          name: 'ke-api',
          version: '1.0.0',
          endpoints: ['/health', '/users/sync', '/me'],
        },
        { headers: corsHeaders }
      );
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  },
};
