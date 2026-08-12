# Thabayehkom Backend (Node.js + TypeScript)

Compatible API for the Thabayehkom Flutter app, plus an admin dashboard API with RBAC.
Full analysis and contract live in [`docs/`](docs/00_INDEX.md).

## Stack
Express + TypeScript, Sequelize ORM (SQLite for dev/test, Postgres for prod), JWT auth, bcrypt,
Joi-ready validation, helmet/cors/rate-limit.

## Quick start
```bash
cd backend
cp .env.example .env        # adjust as needed (defaults use SQLite)
npm install
npm run seed                # creates schema + admin user + demo data
npm run dev                 # http://localhost:3000/api
```

## Database (aligned to the leader's Laravel schema)
The models now match the leader's schema in `thabayehkom-backend-database/`:
- Names/descriptions live in `*_translations` tables (en/ar). The API resolves them per request
  `Accept-Language` and still returns the flat `name`/`description`/`title` keys the Flutter app expects — mobile request/response shapes are unchanged.
- Separate `admins` table (not app `users`) with `roles` + `permissions` + `role_permissions`.
- `product_categories` pivot, `user_addresses`, `notify` + `notify_translations`, soft deletes (`deleted_at`).
- Cities table holds governorates (`parent_id` null) and cities.

Set Postgres in `.env`:
```
DB_DIALECT=postgres
DATABASE_URL=postgres://thabayehkom_user:password@127.0.0.1:5432/thabayehkom_db
```
For dev, `DB_SYNC=true` lets Sequelize create/adjust tables. For production, create the schema from the
leader's `thabayehkom-backend-database/DATABASE_COMPLETE.sql` (or Laravel migrations) and set `DB_SYNC=false`,
then run `npm run seed` to load the initial admin + base data.

## File uploads
Any authenticated user (customer or admin) can upload images. Files are stored in `UPLOAD_DIR`
(default `./uploads`) and served statically at `/uploads/<filename>`.

- `POST /api/upload/single` — multipart field `file` → `{ status, code, url, filename }`
- `POST /api/upload/multiple` — multipart field `files` (up to 10) → `{ status, code, urls[], files[] }`
- `POST /api/upload/delete` (or `DELETE /api/upload/delete`) — body/query `url` or `filename` → deletes it

All require `Authorization: Bearer <token>`. Only image types (jpeg/png/webp/gif) are accepted, max
`UPLOAD_MAX_FILE_MB` (default 5 MB). Returned URLs use `UPLOAD_PUBLIC_BASE_URL` if set, otherwise the
request host. Documented under the **Uploads** tag in Swagger.

## API documentation (Swagger)
Interactive docs are served at **`/swagger`** and the raw OpenAPI 3.0 spec at **`/swagger.json`**:
```
http://localhost:3000/swagger
http://localhost:3000/swagger.json
```
The spec documents **both** surfaces (mobile envelope API + admin REST API) with tags, parameters, request
bodies, and the bearer security scheme. To try authenticated calls: hit `/login` (or `/admin/auth/login`),
copy the token, click **Authorize** in Swagger UI, and paste it (auth is persisted across reloads).

Build & run production:
```bash
npm run build && npm start
```

Run tests (in-memory SQLite):
```bash
npm test
```

## Initial admin
The seeder creates an admin from `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), defaulting to:
```
admin@thabayehkom.app / Admin@12345
```
Log in at `POST /api/admin/auth/login` → returns `{ token }`. Send it as `Authorization: Bearer <token>`.
**Change the password in production.**

## Two API surfaces
- **Mobile API** (`/api/...`): matches the Flutter contract exactly — always HTTP 200 with a
  `{ status, code, message, ... }` envelope; POST bodies are form-urlencoded; misspelled keys/paths
  (`is_fevorite`, `addNewAdress`, `updateAdress`) preserved.
- **Admin API** (`/api/admin/...`): conventional REST (`{ success, data, meta }`, real HTTP codes),
  JWT + role/permission checks.

## RBAC
- Roles: `admin` (all permissions), `manager` (operational subset), `customer` (mobile user).
- Permissions are fine-grained (`orders.view`, `products.manage`, `settings.manage`, ...) and seeded
  automatically. Admin routes are guarded by `requirePermission(...)`.

## Admin endpoints (summary)
- `POST /api/admin/auth/login`, `GET /api/admin/auth/me`, `GET /api/admin/auth/roles`, `.../permissions`
- `GET /api/admin/dashboard/stats`
- Orders: `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PUT /api/admin/orders/:id/status`
- Products: `POST/PUT /api/admin/products(/:id)` (with images + cut/service links), plus CRUD list/get/delete
- CRUD resources: categories, banners, advertisements, countries, cities, cut-types, service-types,
  promotion-codes, pages, customers, notifications
- Settings: `GET/PUT /api/admin/settings`
- Contact inbox: `GET /api/admin/contact-messages`

## Payments
Cash on Delivery works end-to-end. Online gateways (KNET/SADAD/NAPS/Credit) are behind an adapter
(`src/services/payment.ts`) and currently return a **mock** redirect URL — the real provider is an open
question (docs Q1). The callback at `GET /api/payment/callback` finalizes payment and redirects the app's
WebView to the hardcoded success/fail URLs with `transaction_id`.

## Notes
- Postgres: set `DB_DIALECT=postgres` and `DATABASE_URL`. Dev uses `sequelize.sync({ alter: true })`;
  for production, generate proper migrations before going live.
- See `docs/05_DECISIONS_AND_STATUS.md` for decisions, assumptions, and remaining work.
