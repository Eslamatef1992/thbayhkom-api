import { Router } from 'express';
import { Op } from 'sequelize';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import extraRoutes from './extra.routes';
import { crudRouter } from './crud';
import {
  Category, Product, Banner, Advertisement, Country, City, CutType, ServiceType,
  PromotionCode, Page, User, Notification,
} from '../../db/models';

const router = Router();

// Auth + dashboard + custom endpoints
router.use('/auth', authRoutes);
router.use('/', dashboardRoutes);
router.use('/', extraRoutes); // roles alias, admin users, product detail, order status alias

// Generic CRUD resources for the dashboard. Each is permission-guarded.
router.use('/categories', crudRouter(Category, 'categories', { searchFields: ['name'] }));
router.use('/products', crudRouter(Product, 'products', { searchFields: ['name', 'description'] }));
router.use('/banners', crudRouter(Banner, 'banners'));
router.use('/advertisements', crudRouter(Advertisement, 'advertisements'));
router.use('/countries', crudRouter(Country, 'countries', { searchFields: ['name', 'currency_code'] }));
router.use('/cities', crudRouter(City, 'cities', {
  searchFields: ['name', 'name_ar'],
  // ?level=governorate → top-level rows (parent_id NULL); ?level=area → children.
  // ?parent_id=<id> narrows areas to one governorate.
  where: (req) => {
    const w: any = {};
    if (req.query.level === 'governorate') w.parent_id = null;
    if (req.query.level === 'area') w.parent_id = { [Op.ne]: null };
    if (req.query.parent_id) w.parent_id = parseInt(String(req.query.parent_id), 10);
    return w;
  },
}));
router.use('/cut-types', crudRouter(CutType, 'cut_types', { searchFields: ['name'] }));
router.use('/service-types', crudRouter(ServiceType, 'service_types', { searchFields: ['name'] }));
router.use('/promotion-codes', crudRouter(PromotionCode, 'promotions', { searchFields: ['code'] }));
router.use('/pages', crudRouter(Page, 'pages', { searchFields: ['title', 'slug'] }));
router.use('/customers', crudRouter(User, 'customers', {
  searchFields: ['name', 'email', 'mobile'],
  // Admin accounts are managed via /admin/admins; customers never expose credentials.
  exclude: ['password_hash', 'remember_token', 'role', 'is_admin'],
  // Anyone who is not an admin/manager (role may be NULL on imported rows).
  where: () => ({
    [Op.and]: [
      { [Op.or]: [{ role: null }, { role: { [Op.notIn]: ['admin', 'manager'] } }] },
      { [Op.or]: [{ is_admin: null }, { is_admin: false }] },
    ],
  }),
}));
router.use('/notifications', crudRouter(Notification, 'notifications', { searchFields: ['title', 'message'] }));

export default router;
