-- Upgrade media URLs on our own host from http:// to https:// (iOS blocks plain-http media).
-- Safe to re-run.
UPDATE banners SET image = replace(image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image LIKE 'http://back.thabayehkom.app%';
UPDATE banners SET video_url = replace(video_url, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE video_url LIKE 'http://back.thabayehkom.app%';
UPDATE advertisements SET image = replace(image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image LIKE 'http://back.thabayehkom.app%';
UPDATE categories SET image = replace(image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image LIKE 'http://back.thabayehkom.app%';
UPDATE products SET image = replace(image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image LIKE 'http://back.thabayehkom.app%';
UPDATE product_images SET image = replace(image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image LIKE 'http://back.thabayehkom.app%';
UPDATE countries SET image = replace(image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image LIKE 'http://back.thabayehkom.app%';
UPDATE countries SET icon_url = replace(icon_url, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE icon_url LIKE 'http://back.thabayehkom.app%';
UPDATE settings SET logo = replace(logo, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE logo LIKE 'http://back.thabayehkom.app%';
UPDATE settings SET image = replace(image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image LIKE 'http://back.thabayehkom.app%';
UPDATE settings SET banner_image = replace(banner_image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE banner_image LIKE 'http://back.thabayehkom.app%';
UPDATE users SET image_profile = replace(image_profile, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image_profile LIKE 'http://back.thabayehkom.app%';
UPDATE pages SET image = replace(image, 'http://back.thabayehkom.app', 'https://back.thabayehkom.app') WHERE image LIKE 'http://back.thabayehkom.app%';
