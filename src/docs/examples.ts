/**
 * Concrete request/response examples for Swagger, so every operation shows
 * exactly what to send and what comes back. Keyed by admin resource path segment.
 */

// ---- Admin resource: request body examples (what you POST/PUT) ----
export const adminRequestExamples: Record<string, any> = {
  categories: { name: 'Beef', image: 'categories/beef.png', status: 'active' },
  banners: { item_id: 1, type: 1, status: 'active', image: 'banners/1.png', link: '', category_name: 'Beef' },
  advertisements: { type: 1, item_id: 1, status: 'active', image: 'ads/1.png', link: '', category_name: 'Promo' },
  countries: { name: 'Kuwait', currency_code: 'KWD', country_code: '965', image: 'flags/kw.png', status: 'active' },
  cities: { name: 'Salmiya', country_id: 1, parent_id: 1, status: 'active', deliveryCost: 2 },
  'cut-types': { name: 'Cubes', status: 'active' },
  'service-types': { name: 'Cleaned', status: 'active' },
  'promotion-codes': { code: 'WELCOME10', percent: 10, type: 2, status: 'active', description: '10% off' },
  pages: { slug: 'about', title: 'About Us', description: '<p>About Thabayehkom</p>', key_words: 'about,meat' },
  customers: { name: 'John Doe', email: 'john@example.com', mobile: '96599999999', status: 'active' },
  notifications: { user_id: 1, order_id: 1, messag_type: 'order', title: 'Order update', message: 'Your order shipped', status: 'unread' },
};

// ---- Admin resource: response data examples (the `data` field) ----
export const adminResponseExamples: Record<string, any> = {
  categories: { id: 1, name: 'Beef', image: 'categories/beef.png', status: 'active', created_at: '2024-01-01T00:00:00.000Z' },
  banners: { id: 1, item_id: 1, type: 1, status: 'active', image: 'banners/1.png', link: '', category_name: 'Beef', created_at: '2024-01-01T00:00:00.000Z' },
  advertisements: { id: 1, type: 1, item_id: 1, status: 'active', image: 'ads/1.png', link: '', category_name: 'Promo', created_at: '2024-01-01T00:00:00.000Z' },
  countries: { id: 1, name: 'Kuwait', currency_code: 'KWD', country_code: '965', image: 'flags/kw.png', status: 'active', created_at: '2024-01-01T00:00:00.000Z' },
  cities: { id: 2, name: 'Salmiya', country_id: 1, parent_id: 1, status: 'active', deliveryCost: 2, created_at: '2024-01-01T00:00:00.000Z' },
  'cut-types': { id: 1, name: 'Cubes', status: 'active', created_at: '2024-01-01T00:00:00.000Z' },
  'service-types': { id: 1, name: 'Cleaned', status: 'active', created_at: '2024-01-01T00:00:00.000Z' },
  'promotion-codes': { id: 1, code: 'WELCOME10', percent: 10, type: 2, status: 'active', description: '10% off', start_date: null, end_date: null, created_at: '2024-01-01T00:00:00.000Z' },
  pages: { id: 1, slug: 'about', title: 'About Us', description: '<p>About Thabayehkom</p>', views: 0, key_words: 'about,meat', created_at: '2024-01-01T00:00:00.000Z' },
  customers: { id: 5, name: 'John Doe', email: 'john@example.com', mobile: '96599999999', role: 'customer', is_admin: false, status: 'active', created_at: '2024-01-01T00:00:00.000Z' },
  notifications: { id: 1, user_id: 1, order_id: 1, messag_type: 'order', title: 'Order update', message: 'Your order shipped', status: 'unread', created_at: '2024-01-01T00:00:00.000Z' },
};

export const productRequestExample = {
  name: 'Premium Beef Ribeye',
  description: 'Fresh premium ribeye cut',
  type: 1,
  image: 'products/ribeye.png',
  url_link: 'https://thabayehkom.app/p/ribeye',
  country_id: 1,
  category_id: 1,
  price: 8.5,
  discount_price: 7.99,
  discount_percent: 6,
  quantity: 100,
  status: 'active',
  images: ['products/ribeye-1.png', 'products/ribeye-2.png'],
  cut_type_ids: [1, 2],
  service_type_ids: [1, 2],
};

export const productResponseExample = {
  id: 1, name: 'Premium Beef Ribeye', description: 'Fresh premium ribeye cut', type: 1,
  image: 'products/ribeye.png', url_link: 'https://thabayehkom.app/p/ribeye', country_id: 1,
  category_id: 1, price: 8.5, discount_price: 7.99, discount_percent: 6, quantity: 100, status: 'active',
  images: [{ id: 1, product_id: 1, image: 'products/ribeye-1.png' }],
  cut_types: [{ id: 1, product_id: 1, cut_type_id: 1, cut_type: { id: 1, name: 'Cubes', status: 'active' } }],
  service_types: [{ id: 1, product_id: 1, service_type_id: 1, service_type: { id: 1, name: 'Cleaned', status: 'active' } }],
  created_at: '2024-01-01T00:00:00.000Z',
};

export const settingsRequestExample = {
  tax_amount: 0, min_order: 5, from_hour: '09:00', to_hour: '23:00', paginateTotal: 10,
  is_maintenance_mode: 0, is_alowed_register: 1, is_alowed_login: 1, is_alowed_buying: 1,
  is_alowed_cart: 1, info_email: 'info@thabayehkom.app', mobile: '96500000000', whatsApp: '96500000000',
};

export const orderResponseExample = {
  id: 1, user_id: 5, sub_total: 17, discount: 1.7, delivery_cost: 2, total_price: 17.3,
  discount_code: 'WELCOME10', count_items: 2, payment_method: 3, payment_status: 0, status: 0,
  status_name: 'Pending', name: 'John Doe', email: 'john@example.com', mobile: '96599999999',
  transaction_id: null, created_at: '2024-01-01T00:00:00.000Z',
};

export const dashboardStatsExample = {
  totals: { orders: 128, customers: 342, products: 56, revenue: 4820.5, pendingOrders: 12 },
  recentOrders: [orderResponseExample],
};

export const adminLoginRequestExample = { email: 'admin@thabayehkom.app', password: 'Admin@12345' };
export const adminLoginResponseExample = {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  user: { id: 1, name: 'Super Admin', email: 'admin@thabayehkom.app', role: 'admin', is_admin: true },
};
export const adminMeExample = {
  id: 1, name: 'Super Admin', email: 'admin@thabayehkom.app', role: 'admin', is_admin: true,
  roles: ['admin'], permissions: ['*'],
};

// ---- Mobile API examples (the payload merged onto { status, code, message }) ----
const productMobileExample = {
  id: 1, type: 1, image: 'products/ribeye.png', url_link: 'https://thabayehkom.app/p/ribeye',
  country_id: 1, price: 8.5, discount_price: 7.99, offer_end_date: null, is_best_seller: 1,
  is_featured: 1, quantity: 100, status: 'active', created_at: '2024-01-01T00:00:00.000Z',
  is_cart: 0, discount_percent: 6, is_fevorite: '0', description: 'Fresh premium ribeye cut',
  name: 'Premium Beef Ribeye',
  service_types: [{ id: 1, service_type_id: 1, product_id: 1, service_type: { id: 1, status: 'active', name: 'Cleaned' } }],
  cut_types: [{ id: 1, cut_type_id: 1, product_id: 1, cut_type: { id: 1, status: 'active', name: 'Cubes' } }],
  images: [{ id: 1, product_id: 1, image: 'products/ribeye-1.png' }],
};

const userMobileExample = {
  id: 5, name: 'John Doe', email: 'john@example.com', mobile: '96599999999', country_id: 1,
  image_profile: null, status: 'active', notification_status: 1, is_verified: 1,
  created_at: '2024-01-01T00:00:00.000Z', access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};

export const mobileExamples: Record<string, any> = {
  getSetting: {
    settings: {
      id: 1, tax_amount: 0, min_order: 5, from_hour: '09:00', to_hour: '23:00', paginateTotal: 10,
      is_maintenance_mode: 0, is_alowed_register: 1, is_alowed_login: 1, is_alowed_buying: 1, is_alowed_cart: 1,
      info_email: 'info@thabayehkom.app', mobile: '96500000000', whatsApp: '96500000000',
      pages: [{ id: 1, slug: 'about', title: 'About Us', description: '<p>About</p>' }],
      cutTypes: [{ id: 1, status: 'active', name: 'Cubes' }],
      serviceTypes: [{ id: 1, status: 'active', name: 'Cleaned' }],
    },
    advertisement: { id: 1, type: 1, item_id: 1, status: 'active', image: 'ads/1.png', link: '', category_name: 'Promo' },
  },
  getCategories: { items: [{ id: 1, image: 'categories/beef.png', name: 'Beef', status: 'active', created_at: '2024-01-01T00:00:00.000Z' }] },
  getCutTypes: { items: [{ id: 1, status: 'active', created_at: '2024-01-01T00:00:00.000Z', name: 'Cubes' }] },
  getCountries: { items: [{ id: 1, currency_code: 'KWD', country_code: '965', status: 'active', image: 'flags/kw.png', name: 'Kuwait', translations: [{ id: 1, country_id: 1, locale: 'en', name: 'Kuwait', currency_name: 'KWD' }] }] },
  getCities: { items: [{ id: 2, deliveryCost: 2, country_id: 1, status: 'active', name: 'Salmiya' }] },
  getBanners: { items: [{ id: 1, item_id: 1, type: 1, status: 'active', image: 'banners/1.png', link: '', category_name: 'Beef' }] },
  getHomePage: {
    categories: [{ id: 1, image: 'categories/beef.png', name: 'Beef', status: 'active' }],
    banners: [{ id: 1, item_id: 1, type: 1, status: 'active', image: 'banners/1.png', link: '' }],
    best_seller_products: [productMobileExample],
    featured_products: [productMobileExample],
  },
  getProducts: { items: [productMobileExample], is_there_more: false },
  getProductDetails: { items: productMobileExample },
  getMyFavorites: { items: [productMobileExample], is_there_more: false },
  auth: { user: userMobileExample },
  getMyCart: {
    total: 17,
    MyCart: [{ id: 1, user_id: 5, fcm_token: null, product_id: 1, quantity: 2, cut_type_id: 1, service_type_id: 1, country_id: 1, special_request: null, created_at: '2024-01-01T00:00:00.000Z', product: productMobileExample, cut_type: { id: 1, status: 'active', name: 'Cubes' }, service_type: { id: 1, status: 'active', name: 'Cleaned' } }],
  },
  addToCart: { cart_id: 1 },
  checkPromo: { PromotionCode: { id: 1, code: 'WELCOME10', percent: 10, type: 2, status: 'active', description: '10% off' } },
  deliveryCost: { deliveryCost: 2 },
  checkout: {
    order: { id: 1, user_id: 5, sub_total: 17, discount: 1.7, delivery_cost: 2, total_price: 17.3, count_items: 2, payment_method: 3, payment_status: 0, status: 0, status_name: 'Pending', created_at: '2024-01-01T00:00:00.000Z' },
    url: null,
  },
  getMyOrders: { items: [orderResponseExample], is_more: false },
  getOrderById: { item: { ...orderResponseExample, products: [{ id: 1, product_id: 1, quantity: 2, price: 8.5, product: productMobileExample }], address: { id: 1, address_name: 'Home' } } },
  getMyAddresses: { items: [{ id: 1, user_id: 5, address_name: 'Home', country_id: 1, city_id: 2, governorate_id: 1, block: '5', street: '10', type: 'House' }], is_more: false },
  myNotifications: { items: [{ id: 1, user_id: 5, order_id: 1, messag_type: 'order', status: 'unread', message: 'Your order shipped', title: 'Order update', created_at: '2024-01-01T00:00:00.000Z' }], is_more: false },
};

