-- Columns used by the admin panel and the Flutter app that the original GitHub
-- schema did not have. Safe to run more than once (IF NOT EXISTS), and safe on a
-- production pg_dump that may already contain them.
--   psql "$DATABASE_URL" -f migrations/001_admin_parity.sql

ALTER TABLE banners          ADD COLUMN IF NOT EXISTS video_url VARCHAR(255);
ALTER TABLE countries        ADD COLUMN IF NOT EXISTS icon_url  VARCHAR(255);
ALTER TABLE promotion_codes  ADD COLUMN IF NOT EXISTS max_use   INTEGER;
