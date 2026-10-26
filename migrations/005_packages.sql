-- Packages module: bundles of products sold at a package price. Safe to re-run.
CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  name_ar VARCHAR(255),
  description TEXT,
  description_ar TEXT,
  image VARCHAR(255),
  price_before DOUBLE PRECISION,
  price_after DOUBLE PRECISION DEFAULT 0,
  status VARCHAR(255) DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS package_products (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS package_products_package_id ON package_products(package_id);

ALTER TABLE carts          ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id) ON DELETE CASCADE;
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL;

-- Permissions for the admin panel (admins already have everything; give managers access too).
INSERT INTO permissions (name, description, created_at, updated_at)
SELECT v.name, v.description, now(), now()
FROM (VALUES ('packages.view', 'View packages'), ('packages.manage', 'Manage packages')) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.name = v.name);

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, now(), now()
FROM roles r JOIN permissions p ON p.name IN ('packages.view', 'packages.manage')
WHERE r.name IN ('admin', 'manager')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
