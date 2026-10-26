# Thabayehkom Backend — API Contract (v1)

Authoritative endpoint list, derived from `lib/controllers/api_controller.dart` and
`lib/controllers/cart_controller.dart`. All responses are **HTTP 200** with a JSON envelope
`{ status, code, message, ... }` (see `01_REQUIREMENTS.md` §3). Base path: `/api/`.

Legend: Auth = requires valid `Authorization: Bearer <jwt>`. OptAuth = uses bearer if present.
Body type for all POST = `application/x-www-form-urlencoded`.

Custom headers on every request: `Accept: application/json`, `Accept-Language: en|ar`,
`fcmToken: <token>`, `Authorization: Bearer <token|"">`, `countryId: <id|"">`.

---

## App / Settings

### GET /getSetting — public
Response payload keys: `settings` (object), `advertisement` (object|null). `settings` fields —
see `03_DATA_MODEL.md` Settings. Includes `pages[]`, `cutTypes[]`, `serviceTypes[]`.

### GET /getCountries — public
`{ items: Country[] }`. Country: `id, currency_code, country_code, status, image, created_at, name, translations[]`.
`translations[]`: `{ id, country_id, locale, name, currency_name, deleted_at, created_at, updated_at }`.

### GET /getGovernoratesByCountryId/{id} — public
`{ items: City[] }` where each item is a governorate (same City shape).

### GET /getCitiesByCountryId/{id} — public
`{ items: City[] }`. City: `id, deliveryCost (camelCase), country_id, status, created_at, name`.

### GET /getBanners — public
`{ items: Banner[] }`. Banner: `id, item_id, type, status, image, link, created_at, category_name`.

### POST /contactUs — public
Body: `name, email, mobile, message`. Response: envelope only (`status, code, message`).

---

## Catalog

### GET /getCategories — public
`{ items: Category[] }`. Category: `id, image, name, status, created_at`.


---

## Cart (guest keyed by `fcmToken`, logged-in keyed by user)

### GET /addProductToCart/{productId}?cut_type_id=&service_type_id=&quantity=&fcmToken= — OptAuth
Response: envelope; may include `cart_id`.

### GET /getMyCart?fcmToken= — OptAuth
`{ MyCart: MyCartItem[], total: number }`. MyCartItem: `id, user_id, fcm_token, product_id, quantity,
cut_type_id, service_type_id, country_id, special_request, created_at, product (Product),
cut_type (Types), service_type (Types)`.

### GET /changeQuantity/{cart_id}?type=&fcmToken= — OptAuth
`type` = 1 increment / 2 decrement (A6, verify). Response: envelope.

### GET /deleteProductCart/{id}?fcmToken= — OptAuth
Response: envelope.

### GET /deleteCartItems?fcmToken= — OptAuth
Clears cart. Response: envelope.

### GET /checkPromo?fcmToken=&name=CODE — OptAuth
`{ PromotionCode: { id, code, percent, type, status, start_date, end_date, description, created_at } }`.
`type == 2` → percent discount; else fixed amount (A6/Q6).

### GET /calculateDeliveryCost?city_id= — public
Response envelope includes `deliveryCost` (number).

---

## Checkout & Orders

### POST /checkOut — OptAuth (logged-in) / public (guest)
Logged-in body: `address_id, code_name, payment_type, fcmToken`.
Guest body: `fcmToken, code_name, payment_type, full_name, email, mobile, address_name, country_id,
city_id, governorate_id, block, avenue, street, type, building_number, house_number, floor_number,
apartment_number, address_line_1, address_line_2, latitude, longitude, notes`.
Response: `{ status, code, message, order: Order, url: string|null }`.
- `url` non-empty → app opens WebView; success redirect must be
  `https://thabayehkom.com/{en|ar}/successpayment?transaction_id=<id>`, failure `.../failpayment`.
- `url` empty/null (COD) → immediate success.

### POST /checkOutByProductId — OptAuth (logged-in) / public (guest)
Logged-in body: `address_id, product_id, quantity, cut_type_id, service_type_id, special_request,
code_name, payment_type, fcmToken`.
Guest body: same product fields + full address/contact fields as guest `/checkOut`.
Response: same as `/checkOut`.

### GET /getMyOrders?page=N&fcmToken= — Auth
`{ items: Order[], is_more: bool }`. Order summary fields — see `03_DATA_MODEL.md` Order.

### GET /getOrderById/{id}?fcmToken= — Auth
`{ item: OrderDetails }`. OrderDetails adds `products: OrderProduct[]` and `address: Address`.

---

## Account / Auth

### POST /login — public
Body: `email, password, device_type, fcm_token`. Success: `{ status:true, code:200, user: User }`
where User contains `access_token`.

### POST /signUp — public
Body: `name, email, mobile, password, confirm_password, device_type, fcm_token`. Success: `{ user }` with token.

### POST /socialSignUp — public
Body: `social_type=google, social_token=<idToken>, device_type, fcm_token`.
- Existing complete account → `code:200` + `user`.
- Needs mobile to finish → `code:222` (app then collects mobile and calls `/socialCreateNewAccount`).

### POST /socialCreateNewAccount — public
Body: `social_type, social_token, mobile, device_type, fcm_token`. Success: `{ user }`.

### POST /checkAppleAccount — public
Body: `apple_token, device_type, fcm_token, email, name`.
- Existing → `code:200` + `user`. Needs mobile → `code:222`.

### POST /appleCreateNewAccount — public
Body: `apple_token, device_type, fcm_token, email, mobile, name`. Success: `{ user }`.

### POST /forgotPassword — public
Body: `email`. Response: generic success envelope regardless of existence.

### POST /changePassword — Auth
Body: `old_password, password, confirm_password`. Response: envelope.

### POST /editUserProfile — Auth
Body: `name, mobile, email`. Response: `{ user: User }` (code 200 on success).

### POST /updateMyLanguage — Auth
Body: `fcmToken, lang (en|ar), device_type`. Response: envelope.

### POST /updateNotificationStatus — Auth
Body: `notification_status (0|1), fcmToken, device_type`. Response: envelope.

### POST /updateMyCountry — Auth
Body: `country_id, fcmToken, device_type`. Response: envelope.

### GET /logout — Auth
Invalidate token (or accept and no-op if stateless JWT). Response: envelope.

### POST /removeMyAccount — Auth
Delete/deactivate account. Response: envelope.

---

## Addresses (Auth)

### GET /getMyAddresses?page=N
`{ items: Address[], is_more: bool }`.

### POST /addNewAdress  (misspelling intentional)
Body: `type, country_id, address_name, city_id, governorate_id, block, street, house_number, avenue,
building_number, floor_number, apartment_number, address_line_1, address_line_2, notes, latitude, longitude`.
Response: envelope.

### POST /updateAdress/{address_id}  (misspelling intentional)
Body: same as add. Response: envelope.

### GET /deleteAddress/{id}
Response: envelope.

---

## Notifications (Auth)

### GET /myNotifications?page=N&fcmToken=
`{ items: Notification[], is_more: bool }`. Notification: `id, user_id, order_id, messag_type (misspelled),
status, created_at, message, title`.

---

## Payment redirect contract (hard requirement)
After gateway processing, the hosted payment page must redirect the WebView to:
- Success: `https://thabayehkom.com/{en|ar}/successpayment?transaction_id=<txid>`
- Failure: `https://thabayehkom.com/{en|ar}/failpayment`
The app matches these URLs by substring and extracts `transaction_id` from the success URL query.

### GET /getCutTypes — public
`{ items: Types[] }`. Types: `id, status, created_at, name`.

### GET /getHomePage — public (OptAuth for favorite flags on products)
`{ categories: Category[], banners: Banner[], best_seller_products: Product[], featured_products: Product[] }`.

### POST /getProducts?page=N — OptAuth
Body (all optional): `text, category_id, price_from, price_to, sorting_type` (one of
`alpha_asc|alpha_desc|price_asc|price_desc`), `is_best_seller=1`, `service_types[0..]`, `cut_types[0..]`.
Response: `{ items: Product[], is_there_more: bool }`.

### GET /getProductDetails/{id} — OptAuth
`{ items: Product }` (single object). Product includes `service_types[]`, `cut_types[]`, `images[]`,
`is_fevorite` (string, misspelled), `discount_price`, `discount_percent`, `offer_end_date`, `url_link`.

### GET /addAndRemoveFromFavorite/{id} — Auth
Toggles favorite. Response: envelope only.

### GET /getMyFavorites?page=N — Auth
`{ items: Product[], is_there_more: bool }`.
