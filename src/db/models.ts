import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize';

/**
 * Models aligned to the leader's Laravel schema
 * (backend/thabayehkom-backend-database). Names/descriptions live in
 * *_translations tables; admins are separate from app users; products link
 * categories via a pivot. Presenters resolve translations back into the exact
 * JSON the Flutter app expects, so mobile request/response shapes never change.
 */

/* ------------------------------ Core / Users ------------------------------ */
export class User extends Model {}
User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, unique: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    image_profile: { type: DataTypes.STRING, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: true }, // hashed
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    notification_status: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_verified: { type: DataTypes.INTEGER, defaultValue: 0 },
    social_type: { type: DataTypes.STRING, allowNull: true },
    social_token: { type: DataTypes.STRING, allowNull: true },
    device_type: { type: DataTypes.STRING, allowNull: true },
    fcm_token: { type: DataTypes.STRING, allowNull: true },
    language: { type: DataTypes.STRING, defaultValue: 'en' },
    remember_token: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'user', tableName: 'users', paranoid: true }
);

/* ------------------------------ Admin / RBAC ------------------------------ */
export class Admin extends Model {}
Admin.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, unique: true },
    password: { type: DataTypes.STRING },
    role_id: { type: DataTypes.INTEGER, allowNull: true },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    remember_token: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'admin', tableName: 'admins', paranoid: true }
);

export class Role extends Model {}
Role.init(
  { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
  { sequelize, modelName: 'role', tableName: 'roles', paranoid: true }
);

export class RoleTranslation extends Model {}
RoleTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    role_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
  },
  { sequelize, modelName: 'role_translation', tableName: 'role_translations', timestamps: false }
);

export class Permission extends Model {}
Permission.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING, unique: true },
  },
  { sequelize, modelName: 'permission', tableName: 'permissions' }
);

export class RolePermission extends Model {}
RolePermission.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    role_id: { type: DataTypes.INTEGER },
    permission_id: { type: DataTypes.INTEGER },
  },
  { sequelize, modelName: 'role_permission', tableName: 'role_permissions' }
);


/* -------------------------- Settings + Translations ----------------------- */
export class Setting extends Model {}
Setting.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    url: { type: DataTypes.STRING, allowNull: true },
    logo: { type: DataTypes.STRING, allowNull: true },
    footer_logo: { type: DataTypes.STRING, allowNull: true },
    image: { type: DataTypes.STRING, allowNull: true },
    banner_image: { type: DataTypes.STRING, allowNull: true },
    banner_link: { type: DataTypes.STRING, allowNull: true },
    appointment_price: { type: DataTypes.INTEGER, defaultValue: 0 },
    tax_amount: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_in_mony: { type: DataTypes.INTEGER, defaultValue: 0 },
    mony_in_points: { type: DataTypes.INTEGER, defaultValue: 0 },
    min_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    paginate_total: { type: DataTypes.INTEGER, defaultValue: 10 },
    admin_commission_parcent: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_maintenance_mode: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_alowed_register: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_alowed_login: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_alowed_buying: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_alowed_cart: { type: DataTypes.INTEGER, defaultValue: 1 },
    account_need_to_activate: { type: DataTypes.INTEGER, defaultValue: 0 },
    app_store_url: { type: DataTypes.STRING, allowNull: true },
    play_store_url: { type: DataTypes.STRING, allowNull: true },
    info_email: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    facebook: { type: DataTypes.STRING, allowNull: true },
    twitter: { type: DataTypes.STRING, allowNull: true },
    linked_in: { type: DataTypes.STRING, allowNull: true },
    instagram: { type: DataTypes.STRING, allowNull: true },
    snapchat: { type: DataTypes.STRING, allowNull: true },
    whatsApp: { type: DataTypes.STRING, allowNull: true },
    google_plus: { type: DataTypes.STRING, allowNull: true },
    youtube: { type: DataTypes.STRING, allowNull: true },
    from_hour: { type: DataTypes.STRING, allowNull: true },
    to_hour: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.STRING, allowNull: true },
    longitude: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'setting', tableName: 'settings' }
);

export class SettingTranslation extends Model {}
SettingTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    setting_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'setting_translation', tableName: 'setting_translations', timestamps: false }
);

/* --------------------------- Countries & Cities --------------------------- */
export class Country extends Model {}
Country.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    image: { type: DataTypes.STRING, allowNull: true },
    currency_code: { type: DataTypes.STRING, allowNull: true },
    country_code: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'country', tableName: 'countries', paranoid: true }
);

export class CountryTranslation extends Model {}
CountryTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    country_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
    currency_name: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'country_translation', tableName: 'country_translations', timestamps: false }
);

export class City extends Model {}
City.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    country_id: { type: DataTypes.INTEGER },
    parent_id: { type: DataTypes.INTEGER, allowNull: true }, // null => governorate
    delivery_cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'city', tableName: 'cities', paranoid: true }
);

export class CityTranslation extends Model {}
CityTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    city_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
  },
  { sequelize, modelName: 'city_translation', tableName: 'city_translations', timestamps: false }
);


/* -------------------------- Categories & Types ---------------------------- */
export class Category extends Model {}
Category.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    image: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'category', tableName: 'categories', paranoid: true }
);

export class CategoryTranslation extends Model {}
CategoryTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
  },
  { sequelize, modelName: 'category_translation', tableName: 'category_translations', timestamps: false }
);

export class ServiceType extends Model {}
ServiceType.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'service_type', tableName: 'service_types', paranoid: true }
);

export class ServiceTypeTranslation extends Model {}
ServiceTypeTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    service_type_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
  },
  { sequelize, modelName: 'service_type_translation', tableName: 'service_type_translations', timestamps: false }
);

export class CutType extends Model {}
CutType.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'cut_type', tableName: 'cut_types', paranoid: true }
);

export class CutTypeTranslation extends Model {}
CutTypeTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cut_type_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
  },
  { sequelize, modelName: 'cut_type_translation', tableName: 'cut_type_translations', timestamps: false }
);

/* -------------------------------- Products -------------------------------- */
export class Product extends Model {}
Product.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.INTEGER, defaultValue: 1 },
    image: { type: DataTypes.STRING, allowNull: true },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    discount_price: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    offer_end_date: { type: DataTypes.DATEONLY, allowNull: true },
    is_best_seller: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_featured: { type: DataTypes.INTEGER, defaultValue: 0 },
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'product', tableName: 'products', paranoid: true }
);

export class ProductTranslation extends Model {}
ProductTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    name: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'product_translation', tableName: 'product_translations', timestamps: false }
);

export class ProductImage extends Model {}
ProductImage.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER },
    image: { type: DataTypes.STRING },
  },
  { sequelize, modelName: 'product_image', tableName: 'product_images' }
);

export class ProductCategory extends Model {}
ProductCategory.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER },
    category_id: { type: DataTypes.INTEGER },
  },
  { sequelize, modelName: 'product_category', tableName: 'product_categories', paranoid: true }
);


/* ------------------------------ Cart / Address ---------------------------- */
export class Cart extends Model {}
Cart.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    fcm_token: { type: DataTypes.STRING, allowNull: true },
    product_id: { type: DataTypes.INTEGER },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    cut_type_id: { type: DataTypes.INTEGER, allowNull: true },
    service_type_id: { type: DataTypes.INTEGER, allowNull: true },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    special_request: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'cart', tableName: 'carts', paranoid: true }
);

export class Address extends Model {}
Address.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    address_name: { type: DataTypes.STRING, allowNull: true },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    governorate_id: { type: DataTypes.INTEGER, allowNull: true },
    city_id: { type: DataTypes.INTEGER, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: true },
    block: { type: DataTypes.STRING, allowNull: true },
    street: { type: DataTypes.STRING, allowNull: true },
    avenue: { type: DataTypes.STRING, allowNull: true },
    house_number: { type: DataTypes.STRING, allowNull: true },
    building_number: { type: DataTypes.STRING, allowNull: true },
    floor_number: { type: DataTypes.STRING, allowNull: true },
    apartment_number: { type: DataTypes.STRING, allowNull: true },
    address_line_1: { type: DataTypes.TEXT, allowNull: true },
    address_line_2: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    latitude: { type: DataTypes.STRING, allowNull: true },
    longitude: { type: DataTypes.STRING, allowNull: true },
    defult: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, modelName: 'address', tableName: 'user_addresses', paranoid: true }
);

/* -------------------------------- Orders ---------------------------------- */
export class Order extends Model {}
Order.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    address_id: { type: DataTypes.INTEGER, allowNull: true },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    fcm_token: { type: DataTypes.STRING, allowNull: true },
    sub_total: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    delivery_cost: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    total_price: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    discount_code: { type: DataTypes.STRING, allowNull: true },
    count_items: { type: DataTypes.INTEGER, defaultValue: 0 },
    special_request: { type: DataTypes.TEXT, allowNull: true },
    payment_method: { type: DataTypes.INTEGER, defaultValue: 1 },
    payment_status: { type: DataTypes.INTEGER, defaultValue: 0 },
    payment_id: { type: DataTypes.STRING, allowNull: true },
    transaction_id: { type: DataTypes.STRING, allowNull: true },
    payment_json: { type: DataTypes.TEXT, allowNull: true },
    payment_check_response: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.INTEGER, defaultValue: 0 },
    ordered_date: { type: DataTypes.DATEONLY, allowNull: true },
  },
  { sequelize, modelName: 'order', tableName: 'orders', paranoid: true }
);

export class OrderProduct extends Model {}
OrderProduct.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER },
    product_id: { type: DataTypes.INTEGER },
    service_type_id: { type: DataTypes.INTEGER, allowNull: true },
    cut_type_id: { type: DataTypes.INTEGER, allowNull: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    price: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    offer_price: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    special_request: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'order_product', tableName: 'order_products', paranoid: true }
);

/* --------------------------- Promotions / Banners ------------------------- */
export class PromotionCode extends Model {}
PromotionCode.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING, unique: true },
    percent: { type: DataTypes.INTEGER, defaultValue: 0 },
    type: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: 'promotion_code', tableName: 'promotion_codes', paranoid: true }
);

export class Banner extends Model {}
Banner.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.INTEGER, defaultValue: 1 },
    item_id: { type: DataTypes.INTEGER, allowNull: true },
    image: { type: DataTypes.STRING, allowNull: true },
    link: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'banner', tableName: 'banners', paranoid: true }
);

export class Advertisement extends Model {}
Advertisement.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.INTEGER, defaultValue: 1 },
    item_id: { type: DataTypes.INTEGER, allowNull: true },
    image: { type: DataTypes.STRING, allowNull: true },
    link: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'advertisement', tableName: 'advertisements', paranoid: true }
);

/* ------------------------ Notifications / Pages / Contact ----------------- */
export class Notification extends Model {}
Notification.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    order_id: { type: DataTypes.INTEGER, allowNull: true },
    messag_type: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'unread' },
  },
  { sequelize, modelName: 'notify', tableName: 'notify', paranoid: true }
);

export class NotificationTranslation extends Model {}
NotificationTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    notify_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'notify_translation', tableName: 'notify_translations', timestamps: false }
);

export class Page extends Model {}
Page.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    slug: { type: DataTypes.STRING, unique: true },
    image: { type: DataTypes.STRING, allowNull: true },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, modelName: 'page', tableName: 'pages', paranoid: true }
);

export class PageTranslation extends Model {}
PageTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    page_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    key_words: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'page_translation', tableName: 'page_translations', timestamps: false }
);

export class ContactMessage extends Model {}
ContactMessage.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'unread' },
  },
  { sequelize, modelName: 'contact', tableName: 'contacts' }
);

export class ProductServiceType extends Model {}
ProductServiceType.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER },
    service_type_id: { type: DataTypes.INTEGER },
  },
  { sequelize, modelName: 'product_service_type', tableName: 'product_service_types', paranoid: true }
);

export class ProductCutType extends Model {}
ProductCutType.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER },
    cut_type_id: { type: DataTypes.INTEGER },
  },
  { sequelize, modelName: 'product_cut_type', tableName: 'product_cut_types', paranoid: true }
);

export class Favorite extends Model {}
Favorite.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    product_id: { type: DataTypes.INTEGER },
  },
  { sequelize, modelName: 'favorite', tableName: 'favorites' }
);

/* ------------------------------ Associations ------------------------------ */
Country.hasMany(CountryTranslation, { as: 'translations', foreignKey: 'country_id' });
CountryTranslation.belongsTo(Country, { foreignKey: 'country_id' });

City.hasMany(CityTranslation, { as: 'translations', foreignKey: 'city_id' });
CityTranslation.belongsTo(City, { foreignKey: 'city_id' });

Setting.hasMany(SettingTranslation, { as: 'translations', foreignKey: 'setting_id' });
Category.hasMany(CategoryTranslation, { as: 'translations', foreignKey: 'category_id' });
ServiceType.hasMany(ServiceTypeTranslation, { as: 'translations', foreignKey: 'service_type_id' });
CutType.hasMany(CutTypeTranslation, { as: 'translations', foreignKey: 'cut_type_id' });
Role.hasMany(RoleTranslation, { as: 'translations', foreignKey: 'role_id' });
Page.hasMany(PageTranslation, { as: 'translations', foreignKey: 'page_id' });
Notification.hasMany(NotificationTranslation, { as: 'translations', foreignKey: 'notify_id' });

Product.hasMany(ProductTranslation, { as: 'translations', foreignKey: 'product_id' });
Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id' });
Product.hasMany(ProductCategory, { as: 'product_categories', foreignKey: 'product_id' });
ProductCategory.belongsTo(Category, { as: 'category', foreignKey: 'category_id' });
Product.hasMany(ProductCutType, { as: 'cut_types', foreignKey: 'product_id' });
ProductCutType.belongsTo(CutType, { as: 'cut_type', foreignKey: 'cut_type_id' });
Product.hasMany(ProductServiceType, { as: 'service_types', foreignKey: 'product_id' });
ProductServiceType.belongsTo(ServiceType, { as: 'service_type', foreignKey: 'service_type_id' });

Order.hasMany(OrderProduct, { as: 'products', foreignKey: 'order_id' });
OrderProduct.belongsTo(Order, { foreignKey: 'order_id' });
OrderProduct.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
OrderProduct.belongsTo(CutType, { as: 'cut_type', foreignKey: 'cut_type_id' });
OrderProduct.belongsTo(ServiceType, { as: 'service_type', foreignKey: 'service_type_id' });
Order.belongsTo(Address, { as: 'address', foreignKey: 'address_id' });

Cart.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
Cart.belongsTo(CutType, { as: 'cut_type', foreignKey: 'cut_type_id' });
Cart.belongsTo(ServiceType, { as: 'service_type', foreignKey: 'service_type_id' });

Address.belongsTo(Country, { as: 'country', foreignKey: 'country_id' });
Address.belongsTo(City, { as: 'city', foreignKey: 'city_id' });
Address.belongsTo(City, { as: 'governorate', foreignKey: 'governorate_id' });

Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id' });
Admin.belongsTo(Role, { as: 'role', foreignKey: 'role_id' });

/* ----------------------------- i18n helpers ------------------------------- */
/** Pick the translated `name` (or any field) for a locale, falling back to en then first. */
export function tr(translations: any[] | undefined, locale: string, field = 'name'): string | null {
  if (!translations || !translations.length) return null;
  const exact = translations.find((t) => t.locale === locale);
  const en = translations.find((t) => t.locale === 'en');
  return (exact || en || translations[0])?.[field] ?? null;
}

