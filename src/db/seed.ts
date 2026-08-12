import { sequelize } from './sequelize';
import { config } from '../config';
import { hashPassword } from '../services/auth';
import {
  Admin, Role, RoleTranslation, Permission, RolePermission,
  Country, CountryTranslation, City, CityTranslation,
  Category, CategoryTranslation, CutType, CutTypeTranslation, ServiceType, ServiceTypeTranslation,
  Product, ProductTranslation, ProductImage, ProductCategory, ProductCutType, ProductServiceType,
  Banner, Advertisement, PromotionCode, Page, PageTranslation, Setting, SettingTranslation,
} from './models';

/**
 * Idempotent seeder for the leader's translated schema.
 * Run with: npm run seed
 */

const PERMISSIONS: string[] = [
  'dashboard.view', 'orders.view', 'orders.manage', 'products.view', 'products.manage',
  'categories.view', 'categories.manage', 'banners.view', 'banners.manage',
  'advertisements.view', 'advertisements.manage', 'countries.view', 'countries.manage',
  'cities.view', 'cities.manage', 'cut_types.view', 'cut_types.manage',
  'service_types.view', 'service_types.manage', 'promotions.view', 'promotions.manage',
  'pages.view', 'pages.manage', 'customers.view', 'customers.manage',
  'notifications.view', 'notifications.manage', 'settings.view', 'settings.manage', 'contact.view',
];

const MANAGER_PERMS = PERMISSIONS.filter(
  (n) => !n.startsWith('settings.') && !n.startsWith('customers.manage')
);

async function seedRbacAndAdmin() {
  const permByKey: Record<string, any> = {};
  for (const key of PERMISSIONS) {
    const [p] = await Permission.findOrCreate({ where: { key }, defaults: { key } });
    permByKey[key] = p;
  }

  const [adminRole] = await Role.findOrCreate({ where: { id: 1 }, defaults: { id: 1 } });
  const [managerRole] = await Role.findOrCreate({ where: { id: 2 }, defaults: { id: 2 } });
  const [customerRole] = await Role.findOrCreate({ where: { id: 3 }, defaults: { id: 3 } });
  const roleNames: Array<[any, string, string]> = [
    [adminRole, 'Admin', 'مدير'], [managerRole, 'Manager', 'مشرف'], [customerRole, 'Customer', 'عميل'],
  ];
  for (const [role, en, ar] of roleNames) {
    await RoleTranslation.findOrCreate({ where: { role_id: role.id, locale: 'en' }, defaults: { role_id: role.id, locale: 'en', name: en } });
    await RoleTranslation.findOrCreate({ where: { role_id: role.id, locale: 'ar' }, defaults: { role_id: role.id, locale: 'ar', name: ar } });
  }

  // admin role (id 1) implicitly gets all permissions; manager gets a subset.
  for (const key of MANAGER_PERMS) {
    await RolePermission.findOrCreate({ where: { role_id: (managerRole as any).id, permission_id: permByKey[key].id } });
  }

  const [admin] = await Admin.findOrCreate({
    where: { email: config.admin.email },
    defaults: {
      name: config.admin.name, email: config.admin.email,
      password: await hashPassword(config.admin.password), role_id: 1, status: 'active',
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Admin ready: ${config.admin.email} / ${config.admin.password} (id ${(admin as any).id})`);
}


async function seedSettings() {
  if (await Setting.findOne()) return;
  const s: any = await Setting.create({
    tax_amount: 0, min_order: 0, from_hour: '09:00', to_hour: '23:00', paginate_total: 10,
    is_maintenance_mode: 0, is_alowed_register: 1, is_alowed_login: 1, is_alowed_buying: 1,
    is_alowed_cart: 1, account_need_to_activate: 0, info_email: 'info@thabayehkom.app',
    mobile: '96500000000', whatsApp: '96500000000',
  });
  await SettingTranslation.bulkCreate([
    { setting_id: s.id, locale: 'en', title: 'Thabayehkom', description: 'Fresh meat delivery service', address: 'Kuwait' },
    { setting_id: s.id, locale: 'ar', title: 'ذبايحكم', description: 'خدمة توصيل اللحوم الطازجة', address: 'الكويت' },
  ]);
}

async function seedLocations() {
  if ((await Country.count()) > 0) return;
  const countries = [
    { en: 'Kuwait', ar: 'الكويت', currency_code: 'KWD', code: 'KW', gov_en: 'Kuwait City', gov_ar: 'مدينة الكويت' },
    { en: 'Saudi Arabia', ar: 'السعودية', currency_code: 'SAR', code: 'SA', gov_en: 'Riyadh', gov_ar: 'الرياض' },
    { en: 'Qatar', ar: 'قطر', currency_code: 'QAR', code: 'QA', gov_en: 'Doha', gov_ar: 'الدوحة' },
  ];
  for (const c of countries) {
    const country: any = await Country.create({ currency_code: c.currency_code, country_code: c.code, status: 'active' });
    await CountryTranslation.bulkCreate([
      { country_id: country.id, locale: 'en', name: c.en, currency_name: c.currency_code },
      { country_id: country.id, locale: 'ar', name: c.ar, currency_name: c.currency_code },
    ]);
    const gov: any = await City.create({ country_id: country.id, parent_id: null, delivery_cost: 1, status: 'active' });
    await CityTranslation.bulkCreate([
      { city_id: gov.id, locale: 'en', name: c.gov_en }, { city_id: gov.id, locale: 'ar', name: c.gov_ar },
    ]);
    const city: any = await City.create({ country_id: country.id, parent_id: gov.id, delivery_cost: 2, status: 'active' });
    await CityTranslation.bulkCreate([
      { city_id: city.id, locale: 'en', name: `${c.gov_en} Area` }, { city_id: city.id, locale: 'ar', name: `منطقة ${c.gov_ar}` },
    ]);
  }
}

async function seedCatalog() {
  if ((await Product.count()) > 0) return;

  async function makeCategory(en: string, ar: string, image: string) {
    const c: any = await Category.create({ image, status: 'active' });
    await CategoryTranslation.bulkCreate([
      { category_id: c.id, locale: 'en', name: en }, { category_id: c.id, locale: 'ar', name: ar },
    ]);
    return c;
  }
  async function makeCut(en: string, ar: string) {
    const c: any = await CutType.create({ status: 'active' });
    await CutTypeTranslation.bulkCreate([
      { cut_type_id: c.id, locale: 'en', name: en }, { cut_type_id: c.id, locale: 'ar', name: ar },
    ]);
    return c;
  }
  async function makeService(en: string, ar: string) {
    const s: any = await ServiceType.create({ status: 'active' });
    await ServiceTypeTranslation.bulkCreate([
      { service_type_id: s.id, locale: 'en', name: en }, { service_type_id: s.id, locale: 'ar', name: ar },
    ]);
    return s;
  }

  const beef = await makeCategory('Beef', 'بقري', 'categories/beef.png');
  const lamb = await makeCategory('Lamb', 'خروف', 'categories/lamb.png');
  const chicken = await makeCategory('Chicken', 'دجاج', 'categories/chicken.png');

  const cubes = await makeCut('Cubes', 'مكعبات');
  const minced = await makeCut('Minced', 'مفروم');
  await makeCut('Whole', 'كامل');

  const cleaned = await makeService('Cleaned', 'منظف');
  const packed = await makeService('Vacuum Packed', 'تغليف مفرغ');

  const products = [
    { en: 'Premium Beef Ribeye', ar: 'ريب آي بقري ممتاز', cat: beef, price: 8.5, discount: 7.99, best: 1, feat: 1, qty: 100 },
    { en: 'Fresh Lamb Chops', ar: 'ريش غنم طازجة', cat: lamb, price: 6.75, discount: 5.99, best: 0, feat: 1, qty: 80 },
    { en: 'Whole Chicken', ar: 'دجاجة كاملة', cat: chicken, price: 3.25, discount: 0, best: 1, feat: 0, qty: 200 },
  ];
  for (const p of products) {
    const product: any = await Product.create({
      type: 1, image: 'products/sample.png', country_id: 1, price: p.price, discount_price: p.discount,
      is_best_seller: p.best, is_featured: p.feat, quantity: p.qty, status: 'active',
    });
    await ProductTranslation.bulkCreate([
      { product_id: product.id, locale: 'en', name: p.en, description: 'Fresh premium quality.' },
      { product_id: product.id, locale: 'ar', name: p.ar, description: 'جودة طازجة وممتازة.' },
    ]);
    await ProductImage.create({ product_id: product.id, image: 'products/sample.png' });
    await ProductCategory.create({ product_id: product.id, category_id: (p.cat as any).id });
    await ProductCutType.bulkCreate([
      { product_id: product.id, cut_type_id: (cubes as any).id },
      { product_id: product.id, cut_type_id: (minced as any).id },
    ]);
    await ProductServiceType.bulkCreate([
      { product_id: product.id, service_type_id: (cleaned as any).id },
      { product_id: product.id, service_type_id: (packed as any).id },
    ]);
  }

  await Banner.create({ type: 1, item_id: 1, status: 'active', image: 'banners/1.png', link: '' });
  await Advertisement.create({ type: 1, item_id: 1, status: 'active', image: 'ads/1.png', link: '' });
  await PromotionCode.create({ code: 'WELCOME10', percent: 10, type: 2, status: 'active', description: '10% off' });
}

async function seedPages() {
  if ((await Page.count()) > 0) return;
  const pages = [
    { slug: 'about', en: 'About Us', ar: 'عن التطبيق' },
    { slug: 'terms', en: 'Terms & Conditions', ar: 'الشروط والأحكام' },
    { slug: 'privacy', en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
  ];
  for (const p of pages) {
    const page: any = await Page.create({ slug: p.slug, views: 0 });
    await PageTranslation.bulkCreate([
      { page_id: page.id, locale: 'en', title: p.en, description: 'Content coming soon.' },
      { page_id: page.id, locale: 'ar', title: p.ar, description: 'المحتوى قريباً.' },
    ]);
  }
}

export async function runSeed() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  await seedRbacAndAdmin();
  await seedSettings();
  await seedLocations();
  await seedCatalog();
  await seedPages();
  // eslint-disable-next-line no-console
  console.log('Seeding complete.');
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

