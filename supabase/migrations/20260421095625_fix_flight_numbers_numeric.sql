-- =============================================================================
-- Migration: Fix flight number column types (INTEGER → NUMERIC)
-- =============================================================================
-- Disc flight numbers like turn=-1.5 or glide=5.5 are common and were rejected
-- by INTEGER columns. Alter all four to NUMERIC(4,1) to allow one decimal place.
-- Idempotent: only alters columns that are currently an integer type.
-- =============================================================================

DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['speed','glide','turn','fade']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name  = 'discs'
        AND column_name = col
        AND data_type IN ('integer','smallint','bigint')
    ) THEN
      EXECUTE format('ALTER TABLE discs ALTER COLUMN %I TYPE NUMERIC(4,1) USING %I::numeric', col, col);
    END IF;
  END LOOP;
END $$;
