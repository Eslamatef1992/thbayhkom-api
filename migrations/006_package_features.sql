-- Package cards: feature lines ("Fresh meat", "Serves 24") and a badge ("Best seller"). Safe to re-run.
ALTER TABLE packages ADD COLUMN IF NOT EXISTS features TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS features_ar TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS badge VARCHAR(255);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS badge_ar VARCHAR(255);
