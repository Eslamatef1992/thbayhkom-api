import { Router } from 'express';
import appRoutes from './app.routes';
import catalogRoutes from './catalog.routes';
import accountRoutes from './account.routes';
import addressRoutes from './address.routes';
import cartRoutes from './cart.routes';
import checkoutRoutes from './checkout.routes';
import notificationRoutes from './notification.routes';
import paymentRoutes from './payment.routes';
import packageRoutes from './package.routes';

const router = Router();

// Mobile API surface (order doesn't matter; paths are unique).
router.use('/', appRoutes);
router.use('/', catalogRoutes);
router.use('/', accountRoutes);
router.use('/', addressRoutes);
router.use('/', cartRoutes);
router.use('/', checkoutRoutes);
router.use('/', notificationRoutes);
router.use('/', paymentRoutes);
router.use('/', packageRoutes);

export default router;
