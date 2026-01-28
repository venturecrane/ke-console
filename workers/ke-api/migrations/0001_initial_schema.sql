-- Kid Expenses Database Schema
-- Database: ke-main (Cloudflare D1)
-- Version: 1.0
-- Migration: 0001_initial_schema

-- ============================================
-- USERS (cached from Clerk)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- ============================================
-- FAMILIES
-- ============================================
CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    name TEXT,
    parent_a_id TEXT NOT NULL REFERENCES users(id),
    parent_b_id TEXT REFERENCES users(id),
    parent_a_ratio REAL NOT NULL DEFAULT 0.5 CHECK (parent_a_ratio >= 0 AND parent_a_ratio <= 1),
    invite_code TEXT,
    invite_expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_families_invite ON families(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_families_parent_a ON families(parent_a_id);
CREATE INDEX IF NOT EXISTS idx_families_parent_b ON families(parent_b_id);


-- ============================================
-- CHILDREN
-- ============================================
CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_children_family ON children(family_id);


-- ============================================
-- FIXED EXPENSES (templates for recurring)
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_expenses (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 200),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    category TEXT NOT NULL CHECK (category IN ('school', 'medical', 'activities', 'childcare', 'other')),
    child_ids TEXT,
    link_url TEXT,
    memo TEXT CHECK (memo IS NULL OR length(memo) <= 500),
    effective_from TEXT NOT NULL,
    effective_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_fixed_family ON fixed_expenses(family_id);
CREATE INDEX IF NOT EXISTS idx_fixed_effective ON fixed_expenses(effective_from, effective_until);


-- ============================================
-- EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    paid_by TEXT NOT NULL REFERENCES users(id),
    fixed_expense_id TEXT REFERENCES fixed_expenses(id),
    description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 200),
    amount_cents INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('school', 'medical', 'activities', 'childcare', 'other')),
    expense_date TEXT NOT NULL,
    child_ids TEXT,
    link_url TEXT,
    memo TEXT CHECK (memo IS NULL OR length(memo) <= 500),
    status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN (
        'posted', 'questioned', 'pending_satisfaction', 'resolved',
        'resolved_creator_decided', 'resolved_personal', 'resolved_deleted', 'closed_unresolved'
    )),
    questioned_by TEXT REFERENCES users(id),
    questioned_at TEXT,
    question_reason TEXT CHECK (question_reason IS NULL OR question_reason IN (
        'wrong_amount', 'not_child_related', 'duplicate', 'split_dispute', 'other'
    )),
    question_note TEXT,
    resolved_at TEXT,
    resolution_action TEXT,
    satisfied_at TEXT,
    closed_unresolved_at TEXT,
    closed_unresolved_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_expenses_family ON expenses(family_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(family_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(family_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_fixed ON expenses(fixed_expense_id);


-- ============================================
-- FIXED EXPENSE SUGGESTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_expense_suggestions (
    id TEXT PRIMARY KEY,
    fixed_expense_id TEXT NOT NULL REFERENCES fixed_expenses(id),
    expense_id TEXT NOT NULL REFERENCES expenses(id),
    suggested_by TEXT NOT NULL REFERENCES users(id),
    suggestion_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ignored')),
    resolved_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_suggestions_fixed ON fixed_expense_suggestions(fixed_expense_id);


-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id),
    paid_by TEXT NOT NULL REFERENCES users(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    payment_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_family ON payments(family_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(family_id, payment_date);


-- ============================================
-- ACTIVITY EVENTS (audit trail + feed)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_events (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    before_snapshot TEXT,
    after_snapshot TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_family ON activity_events(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_target ON activity_events(target_type, target_id);


-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at TEXT NOT NULL,
    expires_at TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_family ON subscriptions(family_id);
