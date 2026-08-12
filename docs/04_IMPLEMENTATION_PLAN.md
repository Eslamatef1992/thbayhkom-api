# Thabayehkom Backend — Implementation Plan (v1)

Prereqs: read `01_REQUIREMENTS.md`, `02_API_CONTRACT.md`, `03_DATA_MODEL.md` first.

## 1. Technology choices (with reasons)
- **Runtime/Language**: Node.js + **TypeScript**. Reason: type safety guards the strict JSON contract and
  improves maintainability. (Existing `backend/package.json` scaffolds plain JS + Sequelize; we upgrade to
  TS — see Decision D1 in `05_DECISIONS_AND_STATUS.md`.)
- **HTTP framework**: **Express 4**. Already scaffolded, minimal, easy urlencoded parsing + custom headers.
- **DB**: **PostgreSQL**. Relational data with clear FKs; matches scaffold.
- **ORM**: **Sequelize** (kept from scaffold) with typed models. Minimizes churn vs scaffold; migrations +
  seeders available. (Prisma is an alternative — D2.)
- **Validation**: **Joi** (in scaffold). 
- **Auth**: **jsonwebtoken** (JWT) + **bcryptjs** (both scaffolded).
- **Social verify**: `google-auth-library`, `apple-signin-auth` (or manual JWKS verify).
- **Push**: `firebase-admin`.
- **Logging**: `winston` + request id middleware.
- **Testing**: `jest` + `supertest` + `ts-jest`.
- **Payments**: adapter interface; concrete provider deferred (Q1/R1). Start with COD.

## 2. Architecture (layered)
```
Request → Router → Validation (Joi) → Controller → Service → Repository (Sequelize) → DB
                                          ↓
                              Presenter (envelope + exact JSON keys)
Cross-cutting: auth middleware, header-context middleware (fcmToken/countryId/lang),
error-handling middleware, logging, rate limiting.
```
- **Presenter/serializer layer is mandatory**: maps DB rows → exact contract JSON, isolating misspelled keys
  in one place and giving a central spot for contract tests.
- **Response helper** `ok(payload, {code,message})` / `fail(code,message)` enforces the envelope.

## 3. Project structure (proposed)
```
backend/
  src/
    config/          env loading, db config
    db/ models/ migrations/ seeders/
    middleware/      auth, context, errorHandler, rateLimit, requestId
    modules/
      app/           settings, countries, cities, banners, contact
      catalog/       categories, cutTypes, products, favorites, homePage
      cart/          cart + promo + deliveryCost
      checkout/      checkout, buyNow, orders
      account/       auth (email/social/apple), profile, password, prefs
      addresses/  notifications/
    presenters/      row→contract JSON mappers (envelope + exact keys)
    services/        payment/ (adapter), push/ (fcm), social/ (google,apple)
    utils/           response envelope, localization, pagination
    app.ts server.ts
  tests/ integration/ unit/
  .env.example  package.json  tsconfig.json  jest.config.js
```

## 4. Strategies
- **Validation**: per-endpoint Joi schema for urlencoded bodies + params + query; numeric coercion for
  filter fields; failure → `fail(400, <localized>)`.
- **Auth**: `authRequired` and `authOptional` middlewares. Empty bearer → guest. JWT verify → attach `user`.
- **Header context**: middleware reads `fcmToken`, `countryId`, `Accept-Language` into `req.ctx`.
- **Error handling**: async wrapper + global error middleware → envelope; log with request id.
- **Security**: helmet, cors (web origins), express-rate-limit on auth/promo/checkout, bcrypt, no secret logs,
  generic forgot-password response, feature-flag gate middleware.

## 5. Development order (phased tasks)

### Phase 0 — Project setup  [no deps]
- T0.1 Convert scaffold to TS: tsconfig, ts-jest, scripts (`dev`, `build`, `start`, `test`, `migrate`, `seed`).
- T0.2 Env loading + `config/`; `.env.example`.
- T0.3 Express app with urlencoded + json parsers, mount at `/api`, health route.
- T0.4 Response envelope helper + presenter base + error middleware + requestId + logging.
- T0.5 DB connection + Sequelize init.

### Phase 1 — Data layer  [deps: T0.5]
- T1.1 Models + migrations for all tables in `03_DATA_MODEL.md`.
- T1.2 Seeders: countries+translations, cities/governorates, categories, cut/service types, products
  (+images, +type links), setting singleton, CMS pages, sample banners/ad, a promo code.

### Phase 2 — Public catalog & app  [deps: T0.4, T1.x]
- T2.1 `getSetting` (+advertisement, pages, cut/service types).
- T2.2 `getCountries`, `getGovernoratesByCountryId/{id}`, `getCitiesByCountryId/{id}`, `getBanners`.
- T2.3 `getCategories`, `getCutTypes`.
- T2.4 `getProducts` (filter/sort/paginate), `getProductDetails/{id}`, `getHomePage`.
- T2.5 `contactUs`.
- T2.6 Presenters + integration tests asserting exact keys for the above.

### Phase 3 — Auth & account  [deps: T0.4, T1.1(user)]
- T3.1 `signUp`, `login` (bcrypt + JWT), return `user.access_token`.
- T3.2 `authRequired`/`authOptional` middlewares.
- T3.3 Google: `socialSignUp` (verify idToken) + `socialCreateNewAccount`; emit `code:222` when mobile missing.
- T3.4 Apple: `checkAppleAccount` + `appleCreateNewAccount`; handle relay email; `code:222` flow.
- T3.5 `forgotPassword` (generic), `changePassword`, `editUserProfile`.
- T3.6 `updateMyLanguage`, `updateNotificationStatus`, `updateMyCountry`, `logout`, `removeMyAccount`.
- T3.7 Tests: auth flows incl. 200/222 branches.

### Phase 4 — Favorites, addresses, notifications  [deps: Phase 3]
- T4.1 `addAndRemoveFromFavorite/{id}`, `getMyFavorites` (+ `is_fevorite` on products via OptAuth).
- T4.2 `getMyAddresses`, `addNewAdress`, `updateAdress/{id}`, `deleteAddress/{id}`.
- T4.3 `myNotifications`; FCM send service on order events.
- T4.4 Tests.

### Phase 5 — Cart & promo  [deps: Phase 2 products; Phase 3 for user carts]
- T5.1 `addProductToCart/{id}`, `getMyCart` (guest by fcmToken, user by id), `changeQuantity/{id}`,
  `deleteProductCart/{id}`, `deleteCartItems`.
- T5.2 `checkPromo` (percent vs fixed via `type`), `calculateDeliveryCost`.
- T5.3 Tests (totals, promo math).

### Phase 6 — Checkout & orders  [deps: Phase 5, addresses]
- T6.1 Payment adapter interface + **COD** implementation (no `url`).
- T6.2 `checkOut` (user + guest), `checkOutByProductId` (user + guest): create order + order_products,
  compute sub_total/discount/delivery/total, snapshot contact/address.
- T6.3 `getMyOrders`, `getOrderById/{id}` with `products[]` + `address`.
- T6.4 Online gateway adapter (blocked on Q1) → returns `url`; implement callback endpoint that finalizes
  payment and redirects to `.../successpayment?transaction_id=` or `.../failpayment`.
- T6.5 Tests (COD end-to-end; gateway mocked).

### Phase 7 — Hardening & delivery  [deps: all]
- T7.1 Rate limiting, helmet, CORS, feature-flag gating.
- T7.2 Structured logging + error tracking hook.
- T7.3 Dockerfile + compose (api + postgres); run migrations/seeders on boot for dev.
- T7.4 Regenerate `openapi.yaml` from implemented routes; diff against the app contract.
- T7.5 Full contract test suite green.

## 6. Task dependency graph (summary)
- T0.* → everything. T1.* depends on T0.5; blocks Phases 2–6.
- Phase 2 depends on T0.4 + relevant T1 models. Phase 3 depends on user model + T0.4.
- Phases 4 & 5 depend on Phase 3 (auth) and Phase 2 (products).
- Phase 6 depends on Phase 5 + addresses (Phase 4.2). Phase 7 depends on all.
- **Blocker**: T6.4 online payments depends on resolving Q1 (gateway). COD path (T6.1–T6.3) is unblocked.

## 7. Definition of done per endpoint
1. Route + Joi validation + auth flag matching `02_API_CONTRACT.md`.
2. Service/repository logic.
3. Presenter emits the exact contract JSON keys (incl. misspellings) inside the envelope.
4. Integration test asserts status/code + payload keys.
5. Errors go through the global handler as envelopes.

- **Migrations/seeding**: migrations per `03_DATA_MODEL.md`; seeders load countries (KW/SA/QA + translations),
  categories, products (+images, +type links), cut/service types, singleton setting, CMS pages, sample
  banners/ad, a promo code.
- **Localization**: `Accept-Language` selects `en`/`ar` for `message` and translated names.
- **Pagination**: page size from `setting.paginateTotal`; return `is_there_more`/`is_more`.
