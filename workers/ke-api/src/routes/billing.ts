import { Hono } from 'hono'
import type { AppType, Family, Subscription, CreateCheckoutRequest } from '../types'
import { authMiddleware } from '../middleware/auth'
import { createActivityEvent } from '../services/activity'

const app = new Hono<AppType>()

app.use('*', authMiddleware)

// Get subscription status for family
app.get('/:id/subscription', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized' }, 403)
    }

    const subscription = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE family_id = ?')
      .bind(familyId)
      .first<Subscription>()

    const plan = subscription?.plan === 'pro' && subscription.status === 'active' ? 'pro' : 'free'

    return c.json({
      plan,
      subscription: subscription || null,
      features: {
        free: {
          fixedExpenseTemplates: 2,
          historyMonths: 3,
          csvExport: false,
        },
        pro: {
          fixedExpenseTemplates: -1, // unlimited
          historyMonths: -1, // unlimited
          csvExport: true,
          price: 500, // $5.00 in cents
        },
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return c.json({ error: 'Failed to get subscription' }, 500)
  }
})

// Create Stripe Checkout session for Pro upgrade
app.post('/:id/subscription/checkout', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized' }, 403)
    }

    // Check if already Pro
    const existing = await c.env.DB.prepare(
      `SELECT * FROM subscriptions WHERE family_id = ? AND plan = 'pro' AND status = 'active'`
    )
      .bind(familyId)
      .first<Subscription>()

    if (existing) {
      return c.json({ error: 'Already subscribed to Pro' }, 400)
    }

    const stripeKey = c.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return c.json({ error: 'Stripe not configured' }, 500)
    }

    const body = await c.req.json<CreateCheckoutRequest>()
    const { returnUrl } = body

    if (!returnUrl) {
      return c.json({ error: 'returnUrl is required' }, 400)
    }

    // Get user email for Stripe customer
    const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?')
      .bind(userId)
      .first<{ email: string }>()

    // Create Stripe Checkout session via API
    const params = new URLSearchParams()
    params.set('mode', 'subscription')
    params.set('success_url', `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`)
    params.set('cancel_url', returnUrl)
    params.set('line_items[0][price_data][currency]', 'usd')
    params.set('line_items[0][price_data][product_data][name]', 'Kid Expenses Pro')
    params.set(
      'line_items[0][price_data][product_data][description]',
      'Unlimited templates, full history, CSV export'
    )
    params.set('line_items[0][price_data][unit_amount]', '500') // $5.00
    params.set('line_items[0][price_data][recurring][interval]', 'month')
    params.set('line_items[0][quantity]', '1')
    params.set('metadata[family_id]', familyId)
    params.set('metadata[user_id]', userId)
    if (user?.email) {
      params.set('customer_email', user.email)
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!stripeRes.ok) {
      const err = await stripeRes.text()
      console.error('Stripe checkout error:', err)
      return c.json({ error: 'Failed to create checkout session' }, 500)
    }

    const session = (await stripeRes.json()) as { id: string; url: string }

    return c.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Create checkout error:', error)
    return c.json({ error: 'Failed to create checkout session' }, 500)
  }
})

// Cancel subscription (downgrade at end of period)
app.post('/:id/subscription/cancel', async (c) => {
  const familyId = c.req.param('id')
  const userId = c.get('userId')

  try {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(familyId)
      .first<Family>()

    if (!family) {
      return c.json({ error: 'Family not found' }, 404)
    }

    if (family.parent_a_id !== userId && family.parent_b_id !== userId) {
      return c.json({ error: 'Not authorized' }, 403)
    }

    const subscription = await c.env.DB.prepare(
      `SELECT * FROM subscriptions WHERE family_id = ? AND plan = 'pro' AND status = 'active'`
    )
      .bind(familyId)
      .first<Subscription>()

    if (!subscription || !subscription.stripe_subscription_id) {
      return c.json({ error: 'No active Pro subscription found' }, 400)
    }

    const stripeKey = c.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return c.json({ error: 'Stripe not configured' }, 500)
    }

    // Cancel at period end (BR-048: downgrade is end-of-period)
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'cancel_at_period_end=true',
      }
    )

    if (!stripeRes.ok) {
      const err = await stripeRes.text()
      console.error('Stripe cancel error:', err)
      return c.json({ error: 'Failed to cancel subscription' }, 500)
    }

    // Update local record
    await c.env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`
    )
      .bind(subscription.id)
      .run()

    await createActivityEvent(
      c.env.DB,
      familyId,
      userId,
      'subscription.cancelled',
      'subscription',
      subscription.id,
      { plan: 'pro', status: 'active' },
      { plan: 'pro', status: 'cancelled' }
    )

    return c.json({ success: true, message: 'Subscription will cancel at end of billing period' })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return c.json({ error: 'Failed to cancel subscription' }, 500)
  }
})

export default app
