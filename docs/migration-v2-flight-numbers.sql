-- ProIsPro v2: Split flight number into individual columns
-- Run this in the Supabase SQL Editor after the initial migration (migration-sql.sql)
-- The legacy `flight` TEXT column is kept for backward compatibility

ALTER TABLE discs ADD COLUMN IF NOT EXISTS speed INTEGER;
ALTER TABLE discs ADD COLUMN IF NOT EXISTS glide INTEGER;
ALTER TABLE discs ADD COLUMN IF NOT EXISTS turn  INTEGER;
ALTER TABLE discs ADD COLUMN IF NOT EXISTS fade  INTEGER;
