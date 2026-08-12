# Thabayehkom Backend — Requirements Specification (v1)

Status: Phases 1–4 complete. Implementation not started.
Source of truth: the Flutter client. Where `openapi.yaml` and the Dart code disagree, the Dart code wins (see §21 Gap Review).

---

## 1. Project Overview

Thabayehkom (`thabaye7kom`, app version 1.1.1+17) is a **meat delivery** mobile app built in Flutter,
targeting Android, iOS, and Web. It previously talked to a backend at `https://thabayehkom.app/api/`
that is no longer available. This project rebuilds that backend in Node.js so the **unmodified** Flutter
app keeps working.

The app is multi-country (Kuwait/KWD, Saudi/SAR, Qatar/QAR, plus others), bilingual (English/Arabic via
`easy_localization`), supports guest and authenticated checkout, favorites, a cart keyed by FCM token,
promo codes, multiple payment methods (KNET, SADAD, NAPS, Credit, Cash on Delivery), and push
notifications via Firebase.

## 2. Backend Goals

1. Reproduce the exact HTTP contract the Flutter app expects (paths, form-encoded bodies, header names,
   JSON response shapes, and the `status`/`code` conventions the UI branches on).
2. Be secure by default: hashed passwords, JWT bearer auth, input validation, rate limiting, no secret leakage.
3. Be maintainable: clean layered architecture, typed code, migrations, tests.
4. Be deployable: environment-driven config, container-friendly, health checks.
5. Do **not** require any change to the Flutter client.

## 3. Response Envelope Convention (critical)

Every endpoint returns HTTP `200` with a JSON body. The app does **not** rely on HTTP status codes for
business logic; it reads a JSON envelope:

```json
{ "status": true, "code": 200, "message": "...", "...payload...": ... }
```

Observed `code` semantics (from `lib/views/**`):

| code | Meaning | App behavior |
|------|---------|--------------|
| `200` | Success | Proceed (save user, navigate, show data) |
| `222` | Social/Apple account exists but needs to finish sign-up (missing mobile) | App routes to "continue with Google/Apple" screen to collect mobile, then calls `socialCreateNewAccount` / `appleCreateNewAccount` |
| other | Failure | App shows `message` in a FailDialog |

`status` is a boolean success flag. Many list/detail flows only check `status == true`. Auth flows check
both `status == true && code == 200`. **The backend must set both consistently.**

Recommended non-200 `code` values (app only needs `!=200` to show `message`, but keep them meaningful):
`400` validation, `401` unauthenticated, `403` forbidden/blocked, `404` not found, `409` conflict
(e.g. email exists), `422` business rule failure, `500` server error. All still returned inside a `200`
HTTP response with the envelope. See `02_API_CONTRACT.md` for per-endpoint detail.

> Assumption A1: HTTP-200-always is inferred from the Dart client, which never inspects `statusCode` for
> control flow (only logs it). Matches typical Laravel-style APIs.

## 4. Authentication & Authorization

### 4.1 Headers sent by the app on every request (`lib/utils/constants.dart`)

```
Accept: application/json
fcmToken: <device FCM token>            // note: header name is 'fcmToken', not standard
Accept-Language: en | ar
Authorization: Bearer <access_token>    // empty string when logged out
countryId: <current country id>         // empty string when unknown
```

- `Authorization` is present but **empty** when not logged in. Treat empty/absent bearer as "guest".
- `fcmToken` is also passed as a query param or form field on many endpoints (cart, orders, notifications).
  The **guest cart is keyed by `fcmToken`**; the authenticated cart is keyed by user id.
- `countryId` header scopes catalog/pricing to a country. Treat missing as "no country filter" or default.
- `Accept-Language` selects `en`/`ar` translations for names/messages.

### 4.2 Auth model

- Email/password sign-up and login.
- Google sign-in: app sends Google `idToken` as `social_token`, `social_type=google`.
- Apple sign-in: app sends Apple `authorizationCode` as `apple_token`.
- On successful auth, backend returns a `user` object that **includes `access_token`**. The app stores it
  and sends it as `Bearer`.
- Token format: **JWT** (per `openapi.yaml` `bearerFormat: JWT`). Assumption A2: old backend may have used
  Sanctum/Passport opaque tokens, but JWT is compatible since the app treats the token as opaque.

### 4.3 Protected vs public endpoints

- Public: settings, categories, countries, governorates, cities, banners, cut types, home page, products,
  product details, login, signUp, social endpoints, forgotPassword, contactUs, guest checkout, guest cart
  operations keyed by `fcmToken`, promo check, delivery cost.
- Protected (require valid bearer): favorites (add/list), my addresses (CRUD), change password, edit
  profile, update language/notification/country, logout, my orders, order details, my notifications,
  terminate account. See `02_API_CONTRACT.md` for the authoritative per-endpoint flag.

## 5. Functional Requirements (by domain)

### 5.1 App / Settings
- `GET /getSetting` → app-wide settings + one advertisement. Includes feature flags
  (`is_maintenance_mode`, `is_alowed_register`, `is_alowed_login`, `is_alowed_buying`, `is_alowed_cart`,
  `account_need_to_activate`), contact info, social links, tax, min order, working hours, `paginateTotal`,
  CMS `pages` (about/terms/privacy), `cutTypes`, and `serviceTypes`.
- `GET /getCountries`, `GET /getGovernoratesByCountryId/{id}`, `GET /getCitiesByCountryId/{id}` — location
  hierarchy. Governorates and cities share the same `City` JSON shape (`deliveryCost`, `country_id`,
  `status`, `name`). Cities carry `deliveryCost`.
- `GET /getBanners` — promotional banners.
- `POST /contactUs` — contact form (name, email, mobile, message). Public.

### 5.2 Catalog
- `GET /getCategories`, `GET /getCutTypes`.
- `GET /getHomePage` — categories + banners + `best_seller_products` + `featured_products`.
- `POST /getProducts?page=N` — search/filter/sort/paginate. Body: `text`, `category_id`, `price_from`,
  `price_to`, `sorting_type` (`alpha_asc|alpha_desc|price_asc|price_desc`), `is_best_seller=1`,
  `service_types[i]`, `cut_types[i]`. Returns `{ items, is_there_more }`.
- `GET /getProductDetails/{id}` — full product incl. `service_types`, `cut_types`, `images`,
  `is_fevorite` (note the misspelling), discount info.
- `GET /addAndRemoveFromFavorite/{id}` — toggle favorite (auth).
- `GET /getMyFavorites?page=N` — list favorites (auth), `{ items, is_there_more }`.

### 5.3 Cart (keyed by `fcmToken` for guests; by user for logged-in)
- `GET /addProductToCart/{productId}?cut_type_id=&service_type_id=&quantity=&fcmToken=`
- `GET /getMyCart?fcmToken=` → `{ MyCart: [...], total }`
- `GET /changeQuantity/{cart_id}?type=&fcmToken=`
- `GET /deleteProductCart/{id}?fcmToken=`
- `GET /deleteCartItems?fcmToken=`
- `GET /checkPromo?fcmToken=&name=CODE` → `{ PromotionCode: {...} }`
- `GET /calculateDeliveryCost?city_id=`

### 5.4 Checkout & Orders
- `POST /checkOut` — logged-in (`address_id`, `code_name`, `payment_type`, `fcmToken`) OR guest (full
  address fields + `full_name`, `email`, `mobile`). Returns `{ status, code, message, order, url }`.
  - Non-empty `url` → app opens WebView and waits for redirect to
    `https://thabayehkom.com/{en|ar}/successpayment?transaction_id=...` or `.../failpayment`.
  - Null/empty `url` (e.g. COD) → app goes straight to success.
- `POST /checkOutByProductId` — buy-now single product (logged-in and guest variants).

## 6. Validation Requirements
- `signUp`: name, email (format + unique), mobile, password, `confirm_password` match.
- `login`: email + password required.
- `changePassword`: old password correct; `password == confirm_password`.
- `forgotPassword`: respond generically to avoid user enumeration.
- `getProducts`: numeric coercion for `category_id`/`price_from`/`price_to`; whitelist `sorting_type`.
- Address create/update: validate country/governorate/city referential integrity; most fields nullable.
- All POST bodies arrive as `application/x-www-form-urlencoded` — parse urlencoded, not only JSON.

## 7. Error Handling
- Never expose stack traces. Always return the envelope `{ status:false, code, message }` on failure.
- Localize `message` using `Accept-Language`. Global error middleware maps errors to the envelope.
- Log full errors server-side with a request id.

## 8. Security Requirements
- Bcrypt password hashing (cost ≥ 10).
- JWT signed with an env secret. App has no refresh flow, so use a long-lived token (A4) or add silent
  refresh; recommend long-lived (30–90 days) and document the tradeoff.
- Verify Google `idToken` (google-auth-library) and Apple token server-side; handle Apple relay emails.
- Rate limit auth, promo, and checkout endpoints.
- CORS for the web build origin(s); mobile needs none.
- `forgotPassword` must not reveal whether an email exists.
- Never log secrets. Apple APNs `.p8` keys live in `important/ios notification/` — keep out of backend
  repo/logs; load via secret storage.
- Enforce feature flags (`is_alowed_*`) and `account_need_to_activate`/`is_verified` if enabled.

## 9. External Integrations
- **Firebase Cloud Messaging** — push for order/status updates; needs FCM server credentials.
- **Google Sign-In** — verify `idToken` audience against the app's OAuth client id(s).
- **Apple Sign-In** — verify token; handle "hide my email" relay addresses.
- **Payment gateway** — provider unknown (Q1). Success/fail redirect URLs are hardcoded in the app:
  `https://thabayehkom.com/{en|ar}/successpayment` (must carry `transaction_id`) and `.../failpayment`.
- **IP geolocation** — `IpResponse` matches ip-api.com fields; app calls an external IP service directly
  (A5); backend need not implement unless we proxy.

## 10. File / Image Storage
- Products/categories/banners/countries/ads/users/pages return `image` as absolute URLs.
- No image **upload** endpoint is called by the app; uploads are admin-side (out of scope). Recommend
  S3-compatible storage returning public URLs.

## 11. Background Jobs
- Send push on order status changes.
- Optional: expire promo codes, clear stale guest carts by `fcmToken`, clean abandoned orders. Use
  node-cron, or BullMQ+Redis if volume grows.

## 12. Logging & Monitoring
- Structured logs (Winston/pino) with request correlation id. `GET /health` for probes. Sentry optional.

## 13. Performance Requirements
- Paginate all lists (page size from `settings.paginateTotal`).
- Index FKs and common filters (`category_id`, `country_id`, price, `is_best_seller`, `is_featured`).
- Cache settings/categories/countries. Indicative target p95 < 300ms for catalog reads.

## 14. Testing Requirements
- Unit tests for services (auth, pricing, promo, checkout totals).
- Integration tests asserting the **exact envelope + payload keys** the Flutter models parse (guard against
  contract drift), using the key list in `03_DATA_MODEL.md`.
- Framework: Jest + supertest.

## 15. Deployment Requirements
- Dockerized, 12-factor config, managed Postgres, migrations on deploy, HTTPS at proxy.
- Serve under base path `/api` so `https://<host>/api/<endpoint>` matches `Constants.domain`.

- `GET /getMyOrders?page=N&fcmToken=` (auth) → `{ items, is_more }`.
- `GET /getOrderById/{id}?fcmToken=` (auth) → `{ item }` with `products[]` and `address`.

## 16. Environment / Configuration
Required env keys (initial):
```
NODE_ENV, PORT, API_BASE_PATH=/api
DATABASE_URL (or PG host/port/user/pass/db)
JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS
FCM credentials (service account JSON)
GOOGLE_OAUTH_CLIENT_IDS (android,ios,web)
APPLE_CLIENT_ID / APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY
PAYMENT_GATEWAY_* (TBD once provider known)
PUBLIC_ASSET_BASE_URL / S3 config
WEB_CORS_ORIGINS
PAYMENT_SUCCESS_URL=https://thabayehkom.com/{lang}/successpayment
PAYMENT_FAIL_URL=https://thabayehkom.com/{lang}/failpayment
```

## 17. API Compatibility Requirements with Flutter (hard constraints)
- Base URL path **`/api/`** (app uses `domain = https://thabayehkom.app/api/`).
- POST bodies are **form-urlencoded**, not JSON.
- Preserve exact (including misspelled) paths: `addNewAdress`, `updateAdress`, and JSON key `is_fevorite`.
  Do not "fix" these — the app depends on them.
- Preserve exact JSON keys/nesting from `03_DATA_MODEL.md` (`MyCart`, `PromotionCode`,
  `best_seller_products`, `featured_products`, `is_there_more`, `is_more`, `deliveryCost` camelCase,
  `access_token`).
- Numeric fields are parsed via `double.parse`/`int.parse` on `.toString()`, so numbers or numeric strings
  both work — be consistent.
- Accept custom header names `fcmToken` and `countryId`.

## 18. Assumptions (labeled)
- A1: All endpoints reply HTTP 200 with an envelope; result in `status`/`code`.
- A2: JWT bearer tokens (opaque to client).
- A3: Online payment methods return `url`; COD returns none.
- A4: Long-lived token (no refresh flow in app).
- A5: IP geolocation is client-to-external, not via backend.
- A6: `type` in `changeQuantity` is `1=increment, 2=decrement` — verify.
- A7: `sorting_type` mapping: none/0=alpha_asc, 1=alpha_desc, 2=price_asc, 3=price_desc, 4=best seller.
- A8: "governorate" and "city" both live in a cities-like table differentiated by parent, same JSON shape.

## 19. Open Questions
- Q1: Which payment gateway (KNET/SADAD/NAPS/Credit)? Needed for redirect + callback + `transaction_id`.
  (MyFatoorah is a common KWD/KNET candidate, unconfirmed.)
- Q2: Any special `code` values beyond 200/222? App only special-cases those two; rest is "show message".
- Q3: Is account activation/verification enforced, and via which channel?
- Q4: Points/loyalty (`points_in_mony`, `mony_in_points`) — used in mobile flow? Not seen; likely web/admin.
- Q5: `appointment_price` — appears vestigial for mobile; confirm.
- Q6: Promo `type` semantics: code implies `type==2` → percent, else fixed. Confirm.

## 20. Risks
- R1: Payment gateway unknown → online checkout can't be finalized until Q1. Mitigation: ship COD first;
  hide the gateway behind an interface.
- R2: Contract drift → any renamed/removed JSON key silently becomes `null` in the app. Mitigation:
  contract tests from `03_DATA_MODEL.md`.
- R3: Token lifetime mismatch → unexpected logouts if too short. Mitigation: long-lived token or refresh.
- R4: Multi-country pricing/delivery correctness (currency per country, delivery cost per city).

## 21. Gap Review (Phase 3) — openapi.yaml vs Flutter code

The repo-root `openapi.yaml` was itself reconstructed from `api_controller.dart` and is accurate but
**incomplete**. Flutter code is authoritative. Gaps found and resolved:

1. **Missing endpoints in openapi.yaml** the app actually calls (from `cart_controller.dart` and
   `api_controller.dart`): `addProductToCart/{id}`, `getMyCart`, `changeQuantity/{id}`,
   `deleteProductCart/{id}`, `deleteCartItems`, `checkOut` (user+guest), `checkOutByProductId` (user+guest),
   `checkPromo`, `calculateDeliveryCost`, `removeMyAccount`. → Documented in `02_API_CONTRACT.md`; required.
2. **`getProducts` auth**: app sends bearer if logged in (to compute `is_fevorite`). → Treat as **optional
   auth**; return per-user favorite flag when a valid token is present.
3. **Header casing** (`fcmToken`, `countryId`) not captured as headers in openapi. → Backend reads these.
4. **Misspelled paths** `addNewAdress`/`updateAdress`: keep exactly.
5. **`is_fevorite`** key required by the Dart model exactly (misspelled). → Use it.
6. **Guest checkout fields**: openapi's `checkOut` body undocumented; guest path needs full inline address +
   contact fields. → Documented in `02_API_CONTRACT.md`.
7. **Payment `url` + redirect contract** not in openapi. WebView expects redirect to hardcoded success/fail
   URLs with `transaction_id`. → Hard requirement.

No conflicts were found where app and openapi describe the *same* endpoint differently — openapi is a strict
subset. Action: **extend** the contract per `02_API_CONTRACT.md`, then regenerate openapi from the new backend.


`payment_type` integer mapping (from `check_out_page.dart`):

| value | method | Shown when currency |
|-------|--------|---------------------|
| 1 | KNET | KWD |
| 2 | Credit card | always |
| 3 | Cash on Delivery | all except QAR |
| 4 | SADAD | SAR |
| 5 | NAPS | QAR |

> Assumption A3: online methods (1,2,4,5) require a gateway and return a `url`; COD (3) returns none.
> Gateway unknown — see Q1.

### 5.5 Account
- `POST /login`, `POST /signUp` (`name`, `email`, `mobile`, `password`, `confirm_password`, `device_type`,
  `fcm_token`).
- `POST /socialSignUp` (Google), `POST /socialCreateNewAccount` (finish with `mobile`).
- `POST /checkAppleAccount`, `POST /appleCreateNewAccount` (`apple_token`, `email`, `name`, `mobile`).
- `POST /forgotPassword` (`email`).
- `POST /changePassword` (auth) — `old_password`, `password`, `confirm_password`.
- `POST /editUserProfile` (auth) — `name`, `mobile`, `email`; returns updated `user`.
- `POST /updateMyLanguage` / `updateNotificationStatus` / `updateMyCountry` (auth).
- `GET /logout` (auth). `POST /removeMyAccount` (auth) — delete account.

### 5.6 Addresses (auth)
- `GET /getMyAddresses?page=N` → `{ items, is_more }`.
- `POST /addNewAdress` (misspelled), `POST /updateAdress/{address_id}` (misspelled),
  `GET /deleteAddress/{id}`.

### 5.7 Notifications (auth)
- `GET /myNotifications?page=N&fcmToken=` → `{ items, is_more }`. Push via FCM (see §9).


