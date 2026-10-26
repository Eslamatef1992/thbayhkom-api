-- Production had products.url_link renamed to url_video_url (a find/replace accident),
-- plus a stray products.link column. Restore url_link, keeping any data. Safe to re-run.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'url_video_url')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'url_link') THEN
    ALTER TABLE products RENAME COLUMN url_video_url TO url_link;
  END IF;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS url_link VARCHAR(255);
END $$;
