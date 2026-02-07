import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppType, Env } from './types';
import { generateAllFamilyExpenses } from './services/activity';
import { sendGenerationSummary } from './services/notifications';

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
import billingRoutes from './routes/billing';
import webhookRoutes from './routes/webhooks';
import notificationPrefsRoutes from './routes/notification-prefs';
import exportRoutes from './routes/export';

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
app.route('/me', notificationPrefsRoutes);
app.route('/families', familiesRoutes);
app.route('/families', expensesRoutes);
app.route('/families', paymentsRoutes);
app.route('/families', childrenRoutes);
app.route('/families', fixedExpensesRoutes);
app.route('/families', activityRoutes);
app.route('/families', exportRoutes);
app.route('/expenses', expenseActionsRoutes);
app.route('/families', billingRoutes);
app.route('/webhooks', webhookRoutes);

// API info
app.get('/', (c) => {
  return c.json({
    name: 'ke-api',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/users/sync',
      '/me',
      '/me/notification-preferences',
      '/families',
      '/families/:id',
      '/families/:id/invite',
      '/families/:id/invite/email',
      '/families/:id/invites',
      '/families/:id/invites/:inviteId',
      '/families/join',
      '/families/:id/expenses',
      '/families/:id/expenses/export/csv',
      '/families/:id/balance',
      '/families/:id/payments',
      '/families/:id/payments/export/csv',
      '/families/:id/children',
      '/families/:id/children/:childId',
      '/families/:id/fixed-expenses',
      '/families/:id/fixed-expenses/:fixedExpenseId',
      '/families/:id/activity',
      '/families/:id/subscription',
      '/families/:id/subscription/checkout',
      '/families/:id/subscription/cancel',
      '/webhooks/stripe',
      '/expenses/:id',
      '/expenses/:id (PATCH)',
      '/expenses/:id (DELETE)',
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

// Export the Hono app for testing
export { app };

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        try {
          const result = await generateAllFamilyExpenses(env.DB);
          console.log(
            `Cron: Generated ${result.totalGenerated} expenses for ${result.familiesProcessed} families.` +
            (result.errors.length > 0 ? ` Errors: ${result.errors.join('; ')}` : '')
          );

          // Send generation summary emails (fire-and-forget)
          if (result.totalGenerated > 0 && result.generatedDetails.length > 0) {
            try {
              await sendGenerationSummary(env.DB, env, result.generatedDetails);
            } catch (emailError) {
              console.error('Failed to send generation summary emails:', emailError);
            }
          }
        } catch (error) {
          console.error('Cron error:', error);
        }
      })()
    );
  },
};
