import { DataTypes, Model } from 'sequelize';
import { sequelize } from './sequelize';

/**
 * All models for the Thabayehkom backend.
 * Column names use snake_case (Sequelize `underscored: true`) to match the
 * JSON contract documented in backend/docs/03_DATA_MODEL.md.
 */

export class User extends Model {}
User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, unique: true },
    mobile: { type: DataTypes.STRING },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    image_profile: { type: DataTypes.STRING, allowNull: true },
    password_hash: { type: DataTypes.STRING, allowNull: true },
    remember_token: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    notification_status: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_verified: { type: DataTypes.INTEGER, defaultValue: 0 },
    // Admin/RBAC additions (mobile app never reads these)
    role: { type: DataTypes.STRING, defaultValue: 'customer' }, // customer | admin | manager
    is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
    social_type: { type: DataTypes.STRING, allowNull: true },
    social_id: { type: DataTypes.STRING, allowNull: true },
    apple_relay_email: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'user', tableName: 'users' }
);

export class Role extends Model {}
Role.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true }, // admin | manager | customer
    description: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'role', tableName: 'roles' }
);

export class Permission extends Model {}
Permission.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, unique: true }, // e.g. products.manage
    description: { type: DataTypes.STRING, allowNull: true },
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

export class UserRole extends Model {}
UserRole.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER },
    role_id: { type: DataTypes.INTEGER },
  },
  { sequelize, modelName: 'user_role', tableName: 'user_roles' }
);


export class Country extends Model {}
Country.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    currency_code: { type: DataTypes.STRING },
    country_code: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    image: { type: DataTypes.STRING, allowNull: true },
    icon_url: { type: DataTypes.STRING, allowNull: true }, // country flag
    name: { type: DataTypes.STRING },
    name_en: { type: DataTypes.STRING, allowNull: true },
    name_ar: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'country', tableName: 'countries' }
);

export class CountryTranslation extends Model {}
CountryTranslation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    country_id: { type: DataTypes.INTEGER },
    locale: { type: DataTypes.STRING }, // en | ar
    name: { type: DataTypes.STRING },
    currency_name: { type: DataTypes.STRING, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'country_translation', tableName: 'country_translations' }
);

export class City extends Model {}
City.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    name_en: { type: DataTypes.STRING, allowNull: true },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    country_id: { type: DataTypes.INTEGER },
    parent_id: { type: DataTypes.INTEGER, allowNull: true }, // null => governorate
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    deliveryCost: { type: DataTypes.FLOAT, allowNull: true, field: 'delivery_cost' },
  },
  { sequelize, modelName: 'city', tableName: 'cities' }
);

export class Category extends Model {}
Category.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    image: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'category', tableName: 'categories' }
);

export class CutType extends Model {}
CutType.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'cut_type', tableName: 'cut_types' }
);

export class ServiceType extends Model {}
ServiceType.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'service_type', tableName: 'service_types' }
);


export class Product extends Model {}
Product.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    name_en: { type: DataTypes.STRING, allowNull: true },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    description_en: { type: DataTypes.TEXT, allowNull: true },
    description_ar: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.INTEGER, allowNull: true },
    image: { type: DataTypes.STRING, allowNull: true },
    url_link: { type: DataTypes.STRING, allowNull: true },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    category_id: { type: DataTypes.INTEGER, allowNull: true },
    price: { type: DataTypes.FLOAT, defaultValue: 0 },
    discount_price: { type: DataTypes.FLOAT, allowNull: true },
    discount_percent: { type: DataTypes.INTEGER, allowNull: true },
    offer_end_date: { type: DataTypes.DATEONLY, allowNull: true },
    is_best_seller: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_featured: { type: DataTypes.INTEGER, defaultValue: 0 },
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
  },
  { sequelize, modelName: 'product', tableName: 'products' }
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

export class ProductCutType extends Model {}
ProductCutType.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER },
    cut_type_id: { type: DataTypes.INTEGER },
  },
  { sequelize, modelName: 'product_cut_type', tableName: 'product_cut_types' }
);

export class ProductServiceType extends Model {}
ProductServiceType.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER },
    service_type_id: { type: DataTypes.INTEGER },
  },
  { sequelize, modelName: 'product_service_type', tableName: 'product_service_types' }
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

export class Address extends Model {}
Address.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    address_name: { type: DataTypes.STRING, allowNull: true },
    country_id: { type: DataTypes.INTEGER, allowNull: true },
    city_id: { type: DataTypes.INTEGER, allowNull: true },
    governorate_id: { type: DataTypes.INTEGER, allowNull: true },
    block: { type: DataTypes.STRING, allowNull: true },
    street: { type: DataTypes.STRING, allowNull: true },
    avenue: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: true },
    building_number: { type: DataTypes.STRING, allowNull: true },
    floor_number: { type: DataTypes.STRING, allowNull: true },
    apartment_number: { type: DataTypes.STRING, allowNull: true },
    house_number: { type: DataTypes.STRING, allowNull: true },
    address_line_1: { type: DataTypes.STRING, allowNull: true },
    address_line_2: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.STRING, allowNull: true },
    defult: { type: DataTypes.INTEGER, defaultValue: 0 },
    longitude: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'address', tableName: 'addresses' }
);

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
    special_request: { type: DataTypes.STRING, allowNull: true },
    package_id: { type: DataTypes.INTEGER, allowNull: true }, // set instead of product_id for a package line
  },
  { sequelize, modelName: 'cart', tableName: 'carts' }
);

export class PromotionCode extends Model {}
PromotionCode.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING, unique: true },
    percent: { type: DataTypes.INTEGER, defaultValue: 0 },
    type: { type: DataTypes.INTEGER, defaultValue: 2 }, // 2 => percent, else fixed
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    start_date: { type: DataTypes.DATE, allowNull: true },
    end_date: { type: DataTypes.DATE, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    max_use: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: 'promotion_code', tableName: 'promotion_codes' }
);


export class Order extends Model {}
Order.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    total_price: { type: DataTypes.FLOAT, defaultValue: 0 },
    sub_total: { type: DataTypes.FLOAT, defaultValue: 0 },
    address_id: { type: DataTypes.INTEGER, allowNull: true },
    discount: { type: DataTypes.FLOAT, defaultValue: 0 },
    delivery_cost: { type: DataTypes.FLOAT, defaultValue: 0 },
    discount_code: { type: DataTypes.STRING, allowNull: true },
    count_items: { type: DataTypes.INTEGER, defaultValue: 0 },
    fcm_token: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    payment_id: { type: DataTypes.STRING, allowNull: true },
    transaction_id: { type: DataTypes.STRING, allowNull: true },
    payment_json: { type: DataTypes.TEXT, allowNull: true },
    payment_check_response: { type: DataTypes.TEXT, allowNull: true },
    payment_method: { type: DataTypes.INTEGER, allowNull: true },
    payment_status: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.INTEGER, defaultValue: 0 },
    status_name: { type: DataTypes.STRING, allowNull: true },
    ordered_date: { type: DataTypes.DATE, allowNull: true },
    special_request: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'order', tableName: 'orders' }
);

export class OrderProduct extends Model {}
OrderProduct.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER },
    product_id: { type: DataTypes.INTEGER },
    cut_type_id: { type: DataTypes.INTEGER, allowNull: true },
    service_type_id: { type: DataTypes.INTEGER, allowNull: true },
    special_request: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    discount: { type: DataTypes.FLOAT, defaultValue: 0 },
    price: { type: DataTypes.FLOAT, defaultValue: 0 },
    offer_price: { type: DataTypes.FLOAT, allowNull: true },
    package_id: { type: DataTypes.INTEGER, allowNull: true }, // set instead of product_id for a package line
  },
  { sequelize, modelName: 'order_product', tableName: 'order_products' }
);

export class Banner extends Model {}
Banner.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    item_id: { type: DataTypes.INTEGER, allowNull: true },
    type: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    image: { type: DataTypes.STRING, allowNull: true },
    link: { type: DataTypes.STRING, allowNull: true },
    category_name: { type: DataTypes.STRING, allowNull: true },
    video_url: { type: DataTypes.STRING, allowNull: true }, // type 3 = video banner
  },
  { sequelize, modelName: 'banner', tableName: 'banners' }
);

export class Advertisement extends Model {}
Advertisement.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.INTEGER, allowNull: true },
    item_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    image: { type: DataTypes.STRING, allowNull: true },
    link: { type: DataTypes.STRING, allowNull: true },
    category_name: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'advertisement', tableName: 'advertisements' }
);

export class Notification extends Model {}
Notification.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    order_id: { type: DataTypes.INTEGER, allowNull: true },
    messag_type: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, defaultValue: 'unread' },
    message: { type: DataTypes.STRING, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'notification', tableName: 'notifications' }
);

export class ContactMessage extends Model {}
ContactMessage.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { sequelize, modelName: 'contact_message', tableName: 'contact_messages' }
);

export class Page extends Model {}
Page.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    slug: { type: DataTypes.STRING },
    image: { type: DataTypes.STRING, allowNull: true },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    title: { type: DataTypes.STRING },
    title_en: { type: DataTypes.STRING, allowNull: true },
    title_ar: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    description_en: { type: DataTypes.TEXT, allowNull: true },
    description_ar: { type: DataTypes.TEXT, allowNull: true },
    key_words: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.STRING, defaultValue: 'web' },
  },
  { sequelize, modelName: 'page', tableName: 'pages' }
);

export class Setting extends Model {}
Setting.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    url: { type: DataTypes.STRING, allowNull: true },
    logo: { type: DataTypes.STRING, allowNull: true },
    appointment_price: { type: DataTypes.INTEGER, defaultValue: 0 },
    footer_logo: { type: DataTypes.STRING, allowNull: true },
    tax_amount: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_in_mony: { type: DataTypes.INTEGER, defaultValue: 0 },
    mony_in_points: { type: DataTypes.INTEGER, defaultValue: 0 },
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
    whatsApp: { type: DataTypes.STRING, allowNull: true, field: 'whatsapp' },
    google_plus: { type: DataTypes.STRING, allowNull: true },
    min_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    from_hour: { type: DataTypes.STRING, allowNull: true },
    to_hour: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.STRING, allowNull: true },
    longitude: { type: DataTypes.STRING, allowNull: true },
    youtube: { type: DataTypes.STRING, allowNull: true },
    image: { type: DataTypes.STRING, allowNull: true },
    banner_image: { type: DataTypes.STRING, allowNull: true },
    banner_link: { type: DataTypes.STRING, allowNull: true },
    paginateTotal: { type: DataTypes.INTEGER, defaultValue: 10, field: 'paginate_total' },
    admin_commission_parcent: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_maintenance_mode: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_alowed_register: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_alowed_login: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_alowed_buying: { type: DataTypes.INTEGER, defaultValue: 1 },
    is_alowed_cart: { type: DataTypes.INTEGER, defaultValue: 1 },
    account_need_to_activate: { type: DataTypes.INTEGER, defaultValue: 0 },
    title: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'setting', tableName: 'settings' }
);

/** A bundle of products sold together at a package price (admin "Packages" module). */
export class Package extends Model {}
Package.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    name_ar: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    description_ar: { type: DataTypes.TEXT, allowNull: true },
    image: { type: DataTypes.STRING, allowNull: true },
    price_before: { type: DataTypes.FLOAT, allowNull: true }, // shown struck through
    price_after: { type: DataTypes.FLOAT, defaultValue: 0 },  // what the customer pays
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    features: { type: DataTypes.TEXT, allowNull: true },    // one feature per line
    features_ar: { type: DataTypes.TEXT, allowNull: true },
    badge: { type: DataTypes.STRING, allowNull: true },     // e.g. "Best seller"
    badge_ar: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: 'package', tableName: 'packages' }
);

export class PackageProduct extends Model {}
PackageProduct.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    package_id: { type: DataTypes.INTEGER },
    product_id: { type: DataTypes.INTEGER },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  },
  { sequelize, modelName: 'package_product', tableName: 'package_products' }
);

/* ------------------------------------------------------------------ */
/* Associations                                                        */
/* ------------------------------------------------------------------ */
Country.hasMany(CountryTranslation, { as: 'translations', foreignKey: 'country_id' });
CountryTranslation.belongsTo(Country, { foreignKey: 'country_id' });

Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

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
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id' });

Package.hasMany(PackageProduct, { as: 'items', foreignKey: 'package_id' });
PackageProduct.belongsTo(Package, { foreignKey: 'package_id' });
PackageProduct.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });
Cart.belongsTo(Package, { as: 'package', foreignKey: 'package_id' });
OrderProduct.belongsTo(Package, { as: 'package', foreignKey: 'package_id' });
