# Thabayehkom Backend (Node.js + TypeScript)

API for the Thabayehkom Flutter app (`/api/...`) and the admin panel (`/api/admin/...`).
Express + Sequelize + PostgreSQL, JWT auth, Swagger docs at `/swagger`.

Production: `https://back.thabayehkom.app` · Admin panel repo: `thbayhkom-admin`.

---

## Run locally

Requirements: Node 20+, PostgreSQL 14+ (`brew install postgresql@16 && brew services start postgresql@16` on macOS).

```bash
npm install
cp .env.example .env            # then edit DATABASE_URL / JWT_SECRET
```

### Option A — with the production data (recommended)

```bash
createuser thabayehkom_user --pwprompt          # password: matches DATABASE_URL in .env
createdb thabayehkom_db -O thabayehkom_user
pg_restore --no-owner -d thabayehkom_db thabayehkom.dump     # custom-format dump (-Fc)
#   or, for a plain .sql dump:  psql -d thabayehkom_db -f thabayehkom.sql
npm run migrate                                  # adds columns newer code needs (safe to re-run)
npm run create-admin -- you@teknulugy.com 'YourPass123' "Your Name"   # optional: a local login
npm run dev                                      # http://localhost:3000/api
```

Keep `DB_SYNC=false` with imported data. **Do not run `npm run seed` against a real database** —
it runs `sequelize.sync({ alter: true })` and inserts demo products/pages.

### Option B — empty database with demo data

```bash
createdb thabayehkom_db
# .env: DB_SYNC=true
npm run seed          # creates tables, roles, admin (ADMIN_EMAIL / ADMIN_PASSWORD), demo catalog
npm run dev
```

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start with ts-node on `PORT` (default 3000) |
| `npm run build` / `npm start` | Compile to `dist/` / run compiled build |
| `npm run migrate` / `migrate:prod` | Apply `migrations/*.sql` (idempotent) |
| `npm run create-admin -- <email> <password> [name]` | Create or reset an admin login only |
| `npm run seed` | Fresh DB only: schema + demo data |
| `npm test` | Jest suite (in-memory SQLite, no Postgres needed) |

---

## Deploy to the VPS

```bash
# on your machine
git push origin main

# on the server (in the backend folder)
git pull
npm ci
npm run build
npm run migrate:prod
pm2 reload ecosystem.config.js   # first time: pm2 delete thabayehkom-backend && pm2 start ecosystem.config.js && pm2 save
```

### Logs

PM2 writes timestamped logs to `logs/out.log` (requests, app output) and `logs/error.log`
(errors) in the backend folder. Follow them live with `pm2 logs thabayehkom-backend`.
Rotation is handled by the `pm2-logrotate` module (already installed on the server); set it
once so old logs are kept but don't fill the disk:

```bash
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

### Payments (UPayments)

Checkout creates a UPayments charge whose `returnUrl`, `cancelUrl` and `notificationUrl` point
at this API (`PUBLIC_API_URL` + `/api/payment/return|cancel|webhook`). Every callback is
re-checked with UPayments' get-payment-status API before an order is marked paid
(`payment_status`: 0 unpaid, 1 paid, 2 failed); the raw verification is stored in
`orders.payment_check_response`. After verifying, `/payment/return` redirects to the
success/fail page the app's WebView watches for. Test in sandbox (`UPAYMENTS_SANDBOX=true`)
before switching to live.

**Before the first deploy of this version**, fix the server's `.env`: it currently has
`DB_SYNC=true` and `NODE_ENV=development`. With `DB_SYNC=true`, every restart runs
`sequelize.sync({ alter: true })`, which can drop columns the code doesn't know about. Set
`DB_SYNC=false` and let `npm run migrate:prod` handle schema changes.

The server's `.env` must have `NODE_ENV=production`, a real `JWT_SECRET` (changing it logs everyone
out), `DB_SYNC=false`, `UPAYMENTS_SANDBOX=false` + `UPAYMENTS_API_KEY` for live payments,
`MAILGUN_API_KEY`, and `UPLOAD_PUBLIC_BASE_URL=https://back.thabayehkom.app`.
`uploads/` lives on the server and is not in git — back it up separately.

If nginx limits request size, raise it for video banners (default limit here is 100 MB):
`client_max_body_size 100m;`

---

## API surfaces

- **Mobile API** (`/api/...`) matches the Flutter contract: always HTTP 200 with a
  `{ status, code, message, ... }` envelope; form-urlencoded bodies; legacy misspellings
  (`is_fevorite`, `addNewAdress`) preserved.
- **Admin API** (`/api/admin/...`): REST, `{ success, data, meta }`, real HTTP codes, JWT + RBAC.
  Generic CRUD for categories, products, banners, advertisements, countries, cities, cut-types,
  service-types, promotion-codes, pages, customers, notifications, plus:
  - `GET /admin/roles` · `GET|POST|PUT|DELETE /admin/admins` (super admins only)
  - `GET /admin/products/:id` (with `cut_type_ids`, `service_type_ids`, `images`)
  - `PUT /admin/orders/:id` and `PUT /admin/orders/:id/status`; list filters `q`, `status`, `payment_method`
  - `GET /admin/cities?level=governorate|area&parent_id=`
- **Uploads**: `POST /api/upload/single` (image), `/multiple`, `/video` (admin only), `/delete`.

Roles: `admin` (everything), `manager` (operations; no settings, customer management or admin
accounts), `customer` (app users). Seeded by `npm run seed`.

Promotion codes: `type 2` = percentage, `type 1` = fixed KWD amount. `start_date`, `end_date`
(inclusive) and `max_use` (counted from orders) are enforced at `checkPromo` and checkout.

## Repository layout

```
src/            application code (routes, models, services, presenters)
migrations/     idempotent SQL applied by `npm run migrate`
tests/          Jest + supertest
docs/           original requirements / API contract / data model notes
legacy-builds/  old compiled admin + landing page found in this repo (reference only)
```

The earlier, unfinished refactor onto the Laravel translation-table schema is preserved on the
`refactor/laravel-schema` branch.
