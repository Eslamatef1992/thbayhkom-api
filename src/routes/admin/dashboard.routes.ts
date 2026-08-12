import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Order, OrderProduct, Product, User, Address, ProductImage, ProductCutType, ProductServiceType,
  CutType, ServiceType, Setting, ContactMessage,
} from '../../db/models';
import { adminOk, adminFail } from '../../utils/response';
import { asyncHandler } from '../../utils/http';
import { adminAuth, requirePermission } from '../../middleware/adminAuth';

const router = Router();

// Dashboard KPI summary.
router.get('/dashboard/stats', adminAuth, requirePermission('dashboard.view'), asyncHandler(async (_req, res) => {
  const [orders, users, products, revenueRows, pendingOrders] = await Promise.all([
    Order.count(),
    User.count({ where: { role: 'customer' } }),
    Product.count(),
    Order.findAll({ where: { payment_status: 1 }, attributes: ['total_price'] }),
    Order.count({ where: { status: 0 } }),
  ]);
  const revenue = revenueRows.reduce((s: number, o: any) => s + (o.total_price || 0), 0);
  const recentOrders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
  adminOk(res, {
    totals: { orders, customers: users, products, revenue, pendingOrders },
    recentOrders,
  });
}));

// Orders management with filters.
router.get('/orders', adminAuth, requirePermission('orders.view'), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
  const where: any = {};
  if (req.query.status !== undefined && req.query.status !== '') where.status = parseInt(String(req.query.status), 10);
  if (req.query.payment_status !== undefined && req.query.payment_status !== '') where.payment_status = parseInt(String(req.query.payment_status), 10);
  if (req.query.q) where[Op.or] = [{ name: { [Op.like]: `%${req.query.q}%` } }, { email: { [Op.like]: `%${req.query.q}%` } }, { mobile: { [Op.like]: `%${req.query.q}%` } }];
  const { count, rows } = await Order.findAndCountAll({ where, order: [['id', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize });
  adminOk(res, rows, { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) });
}));

router.get('/orders/:id', adminAuth, requirePermission('orders.view'), asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: OrderProduct, as: 'products', include: [{ model: Product, as: 'product' }] },
      { model: Address, as: 'address' },
    ],
  });
  if (!order) return adminFail(res, 404, 'Order not found');
  adminOk(res, order);
}));

router.put('/orders/:id/status', adminAuth, requirePermission('orders.manage'), asyncHandler(async (req, res) => {
  const order: any = await Order.findByPk(req.params.id);
  if (!order) return adminFail(res, 404, 'Order not found');
  if (req.body.status !== undefined) order.status = parseInt(req.body.status, 10);
  if (req.body.status_name !== undefined) order.status_name = req.body.status_name;
  if (req.body.payment_status !== undefined) order.payment_status = parseInt(req.body.payment_status, 10);
  await order.save();
  adminOk(res, order);
}));


// Create a product with images and cut/service-type links in one call.
router.post('/products', adminAuth, requirePermission('products.manage'), asyncHandler(async (req, res) => {
  const { images, cut_type_ids, service_type_ids, ...fields } = req.body;
  const product: any = await Product.create(fields);
  if (Array.isArray(images)) for (const img of images) await ProductImage.create({ product_id: product.id, image: img });
  if (Array.isArray(cut_type_ids)) for (const id of cut_type_ids) await ProductCutType.create({ product_id: product.id, cut_type_id: id });
  if (Array.isArray(service_type_ids)) for (const id of service_type_ids) await ProductServiceType.create({ product_id: product.id, service_type_id: id });
  adminOk(res, product);
}));

router.put('/products/:id', adminAuth, requirePermission('products.manage'), asyncHandler(async (req, res) => {
  const { images, cut_type_ids, service_type_ids, ...fields } = req.body;
  const product: any = await Product.findByPk(req.params.id);
  if (!product) return adminFail(res, 404, 'Product not found');
  await product.update(fields);
  if (Array.isArray(images)) {
    await ProductImage.destroy({ where: { product_id: product.id } });
    for (const img of images) await ProductImage.create({ product_id: product.id, image: img });
  }
  if (Array.isArray(cut_type_ids)) {
    await ProductCutType.destroy({ where: { product_id: product.id } });
    for (const id of cut_type_ids) await ProductCutType.create({ product_id: product.id, cut_type_id: id });
  }
  if (Array.isArray(service_type_ids)) {
    await ProductServiceType.destroy({ where: { product_id: product.id } });
    for (const id of service_type_ids) await ProductServiceType.create({ product_id: product.id, service_type_id: id });
  }
  const full = await Product.findByPk(product.id, {
    include: [
      { model: ProductImage, as: 'images' },
      { model: ProductCutType, as: 'cut_types', include: [{ model: CutType, as: 'cut_type' }] },
      { model: ProductServiceType, as: 'service_types', include: [{ model: ServiceType, as: 'service_type' }] },
    ],
  });
  adminOk(res, full);
}));

// Settings singleton (get + update).
router.get('/settings', adminAuth, requirePermission('settings.view'), asyncHandler(async (_req, res) => {
  const s = await Setting.findOne();
  adminOk(res, s);
}));

router.put('/settings', adminAuth, requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  let s: any = await Setting.findOne();
  if (!s) s = await Setting.create(req.body);
  else await s.update(req.body);
  adminOk(res, s);
}));

// Contact messages inbox.
router.get('/contact-messages', adminAuth, requirePermission('contact.view'), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = 20;
  const { count, rows } = await ContactMessage.findAndCountAll({ order: [['id', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize });
  adminOk(res, rows, { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) });
}));

export default router;
