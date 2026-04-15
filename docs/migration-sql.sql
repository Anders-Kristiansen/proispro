-- ProIsPro: Supabase PostgreSQL schema for disc inventory
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE discs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  manufacturer TEXT,
  disc_type TEXT,
  plastic TEXT,
  weight TEXT,
  color TEXT,
  condition TEXT,
  flight TEXT,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_discs_user_id ON discs(user_id);

ALTER TABLE discs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own discs" ON discs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own discs" ON discs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own discs" ON discs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own discs" ON discs FOR DELETE USING (auth.uid() = user_id);
