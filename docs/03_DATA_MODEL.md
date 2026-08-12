# Thabayehkom Backend — Data Model (v1)

Derived from `lib/models/*.dart` and `lib/responses/*.dart`. These JSON key names are the **contract**:
the Flutter app parses them exactly (null-safe), so renaming/removing any key silently breaks features.

Column types below are the recommended Postgres representation. JSON output must preserve the listed
key names (including misspellings: `is_fevorite`, `messag_type`, `defult`, `addNewAdress`/`updateAdress`).

---

## user
| column | type | notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar | |
| email | varchar unique | |
| mobile | varchar | |
| country_id | int FK → country.id | nullable |
| image_profile | varchar (URL) | nullable |
| password_hash | varchar | bcrypt; never returned |
| remember_token | varchar | nullable (legacy; may stay null) |
| status | varchar | e.g. 'active' |
| notification_status | int (0/1) | |
| is_verified | int (0/1) | |
| social_type | varchar | nullable: 'google'/'apple' |
| social_id | varchar | nullable; provider subject id |
| apple_relay_email | varchar | nullable |
| created_at | timestamptz | |

JSON `user` (auth responses): `id, name, email, mobile, country_id, image_profile, remember_token, status,
notification_status, is_verified, created_at, access_token`. `access_token` = signed JWT (not stored).

## country
`id, currency_code, country_code, status, image (URL), created_at, name`.
`translations[]` → table **country_translation**: `id, country_id FK, locale (en/ar), name, currency_name,
deleted_at, created_at, updated_at`.

## city  (holds both governorates and cities)
`id, name, country_id FK, status, created_at, deliveryCost (numeric)`, plus `parent_id int FK → city.id`
nullable to distinguish governorate (parent null) from city (parent = governorate). JSON key for cost is

## product
| column | type | notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar | |
| description | text | |
| type | int | product type/segment |
| image | varchar (URL) | main image |
| url_link | varchar | JSON key **`url_link`** → app field `url` |
| country_id | int FK | |
| category_id | int FK | used by filter |
| price | numeric | |
| discount_price | numeric | nullable |
| discount_percent | int | nullable |
| offer_end_date | date | nullable |
| is_best_seller | int (0/1) | |
| is_featured | int (0/1) | |
| quantity | int | stock |
| status | varchar | |
| created_at | timestamptz | |

Computed per response: `is_cart` (int), `is_fevorite` (string; **misspelled**, per-user).
Relations in product detail JSON:
- `images[]` → **product_image**: `id, product_id FK, image (URL), created_at`.
- `service_types[]` → **product_service_type**: `id, service_type_id FK, product_id FK, created_at,
  service_type: { Types }`.
- `cut_types[]` → **product_cut_type**: `id, cut_type_id FK, product_id FK, created_at, cut_type: { Types }`.

## favorite
`id, user_id FK, product_id FK, created_at`. Drives `is_fevorite` and `getMyFavorites`.

## address
`id, user_id FK, address_name, country_id FK, city_id FK, governorate_id FK, block, street, avenue, type,
building_number, floor_number, apartment_number, house_number, address_line_1, address_line_2, notes,
defult (int; misspelled "default" flag), longitude, latitude, created_at`.
Detail JSON nests `country: {Country}`, `city: {City}`, `governorate: {City}`. May also include
`user_name, user_email, user_mobile` (for guest orders).

## cart
`id, user_id FK nullable, fcm_token, product_id FK, quantity, cut_type_id FK nullable,
service_type_id FK nullable, country_id FK, special_request, created_at`.
- Guest rows: `user_id` null, keyed by `fcm_token`.
- `getMyCart` nests `product`, `cut_type` (Types), `service_type` (Types), and top-level `total`.

## promotion_code
`id, code, percent, type (int; 2 = percent else fixed), status, start_date, end_date, description, created_at`.
JSON wrapper key is **`PromotionCode`**.

## order
| column | type | notes |
|--------|------|-------|
| id | serial PK | |
| user_id | int FK nullable | null for guest |
| total_price | numeric | |
| sub_total | numeric | |
| address_id | int FK nullable | |
| discount | numeric | |
| delivery_cost | numeric | |
| discount_code | varchar | nullable |
| count_items | int | |
| fcm_token | varchar | |
| name, email, mobile | varchar | contact snapshot (guest) |
| payment_id | varchar | gateway payment id |
| transaction_id | varchar | from success redirect |
| payment_json | text | raw gateway payload |
| payment_check_response | text | verification payload |
| payment_method | int | 1 KNET,2 Credit,3 COD,4 SADAD,5 NAPS |
| payment_status | int | 0 pending,1 paid,... |
| status | int | order lifecycle |
| status_name | varchar (localized) | e.g. 'Pending' |
| ordered_date | timestamptz | |
| special_request | text | |
| created_at | timestamptz | |

## order_product  (OrderProduct in order details)
`id, order_id FK, product_id FK, cut_type_id FK, service_type_id FK, special_request, quantity, discount,
price, offer_price, created_at, updated_at, deleted_at`, nesting `product: {Product}`,
`service_type: { id, status, created_at, name }`, `cut_type: { id, status, created_at, name }`.

## banner
`id, item_id, type (int), status, image (URL), link, created_at, category_name`.

## advertisement
`id, type (int), item_id, status, image (URL), link, created_at, category_name`. One returned by `/getSetting`.

## notification
`id, user_id FK, order_id FK nullable, messag_type (misspelled), status, created_at, message, title`.

## setting  (singleton) + page (CMS)
setting: `id, url, logo, appointment_price, footer_logo, tax_amount, points_in_mony, mony_in_points,
app_store_url, play_store_url, info_email, mobile, phone, facebook, twitter, linked_in, instagram,
snapchat, whatsApp (camelCase key), google_plus, min_order, from_hour, to_hour, latitude, longitude,
youtube, image, banner_image, banner_link, paginateTotal (camelCase), admin_commission_parcent (misspelled),
is_maintenance_mode, is_alowed_register (misspelled), is_alowed_login, is_alowed_buying, is_alowed_cart,
account_need_to_activate, created_at, updated_at, title, description, address`.
`pages[]` → **page**: `id, slug, image, views, created_at, title, description, key_words`.
`/getSetting` also embeds `cutTypes[]` and `serviceTypes[]` (Types shape).

---

## Relationship summary
- country 1—* city (governorate/city via parent_id) ; country 1—* country_translation ; country 1—* product
- category 1—* product
- product 1—* product_image ; product *—* cut_type (product_cut_type) ; product *—* service_type
- user 1—* address ; user 1—* order ; user 1—* favorite ; user 1—* cart ; user 1—* notification
- order 1—* order_product ; order *—1 address ; order *—1 promotion_code (via discount_code)
- cart references product + cut_type + service_type (+ user or fcm_token)

## Contract-critical key reminders (do not rename)
`is_fevorite`, `url_link`, `deliveryCost`, `paginateTotal`, `whatsApp`, `is_alowed_register`,
`admin_commission_parcent`, `messag_type`, `defult`, `MyCart`, `PromotionCode`, `best_seller_products`,
`featured_products`, `is_there_more`, `is_more`, `access_token`.

**`deliveryCost`** (camelCase), unlike most snake_case fields.
- `getGovernoratesByCountryId/{id}` → governorate rows for that country.
- `getCitiesByCountryId/{id}` → city rows for that country (A8 — confirm parent/child vs flat).

## category
`id, image (URL), name, status, created_at`.

## cut_type / service_type  (both use the `Types` JSON shape)
`id, status, created_at, name`. Stored as two tables (or one `type` table with a discriminator).
