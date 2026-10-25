import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import { crudRouter } from './crud';
import {
  Category, Product, Banner, Advertisement, Country, City, CutType, ServiceType,
  PromotionCode, Page, User, Notification,
} from '../../db/models';

const router = Router();

// Auth + dashboard + custom endpoints
router.use('/auth', authRoutes);
router.use('/', dashboardRoutes);

// Generic CRUD resources for the dashboard. Each is permission-guarded.
router.use('/categories', crudRouter(Category, 'categories', { searchFields: ['name'] }));
router.use('/products', crudRouter(Product, 'products', { searchFields: ['name', 'description'] }));
router.use('/banners', crudRouter(Banner, 'banners'));
router.use('/advertisements', crudRouter(Advertisement, 'advertisements'));
router.use('/countries', crudRouter(Country, 'countries', { searchFields: ['name', 'currency_code'] }));
router.use('/cities', crudRouter(City, 'cities', { searchFields: ['name'] }));
router.use('/cut-types', crudRouter(CutType, 'cut_types', { searchFields: ['name'] }));
router.use('/service-types', crudRouter(ServiceType, 'service_types', { searchFields: ['name'] }));
router.use('/promotion-codes', crudRouter(PromotionCode, 'promotions', { searchFields: ['code'] }));
router.use('/pages', crudRouter(Page, 'pages', { searchFields: ['title', 'slug'] }));
router.use('/customers', crudRouter(User, 'customers', { searchFields: ['name', 'email', 'mobile'] }));
router.use('/notifications', crudRouter(Notification, 'notifications', { searchFields: ['title', 'message'] }));

export default router;
