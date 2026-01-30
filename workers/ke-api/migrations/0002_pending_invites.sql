-- Kid Expenses Database Schema
-- Migration: 0002_pending_invites
-- Add pending_invites table for email-based invite tracking

-- ============================================
-- PENDING INVITES
-- ============================================
CREATE TABLE IF NOT EXISTS pending_invites (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id),
    invited_by TEXT NOT NULL REFERENCES users(id),
    invited_email TEXT NOT NULL,
    invite_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    accepted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_invites_family ON pending_invites(family_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_code ON pending_invites(invite_code);
