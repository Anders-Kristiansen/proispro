-- =============================================================================
-- Migration: Fix weight column type (INTEGER → NUMERIC)
-- =============================================================================
-- Disc weights like 174.5g are valid but were rejected by the INTEGER column.
-- Alter to NUMERIC(5,1) to allow one decimal place (e.g. 174.5).
-- Idempotent: only alters if the column is currently an integer type.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discs'
      AND column_name = 'weight'
      AND data_type IN ('integer', 'smallint', 'bigint')
  ) THEN
    ALTER TABLE discs ALTER COLUMN weight TYPE NUMERIC(5,1) USING weight::numeric;
  END IF;
END $$;
