-- ProIsPro v5: Bag configurations + Course pinning
-- Run in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ── Bag configurations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bags (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  disc_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bags_user_id ON bags(user_id);

ALTER TABLE bags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bags"   ON bags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bags" ON bags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bags" ON bags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bags" ON bags FOR DELETE USING (auth.uid() = user_id);

-- ── Course-to-bag pins ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_pins (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name  TEXT NOT NULL,
  course_id    TEXT,
  bag_id       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_pins_user_id ON course_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_course_pins_bag_id  ON course_pins(bag_id);

ALTER TABLE course_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pins"   ON course_pins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own pins" ON course_pins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pins" ON course_pins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pins" ON course_pins FOR DELETE USING (auth.uid() = user_id);
