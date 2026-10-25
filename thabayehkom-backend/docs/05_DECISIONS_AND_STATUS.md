# Thabayehkom Backend — Decisions & Status Log

**Update this file every working session.** It is the handoff record between AI models/developers.

## Current status

- Phase 1 (Analysis): ✅ complete
- Phase 2 (Requirements spec): ✅ complete → `01_REQUIREMENTS.md`
- Phase 3 (Gap review vs openapi.yaml + Flutter): ✅ complete → `01_REQUIREMENTS.md` §21
- Phase 4 (Implementation plan): ✅ complete → `04_IMPLEMENTATION_PLAN.md`
- API contract: ✅ `02_API_CONTRACT.md`
- Data model: ✅ `03_DATA_MODEL.md`
- **Backend implementation: ✅ IN PLACE (v1).** TypeScript + Express + Sequelize. All mobile endpoints,
  the admin dashboard API with RBAC, a seeder (admin user + roles/permissions + demo data), and a
  Jest/supertest suite (9 tests passing) are implemented. `tsc` compiles clean.

### What was built
- `src/config` env loader; `src/db/sequelize.ts` (SQLite dev/test, Postgres prod).
- `src/db/models.ts` — all mobile + RBAC tables (users, roles, permissions, role_permissions, user_roles,
  countries/translations, cities, categories, cut/service types, products + images + type links, favorites,
  addresses, carts, promotion_codes, orders + order_products, banners, advertisements, notifications,
  settings, pages, contact_messages) with associations.
- Middleware: `auth` (authRequired/authOptional + header context), `adminAuth` (RBAC + requirePermission),
  `error` (dual envelope/REST handler).
- Presenters (`presenters/catalog.ts`, `presenters/app.ts`) map rows → exact contract JSON.
- Mobile routes: app, catalog, account (email + Google + Apple, incl. code 222 flow), address, cart,
  checkout/orders, notifications + payment callback.
- Admin routes: auth/login+me+roles+permissions, dashboard stats, orders management, product create/update
  with relations, settings, contact inbox, and a generic permission-guarded `crudRouter` for
  categories/products/banners/ads/countries/cities/cut-types/service-types/promotions/pages/customers/notifications.
- `src/db/seed.ts` — idempotent seeder: 29 permissions, roles (admin/manager/customer), initial admin,
  settings singleton, 3 countries + translations + gov/city, catalog (categories, cut/service types, 4
  products with images + links), banner, advertisement, WELCOME10 promo, CMS pages (about/terms/privacy).
- `tests/api.test.ts` — mobile contract + admin dashboard + RBAC negative test.

### Verified
- `npx tsc` compiles with no errors.
- `npm run seed` runs and prints the admin credentials.
- `npm test` → 9/9 passing (jest emits a banner to stderr which makes PowerShell show a non-zero code, but
  the suite passes).


## What was analyzed (sources of truth)
- `lib/controllers/api_controller.dart` — most endpoints, headers, bodies.
- `lib/controllers/cart_controller.dart` — cart, promo, checkout, buy-now, delivery cost, terminate account.
- `lib/models/*.dart`, `lib/responses/*.dart` — exact JSON keys the app parses.
- `lib/views/**` — status/code UI branching (200 success, 222 finish-social-signup), payment_type mapping,
  payment WebView success/fail redirect contract (`lib/views/other/webview.dart`).
- `lib/utils/constants.dart` — base URL `https://thabayehkom.app/api/`, headers (fcmToken, countryId,
  Accept-Language, Authorization).
- `openapi.yaml` (repo root) — prior partial reconstruction; found to be a strict subset (see gap review).

## Decisions
- **D1**: Use **TypeScript** despite the plain-JS scaffold. Reason: the JSON contract is strict and
  misspelling-sensitive; static typing + a presenter layer reduce drift risk. Action: `tsconfig` + ts-jest.
- **D2**: Keep **Sequelize** (from scaffold) rather than switching to Prisma, to minimize churn and reuse
  migrations/seeders. Revisit if typing friction is high.
- **D3**: **Envelope-always at HTTP 200**. All endpoints return HTTP 200 with `{status,code,message,...}`;
  business outcome lives in `code` (200 ok, 222 finish social signup, others = failure shown as message).
  Reason: the Dart client never branches on HTTP status.
- **D4**: **Preserve misspelled identifiers** (`addNewAdress`, `updateAdress`, `is_fevorite`, `messag_type`,
  `defult`, `is_alowed_*`, `admin_commission_parcent`) and camelCase outliers (`deliveryCost`,
  `paginateTotal`, `whatsApp`). Reason: the app depends on them verbatim.
- **D5**: **Long-lived JWT** (30–90 days) because the app has no refresh flow. Tradeoff: weaker revocation;
  mitigate with `logout` token invalidation list if needed.
- **D6**: **Payment behind an adapter**; ship **COD** first. Online gateway (KNET/SADAD/NAPS/Credit) deferred
  until Q1 answered. Gateway must redirect WebView to hardcoded success/fail URLs with `transaction_id`.
- **D7**: **cart guest-keying by `fcmToken`**, user carts by user id; both merged on login is a future option
  (not required by the app).
- **D8**: Governorate vs city modeled in one `city` table via `parent_id` (A8), pending confirmation.

## Open questions (mirror of 01_REQUIREMENTS §19 — resolve and record answers here)
- Q1 Payment gateway provider? (blocks online checkout) — **UNANSWERED**
- Q2 Special `code` values beyond 200/222? — low risk, **UNANSWERED**
- Q3 Account activation/verification enforced + channel? — **UNANSWERED**
- Q4 Points/loyalty used in mobile flow? — likely no, **UNCONFIRMED**
- Q5 `appointment_price` vestigial? — **UNCONFIRMED**
- Q6 Promo `type`: 2=percent else fixed? — **UNCONFIRMED**

## Assumptions in force (see 01_REQUIREMENTS §18)
A1 envelope@200 · A2 JWT · A3 online→url/COD→none · A4 long-lived token · A5 IP geo client-side ·
A6 changeQuantity type 1/2 · A7 sorting_type mapping · A8 governorate/city one table.

## Next actions (start here next session)
1. Get answers to Q1 (payment) and Q6 (promo) from the product owner if possible.
2. Begin Phase 0 (T0.1–T0.5): TS conversion + Express app + envelope/error middleware + DB init.
3. Then Phase 1 models/migrations/seeders per `03_DATA_MODEL.md`.
4. Implement endpoints in the phase order in `04_IMPLEMENTATION_PLAN.md`, writing a contract integration
   test for each (assert exact JSON keys).

## Change log
- (this session) Created docs set: `00_INDEX`, `01_REQUIREMENTS`, `02_API_CONTRACT`, `03_DATA_MODEL`,
  `04_IMPLEMENTATION_PLAN`, `05_DECISIONS_AND_STATUS`. Completed Phases 1–4 analysis/spec/plan. No code yet.
