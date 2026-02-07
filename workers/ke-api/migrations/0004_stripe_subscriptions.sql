-- Migration: 0004_stripe_subscriptions
-- Purpose: Extend subscriptions table with Stripe billing fields

ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE subscriptions ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'pro'));
ALTER TABLE subscriptions ADD COLUMN current_period_start TEXT;
ALTER TABLE subscriptions ADD COLUMN current_period_end TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe
  ON subscriptions(stripe_customer_id);
