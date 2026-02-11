import { Hono } from 'hono'
import type { AppType, Subscription } from '../types'
import { generateId } from '../utils'
import { createActivityEvent } from '../services/activity'

const app = new Hono<AppType>()

// No auth middleware — Stripe sends webhooks directly

// Stripe webhook handler
app.post('/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature')
    const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      return c.json({ error: 'Missing signature or webhook secret' }, 400)
    }

    // Parse the raw body
    const body = await c.req.text()

    // Verify webhook signature using Stripe's signing scheme
    const verified = await verifyStripeSignature(body, signature, webhookSecret)
    if (!verified) {
      return c.json({ error: 'Invalid signature' }, 400)
    }

    const event = JSON.parse(body) as StripeEvent

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(c.env.DB, event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(c.env.DB, event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(c.env.DB, event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(c.env.DB, event.data.object)
        break
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }

    return c.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return c.json({ error: 'Webhook handler failed' }, 500)
  }
})

// Stripe signature verification
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signature.split(',')
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2)
    const sig = parts.find((p) => p.startsWith('v1='))?.slice(3)

    if (!timestamp || !sig) return false

    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - parseInt(timestamp)) > 300) return false

    const signedPayload = `${timestamp}.${payload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return expectedSig === sig
  } catch {
    return false
  }
}

// Minimal Stripe event types
interface StripeEvent {
  type: string
  data: {
    object: Record<string, unknown>
  }
}

async function handleCheckoutCompleted(db: D1Database, session: Record<string, unknown>) {
  const familyId = (session.metadata as Record<string, string>)?.family_id
  const userId = (session.metadata as Record<string, string>)?.user_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!familyId || !subscriptionId) {
    console.error('Checkout session missing family_id or subscription_id')
    return
  }

  // Check if subscription record exists
  const existing = await db
    .prepare('SELECT * FROM subscriptions WHERE family_id = ?')
    .bind(familyId)
    .first<Subscription>()

  if (existing) {
    // Update existing
    await db
      .prepare(
        `UPDATE subscriptions SET
        plan = 'pro',
        status = 'active',
        stripe_customer_id = ?,
        stripe_subscription_id = ?,
        started_at = datetime('now'),
        updated_at = datetime('now')
       WHERE family_id = ?`
      )
      .bind(customerId, subscriptionId, familyId)
      .run()
  } else {
    // Create new subscription record
    const id = generateId()
    await db
      .prepare(
        `INSERT INTO subscriptions (
        id, family_id, plan, status, stripe_customer_id, stripe_subscription_id,
        started_at, created_at, updated_at
      ) VALUES (?, ?, 'pro', 'active', ?, ?, datetime('now'), datetime('now'), datetime('now'))`
      )
      .bind(id, familyId, customerId, subscriptionId)
      .run()
  }

  // Log activity event (BR-047: upgrade is immediate)
  if (userId) {
    await createActivityEvent(
      db,
      familyId,
      userId,
      'subscription.upgraded',
      'subscription',
      familyId,
      { plan: 'free' },
      { plan: 'pro' }
    )
  }
}

async function handleSubscriptionUpdated(db: D1Database, subscription: Record<string, unknown>) {
  const stripeSubId = subscription.id as string
  const status = subscription.status as string
  const currentPeriodStart = subscription.current_period_start as number
  const currentPeriodEnd = subscription.current_period_end as number

  const periodStart = currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null

  // Map Stripe status to our status
  let localStatus: string = 'active'
  if (status === 'canceled' || status === 'unpaid') {
    localStatus = 'cancelled'
  } else if (status === 'past_due') {
    localStatus = 'active' // Keep active but may want to warn
  }

  await db
    .prepare(
      `UPDATE subscriptions SET
      status = ?,
      current_period_start = ?,
      current_period_end = ?,
      updated_at = datetime('now')
     WHERE stripe_subscription_id = ?`
    )
    .bind(localStatus, periodStart, periodEnd, stripeSubId)
    .run()
}

async function handleSubscriptionDeleted(db: D1Database, subscription: Record<string, unknown>) {
  const stripeSubId = subscription.id as string

  await db
    .prepare(
      `UPDATE subscriptions SET
      status = 'expired',
      plan = 'free',
      expires_at = datetime('now'),
      updated_at = datetime('now')
     WHERE stripe_subscription_id = ?`
    )
    .bind(stripeSubId)
    .run()
}

async function handlePaymentFailed(db: D1Database, invoice: Record<string, unknown>) {
  const stripeSubId = invoice.subscription as string
  if (!stripeSubId) return

  // Log the failure but don't immediately downgrade
  console.error(`Payment failed for subscription ${stripeSubId}`)

  // Stripe will retry and eventually cancel — we handle that in subscription.deleted
}

export default app
