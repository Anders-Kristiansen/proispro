-- =============================================================================
-- Migration: Security Fixes
-- =============================================================================
-- 1. collection_discs — add missing UPDATE policy (sort_order was silently
--    failing; Postgres RLS requires a SELECT policy before UPDATE applies,
--    but the UPDATE policy itself was absent)
-- 2. sale_tokens — remove broad public SELECT policy that allowed enumeration
--    of ALL public tokens; replace with a SECURITY DEFINER function that only
--    returns data for a specific token UUID
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. collection_discs — UPDATE policy (CRIT: Basher C1)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "collection_discs_owner_update" ON collection_discs
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_id AND c.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM collections c
        WHERE c.id = collection_id AND c.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. sale_tokens — fix token enumeration (HIGH: Danny H-1 / Basher H1)
--
--    The previous "sale_tokens_public_read" policy allowed anon to run:
--      SELECT * FROM sale_tokens WHERE is_public = true
--    and enumerate ALL public sale tokens (and thus all users with public
--    sale pages).
--
--    Fix: drop that broad policy and replace with a SECURITY DEFINER function
--    that accepts a specific token UUID and returns only that row. Anon users
--    can no longer bulk-query sale_tokens; they can only call lookup_sale_token
--    with a token they already possess.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "sale_tokens_public_read" ON sale_tokens;

CREATE OR REPLACE FUNCTION public.lookup_sale_token(p_token UUID)
RETURNS TABLE(user_id UUID, is_public BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT st.user_id, st.is_public
  FROM sale_tokens st
  WHERE st.token = p_token;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_sale_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_sale_token(UUID) TO authenticated;
