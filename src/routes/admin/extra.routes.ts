import { Router } from 'express';
import { Op } from 'sequelize';
import {
  User, Role, Permission, UserRole, Order, Product, ProductImage, ProductCutType, ProductServiceType,
} from '../../db/models';
import { adminOk, adminFail } from '../../utils/response';
import { asyncHandler } from '../../utils/http';
import { hashPassword } from '../../services/auth';
import { sendOrderStatusUpdate, sendInBackground } from '../../services/email.service';
import { adminAuth, requirePermission, AdminRequest } from '../../middleware/adminAuth';

/**
 * Endpoints the admin dashboard relies on that the generic CRUD routers don't cover.
 * Registered before the CRUD routers so these paths win.
 */
const router = Router();

const ADMIN_ROLES = ['admin', 'manager'];
// Only super admins ('*') hold this, so managers cannot create or edit admin accounts.
const MANAGE_ADMINS = 'admins.manage';

/* ----------------------------- Roles ----------------------------- */

// Same payload as /admin/auth/roles; the dashboard calls /admin/roles.
router.get('/roles', adminAuth, asyncHandler(async (_req, res) => {
  const roles = await Role.findAll({ include: [Permission], order: [['id', 'ASC']] });
  adminOk(res, roles.map((r: any) => ({
    id: r.id, name: r.name, description: r.description,
    permissions: (r.permissions || []).map((p: any) => p.name),
  })));
}));

/* -------------------------- Admin users -------------------------- */

const presentAdmin = (u: any) => ({
  id: u.id, name: u.name, email: u.email, mobile: u.mobile,
  role: u.role, is_admin: u.is_admin, status: u.status,
  created_at: u.created_at ?? u.createdAt, createdAt: u.createdAt ?? u.created_at,
});

const adminWhere = { [Op.or]: [{ is_admin: true }, { role: { [Op.in]: ADMIN_ROLES } }] };

async function syncRole(user: any, roleName: string) {
  const role: any = await Role.findOne({ where: { name: roleName } });
  await UserRole.destroy({ where: { user_id: user.id } });
  if (role) await UserRole.create({ user_id: user.id, role_id: role.id });
}

router.get('/admins', adminAuth, requirePermission(MANAGE_ADMINS), asyncHandler(async (_req, res) => {
  const rows = await User.findAll({ where: adminWhere, order: [['id', 'ASC']] });
  adminOk(res, rows.map(presentAdmin), { total: rows.length });
}));

router.post('/admins', adminAuth, requirePermission(MANAGE_ADMINS), asyncHandler(async (req, res) => {
  const { name, email, password, mobile } = req.body || {};
  const role = ADMIN_ROLES.includes(req.body?.role) ? req.body.role : 'manager';
  const status = req.body?.status === 'inactive' ? 'inactive' : 'active';
  if (!name || !email) return adminFail(res, 400, 'Name and email are required');
  if (!password || String(password).length < 8) return adminFail(res, 400, 'Password must be at least 8 characters');
  if (await User.findOne({ where: { email } })) return adminFail(res, 409, 'Email already in use');
  const user: any = await User.create({
    name, email, mobile: mobile || null, role, status,
    is_admin: role === 'admin', is_verified: 1,
    password_hash: await hashPassword(String(password)),
  });
  await syncRole(user, role);
  adminOk(res, presentAdmin(user));
}));

router.put('/admins/:id', adminAuth, requirePermission(MANAGE_ADMINS), asyncHandler(async (req: AdminRequest, res) => {
  const user: any = await User.findOne({ where: { id: req.params.id, ...adminWhere } });
  if (!user) return adminFail(res, 404, 'Admin not found');
  const { name, email, password, mobile } = req.body || {};
  if (email && email !== user.email && (await User.findOne({ where: { email } }))) {
    return adminFail(res, 409, 'Email already in use');
  }
  if (name !== undefined) user.name = name;
  if (email) user.email = email;
  if (mobile !== undefined) user.mobile = mobile;
  if (req.body?.status) user.status = req.body.status === 'inactive' ? 'inactive' : 'active';
  if (ADMIN_ROLES.includes(req.body?.role)) {
    if (String(user.id) === String(req.admin.id) && req.body.role !== user.role) {
      return adminFail(res, 400, 'You cannot change your own role');
    }
    user.role = req.body.role;
    user.is_admin = req.body.role === 'admin';
  }
  if (password) {
    if (String(password).length < 8) return adminFail(res, 400, 'Password must be at least 8 characters');
    user.password_hash = await hashPassword(String(password));
  }
  await user.save();
  await syncRole(user, user.role);
  adminOk(res, presentAdmin(user));
}));

router.delete('/admins/:id', adminAuth, requirePermission(MANAGE_ADMINS), asyncHandler(async (req: AdminRequest, res) => {
  if (String(req.params.id) === String(req.admin.id)) return adminFail(res, 400, 'You cannot remove yourself');
  const user: any = await User.findOne({ where: { id: req.params.id, ...adminWhere } });
  if (!user) return adminFail(res, 404, 'Admin not found');
  // Demote rather than delete: the account may own orders/addresses.
  user.role = 'customer';
  user.is_admin = false;
  await user.save();
  await UserRole.destroy({ where: { user_id: user.id } });
  adminOk(res, { removed: true });
}));

/* ----------------------- Product detail ----------------------- */

// Full product incl. image list and linked cut/service type ids (for the edit form).
router.get('/products/:id', adminAuth, requirePermission('products.view'), asyncHandler(async (req, res) => {
  const p: any = await Product.findByPk(req.params.id, {
    include: [
      { model: ProductImage, as: 'images' },
      { model: ProductCutType, as: 'cut_types' },
      { model: ProductServiceType, as: 'service_types' },
    ],
  });
  if (!p) return adminFail(res, 404, 'Product not found');
  const plain = p.get({ plain: true });
  adminOk(res, {
    ...plain,
    cut_type_ids: (plain.cut_types || []).map((c: any) => c.cut_type_id),
    service_type_ids: (plain.service_types || []).map((s: any) => s.service_type_id),
  });
}));

/* ------------------------ Order status ------------------------ */

// Alias of PUT /orders/:id/status (the dashboard sends { status }).
router.put('/orders/:id', adminAuth, requirePermission('orders.manage'), asyncHandler(async (req, res) => {
  const order: any = await Order.findByPk(req.params.id);
  if (!order) return adminFail(res, 404, 'Order not found');
  const before = order.status;
  if (req.body.status !== undefined) order.status = parseInt(req.body.status, 10);
  if (req.body.payment_status !== undefined) order.payment_status = parseInt(req.body.payment_status, 10);
  await order.save();
  if (order.status !== before) sendInBackground(`order #${order.id} status`, sendOrderStatusUpdate(order.id));
  adminOk(res, order);
}));

export default router;
