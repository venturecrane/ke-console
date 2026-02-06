import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppType } from './types';

// Route modules
import usersRoutes from './routes/users';
import meRoutes from './routes/me';
import familiesRoutes from './routes/families';
import expensesRoutes from './routes/expenses';
import expenseActionsRoutes from './routes/expense-actions';
import paymentsRoutes from './routes/payments';
import childrenRoutes from './routes/children';
import fixedExpensesRoutes from './routes/fixed-expenses';
import activityRoutes from './routes/activity';

const app = new Hono<AppType>();

// CORS middleware
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'https://ke-console.vercel.app',
      'http://localhost:3000',
    ];
    // Allow all Vercel preview deploys
    if (origin?.endsWith('.vercel.app')) return origin;
    return allowed.includes(origin ?? '') ? origin! : null as unknown as string;
  },
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

// Mount routes
app.route('/users', usersRoutes);
app.route('/me', meRoutes);
app.route('/families', familiesRoutes);
app.route('/families', expensesRoutes);
app.route('/families', paymentsRoutes);
app.route('/families', childrenRoutes);
app.route('/families', fixedExpensesRoutes);
app.route('/families', activityRoutes);
app.route('/expenses', expenseActionsRoutes);

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

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
