-- Migration: 0005_notification_preferences
-- Stores per-user, per-family notification preferences

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  expense_created INTEGER NOT NULL DEFAULT 1,
  expense_questioned INTEGER NOT NULL DEFAULT 1,
  question_resolved INTEGER NOT NULL DEFAULT 1,
  payment_recorded INTEGER NOT NULL DEFAULT 1,
  recurring_generated INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, family_id)
);
