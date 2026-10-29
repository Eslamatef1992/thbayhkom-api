-- Extras: add-ons (free or paid) that admins attach to packages; customers tick them in the app.
-- Safe to re-run.
CREATE TABLE IF NOT EXISTS extras (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  name_ar VARCHAR(255),
  price DOUBLE PRECISION NOT NULL DEFAULT 0,   -- 0 = free
  status VARCHAR(255) DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS package_extras (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  extra_id INTEGER NOT NULL REFERENCES extras(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS package_extras_package_id ON package_extras(package_id);

-- Chosen add-ons: cart keeps the ids, the order keeps a priced snapshot.
ALTER TABLE carts          ADD COLUMN IF NOT EXISTS extra_ids TEXT;
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS extras TEXT;
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS extras_total DOUBLE PRECISION DEFAULT 0;

INSERT INTO permissions (name, description, created_at, updated_at)
SELECT v.name, v.description, now(), now()
FROM (VALUES ('extras.view', 'View extras'), ('extras.manage', 'Manage extras')) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, now(), now()
FROM roles r JOIN permissions p ON p.name IN ('extras.view', 'extras.manage')
WHERE r.name IN ('admin', 'manager')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
