-- Add frequency column to fixed_expenses table
-- Supports: weekly, biweekly, monthly, quarterly, annually
-- Default is 'monthly' for backwards compatibility

ALTER TABLE fixed_expenses ADD COLUMN frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually'));
