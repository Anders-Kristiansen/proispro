-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ ProIsPro v4: User Disc Photo Upload                                      ║
-- ║ Purpose: Add user_photo_url to disc_wear_adjustments + Storage policies  ║
-- ║ Author:  Basher (Data Wrangler)                                           ║
-- ║ Date:    2025-05                                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- A) Schema delta — Add user_photo_url to disc_wear_adjustments
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE disc_wear_adjustments
  ADD COLUMN IF NOT EXISTS user_photo_url TEXT;

COMMENT ON COLUMN disc_wear_adjustments.user_photo_url IS
  'Supabase Storage path to user-uploaded disc photo. Format: {user_id}/{id}.{ext}. Resolve with storage.from(''disc-photos'').getPublicUrl()';

-- ─────────────────────────────────────────────────────────────────────────────
-- B) Supabase Storage bucket setup
-- ─────────────────────────────────────────────────────────────────────────────

-- SUPABASE STORAGE SETUP (run in Supabase Dashboard → Storage)
-- 1. Create bucket: disc-photos (public: false)
--    Dashboard: Storage → New bucket → Name: disc-photos → Public: OFF
--    Or via API:
--      curl -X POST 'https://<project-ref>.supabase.co/storage/v1/bucket' \
--        -H 'Authorization: Bearer <service_role_key>' \
--        -H 'Content-Type: application/json' \
--        -d '{"id": "disc-photos", "name": "disc-photos", "public": false}'
--
-- 2. Enable RLS on the bucket (enabled by default on non-public buckets)
--
-- 3. Apply the Storage RLS policies below in Supabase SQL Editor:

-- Allow authenticated users to upload to their own prefix ({user_id}/*)
CREATE POLICY "users can upload own disc photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'disc-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own photos
CREATE POLICY "users can read own disc photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'disc-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update (replace) their own photos
CREATE POLICY "users can update own disc photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'disc-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own photos
CREATE POLICY "users can delete own disc photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'disc-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- C) Helper view — User discs with effective flight numbers + photo
-- ─────────────────────────────────────────────────────────────────────────────

-- Security: SECURITY INVOKER (default) — RLS on disc_wear_adjustments applies,
-- so each caller sees only their own rows. No SECURITY DEFINER needed.

CREATE OR REPLACE VIEW v_user_disc_with_photo AS
SELECT
  dwa.id                              AS adjustment_id,
  dwa.user_disc_id,
  dwa.user_id,
  dwa.user_photo_url,
  dc.pic                              AS catalog_pic,
  dc.name,
  dc.brand,
  dc.speed  + dwa.speed_offset        AS effective_speed,
  dc.glide  + dwa.glide_offset        AS effective_glide,
  dc.turn   + dwa.turn_offset         AS effective_turn,
  dc.fade   + dwa.fade_offset         AS effective_fade,
  dwa.notes,
  dwa.created_at,
  dwa.updated_at
FROM disc_wear_adjustments dwa
LEFT JOIN disc_catalog dc ON dwa.catalog_disc_id = dc.id;

COMMENT ON VIEW v_user_disc_with_photo IS
  'Per-user disc adjustments joined with catalog data. Effective flight numbers = catalog base + wear offsets. '
  'user_photo_url is the Storage path; resolve with supabase.storage.from(''disc-photos'').getPublicUrl(user_photo_url). '
  'Security invoker — RLS from disc_wear_adjustments filters to caller''s rows only.';

-- ═════════════════════════════════════════════════════════════════════════════
-- Migration complete. Next steps:
-- 1. Run section A in Supabase SQL Editor (ALTER TABLE is safe on live data)
-- 2. Create the disc-photos bucket in Supabase Dashboard (section B)
-- 3. Run storage RLS policies in SQL Editor (section B)
-- 4. Run section C to create/replace the helper view
-- 5. Frontend: on photo upload, store path as '{user_id}/{adjustment_id}.jpg'
--    then save that path into disc_wear_adjustments.user_photo_url
-- ═════════════════════════════════════════════════════════════════════════════
