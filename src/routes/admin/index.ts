import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import { crudRouter } from './crud';
import {
  Category, Product, Banner, Advertisement, Country, City, CutType, ServiceType,
  PromotionCode, Page, User, Notification, ContactMessage,
} from '../../db/models';

const router = Router();

// Auth + dashboard + custom endpoints
router.use('/auth', authRoutes);
router.use('/', dashboardRoutes);

// Generic CRUD resources for the dashboard. Each is permission-guarded.
// (Names live in *_translations, so text search is limited to non-translated columns.)
router.use('/categories', crudRouter(Category, 'categories'));
router.use('/products', crudRouter(Product, 'products'));
router.use('/banners', crudRouter(Banner, 'banners'));
router.use('/advertisements', crudRouter(Advertisement, 'advertisements'));
router.use('/countries', crudRouter(Country, 'countries', { searchFields: ['currency_code', 'country_code'] }));
router.use('/cities', crudRouter(City, 'cities'));
router.use('/cut-types', crudRouter(CutType, 'cut_types'));
router.use('/service-types', crudRouter(ServiceType, 'service_types'));
router.use('/promotion-codes', crudRouter(PromotionCode, 'promotions', { searchFields: ['code'] }));
router.use('/pages', crudRouter(Page, 'pages', { searchFields: ['slug'] }));
router.use('/customers', crudRouter(User, 'customers', { searchFields: ['name', 'email', 'mobile'] }));
router.use('/notifications', crudRouter(Notification, 'notifications', { searchFields: ['messag_type'] }));

export default router;

