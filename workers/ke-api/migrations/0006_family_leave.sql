-- Migration: 0006_family_leave
-- Add status column to families and allow parent_a_id to be nullable for leave flow

-- Add status column to families (NULL = active, 'archived' = both parents left)
ALTER TABLE families ADD COLUMN status TEXT DEFAULT NULL;
