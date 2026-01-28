export interface Env {
  DB: D1Database;
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

    // API info
    if (url.pathname === '/') {
      return Response.json(
        {
          name: 'ke-api',
          version: '1.0.0',
          endpoints: ['/health'],
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
