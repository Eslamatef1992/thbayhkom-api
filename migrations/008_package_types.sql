-- Types (e.g. Naimi / Harri / Australian): admins create them and choose which a package offers;
-- customers pick exactly one in the app, before the add-ons. Safe to re-run.
CREATE TABLE IF NOT EXISTS package_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  name_ar VARCHAR(255),
  status VARCHAR(255) DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS package_type_links (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  type_id INTEGER NOT NULL REFERENCES package_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS package_type_links_package_id ON package_type_links(package_id);

ALTER TABLE packages       ADD COLUMN IF NOT EXISTS has_types BOOLEAN DEFAULT FALSE;
ALTER TABLE carts          ADD COLUMN IF NOT EXISTS package_type_id INTEGER;
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS package_type_id INTEGER;
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS package_type TEXT; -- JSON snapshot {id,name,name_ar}

INSERT INTO permissions (name, description, created_at, updated_at)
SELECT v.name, v.description, now(), now()
FROM (VALUES ('types.view', 'View package types'), ('types.manage', 'Manage package types')) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, now(), now()
FROM roles r JOIN permissions p ON p.name IN ('types.view', 'types.manage')
WHERE r.name IN ('admin', 'manager')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
