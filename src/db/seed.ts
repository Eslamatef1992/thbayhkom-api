import { sequelize } from './sequelize';
import { config } from '../config';
import { hashPassword } from '../services/auth';
import {
  User, Role, Permission, RolePermission, UserRole,
  Country, CountryTranslation, City, Category, CutType, ServiceType,
  Product, ProductImage, ProductCutType, ProductServiceType,
  Banner, Advertisement, PromotionCode, Page, Setting,
} from './models';

/**
 * Idempotent seeder. Safe to run multiple times.
 * Creates: RBAC (roles + permissions), an initial admin user, base settings,
 * countries/cities, catalog data, a promo code, and CMS pages.
 * Run with: npm run seed
 */

const PERMISSIONS: Array<[string, string]> = [
  ['dashboard.view', 'View dashboard KPIs'],
  ['orders.view', 'View orders'],
  ['orders.manage', 'Update orders and payment status'],
  ['products.view', 'View products'],
  ['products.manage', 'Create/update/delete products'],
  ['categories.view', 'View categories'],
  ['categories.manage', 'Manage categories'],
  ['banners.view', 'View banners'],
  ['banners.manage', 'Manage banners'],
  ['advertisements.view', 'View advertisements'],
  ['advertisements.manage', 'Manage advertisements'],
  ['countries.view', 'View countries'],
  ['countries.manage', 'Manage countries'],
  ['cities.view', 'View cities'],
  ['cities.manage', 'Manage cities'],
  ['cut_types.view', 'View cut types'],
  ['cut_types.manage', 'Manage cut types'],
  ['service_types.view', 'View service types'],
  ['service_types.manage', 'Manage service types'],
  ['promotions.view', 'View promotion codes'],
  ['promotions.manage', 'Manage promotion codes'],
  ['pages.view', 'View CMS pages'],
  ['pages.manage', 'Manage CMS pages'],
  ['customers.view', 'View customers'],
  ['customers.manage', 'Manage customers'],
  ['notifications.view', 'View notifications'],
  ['notifications.manage', 'Manage notifications'],
  ['settings.view', 'View settings'],
  ['settings.manage', 'Manage settings'],
  ['contact.view', 'View contact messages'],
  ['packages.view', 'View packages'],
  ['packages.manage', 'Manage packages'],
];

// Manager gets everything except settings + customer management.
const MANAGER_PERMS = PERMISSIONS.map(([n]) => n).filter(
  (n) => !n.startsWith('settings.') && !n.startsWith('customers.manage')
);

async function seedRbacAndAdmin() {
  const permByName: Record<string, any> = {};
  for (const [name, description] of PERMISSIONS) {
    const [p] = await Permission.findOrCreate({ where: { name }, defaults: { name, description } });
    permByName[name] = p;
  }

  const [adminRole] = await Role.findOrCreate({ where: { name: 'admin' }, defaults: { name: 'admin', description: 'Full access' } });
  const [managerRole] = await Role.findOrCreate({ where: { name: 'manager' }, defaults: { name: 'manager', description: 'Operational access' } });
  await Role.findOrCreate({ where: { name: 'customer' }, defaults: { name: 'customer', description: 'Mobile app user' } });

  for (const [name] of PERMISSIONS) {
    await RolePermission.findOrCreate({ where: { role_id: (adminRole as any).id, permission_id: permByName[name].id } });
  }
  for (const name of MANAGER_PERMS) {
    await RolePermission.findOrCreate({ where: { role_id: (managerRole as any).id, permission_id: permByName[name].id } });
  }

  const [admin] = await User.findOrCreate({
    where: { email: config.admin.email },
    defaults: {
      name: config.admin.name,
      email: config.admin.email,
      mobile: config.admin.mobile,
      password_hash: await hashPassword(config.admin.password),
      role: 'admin',
      is_admin: true,
      is_verified: 1,
      status: 'active',
    },
  });
  await UserRole.findOrCreate({ where: { user_id: (admin as any).id, role_id: (adminRole as any).id } });
  // eslint-disable-next-line no-console
  console.log(`Admin ready: ${config.admin.email} / ${config.admin.password}`);
}


async function seedSettings() {
  const existing = await Setting.findOne();
  if (existing) return;
  await Setting.create({
    url: 'https://thabayehkom.app',
    info_email: 'info@thabayehkom.app',
    mobile: '96500000000',
    phone: '96500000000',
    tax_amount: 0,
    min_order: 0,
    from_hour: '09:00',
    to_hour: '23:00',
    paginateTotal: 10,
    is_maintenance_mode: 0,
    is_alowed_register: 1,
    is_alowed_login: 1,
    is_alowed_buying: 1,
    is_alowed_cart: 1,
    account_need_to_activate: 0,
    title: 'Thabayehkom',
    description: 'Meat delivery',
    address: 'Kuwait',
    whatsApp: '96500000000',
  });
}

async function seedLocations() {
  if ((await Country.count()) > 0) return;
  const countries = [
    { name: 'Kuwait', currency_code: 'KWD', country_code: '965' },
    { name: 'Saudi Arabia', currency_code: 'SAR', country_code: '966' },
    { name: 'Qatar', currency_code: 'QAR', country_code: '974' },
  ];
  for (const c of countries) {
    const country: any = await Country.create({ ...c, status: 'active' });
    await CountryTranslation.create({ country_id: country.id, locale: 'en', name: c.name, currency_name: c.currency_code });
    await CountryTranslation.create({ country_id: country.id, locale: 'ar', name: c.name, currency_name: c.currency_code });
    const gov: any = await City.create({ name: `${c.name} Capital`, country_id: country.id, parent_id: null, status: 'active', deliveryCost: 1 });
    await City.create({ name: `${c.name} City`, country_id: country.id, parent_id: gov.id, status: 'active', deliveryCost: 2 });
  }
}

async function seedCatalog() {
  if ((await Product.count()) > 0) return;

  const beef = await Category.create({ name: 'Beef', status: 'active', image: 'categories/beef.png' });
  const lamb = await Category.create({ name: 'Lamb', status: 'active', image: 'categories/lamb.png' });
  const chicken = await Category.create({ name: 'Chicken', status: 'active', image: 'categories/chicken.png' });

  const cubes = await CutType.create({ name: 'Cubes', status: 'active' });
  const mince = await CutType.create({ name: 'Minced', status: 'active' });
  await CutType.create({ name: 'Whole', status: 'active' });

  const cleaned = await ServiceType.create({ name: 'Cleaned', status: 'active' });
  const packed = await ServiceType.create({ name: 'Vacuum Packed', status: 'active' });

  const products = [
    { name: 'Premium Beef Ribeye', category_id: (beef as any).id, price: 8.5, is_best_seller: 1, is_featured: 1, quantity: 100 },
    { name: 'Fresh Lamb Chops', category_id: (lamb as any).id, price: 6.75, discount_price: 5.99, discount_percent: 11, is_featured: 1, quantity: 80 },
    { name: 'Whole Chicken', category_id: (chicken as any).id, price: 3.25, is_best_seller: 1, quantity: 200 },
    { name: 'Ground Beef', category_id: (beef as any).id, price: 5.0, quantity: 150 },
  ];
  for (const p of products) {
    const product: any = await Product.create({ ...p, country_id: 1, status: 'active', type: 1 });
    await ProductImage.create({ product_id: product.id, image: 'products/sample.png' });
    await ProductCutType.create({ product_id: product.id, cut_type_id: (cubes as any).id });
    await ProductCutType.create({ product_id: product.id, cut_type_id: (mince as any).id });
    await ProductServiceType.create({ product_id: product.id, service_type_id: (cleaned as any).id });
    await ProductServiceType.create({ product_id: product.id, service_type_id: (packed as any).id });
  }

  await Banner.create({ item_id: 1, type: 1, status: 'active', image: 'banners/1.png', link: '', category_name: 'Beef' });
  await Advertisement.create({ type: 1, item_id: 1, status: 'active', image: 'ads/1.png', link: '', category_name: 'Promo' });
  await PromotionCode.create({ code: 'WELCOME10', percent: 10, type: 2, status: 'active', description: '10% off' });
}

async function seedPages() {
  if ((await Page.count()) > 0) return;
  const pages = [
    { slug: 'about', title: 'About Us', description: '<p>About Thabayehkom</p>' },
    { slug: 'terms', title: 'Terms & Conditions', description: '<p>Terms</p>' },
    { slug: 'privacy', title: 'Privacy Policy', description: '<p>Privacy</p>' },
  ];
  for (const p of pages) await Page.create({ ...p, views: 0 });
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
