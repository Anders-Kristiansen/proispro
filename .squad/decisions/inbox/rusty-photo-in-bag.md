# Decision: Disc Photo Upload — Moved to Bag Edit Modal

**Author:** Rusty (Frontend Dev)
**Date:** 2026-05

## Decision

Photo upload functionality has been **removed from the Flight Guide catalog** (`flight-guide.html` / `flight-guide.js`) and **added exclusively to the Bag Edit modal** (`index.html` / `app.js`).

## Rationale

The Flight Guide is a **public catalog browser** — it shows discs from the shared catalog, not discs the user owns. Adding photo upload there was architecturally wrong: users shouldn't be able to tag photos onto catalog discs they might not own.

Photos only make sense for **owned discs** in the user's personal bag. The Edit Disc modal in `index.html` is the correct location — it is only accessible when editing an existing disc (`formId` is set), so the photo upload UI is never shown when adding a new disc.

## What Changed

- `flight-guide.html`: `fg-modal-image-col` now always shows the SVG flight chart only (no photo overlay, no hidden file input, no preview)
- `flight-guide.js`: Removed `photoPreview`, `photoFile`, `photoUploading` state + all 5 photo methods (`triggerPhotoUpload`, `handlePhotoSelected`, `cancelPhotoUpload`, `uploadDiscPhoto`, `removeDiscPhoto`)
- `index.html`: Added photo thumbnail to disc cards; added photo upload section to Edit modal (guarded by `x-show="formId"`)
- `app.js`: Added `photoPreview`/`photoFile`/`photoUploading` state, `user_photo_url` in `fromDbDisc`/`toDbDisc`/`saveDisc`, photo reset in `closeModals`, and all 5 photo methods operating on `discs` table
- `docs/migration-v4-disc-photos.sql`: Added `ALTER TABLE discs ADD COLUMN IF NOT EXISTS user_photo_url TEXT` (photos now stored on the `discs` table, not `disc_wear_adjustments`)

## Storage Key

`{user_id}/{disc_id}.{ext}` in the `disc-photos` Supabase Storage bucket. The `disc_id` is the UUID primary key of the row in the `discs` table.
