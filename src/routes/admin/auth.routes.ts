import { Router } from 'express';
import { User, Role, Permission } from '../../db/models';
import { adminOk, adminFail } from '../../utils/response';
import { asyncHandler } from '../../utils/http';
import { signToken, comparePassword } from '../../services/auth';
import { adminAuth, AdminRequest } from '../../middleware/adminAuth';

const router = Router();

// Admin login (separate from mobile login; uses conventional REST shape).
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return adminFail(res, 400, 'Email and password are required');
  const user = await User.findOne({ where: { email } });
  if (!user || !(await comparePassword(password, (user as any).password_hash))) {
    return adminFail(res, 401, 'Invalid credentials');
  }
  if (!((user as any).is_admin || (user as any).role === 'admin' || (user as any).role === 'manager')) {
    return adminFail(res, 403, 'Not an admin account');
  }
  const token = signToken((user as any).id);
  adminOk(res, {
    token,
    user: {
      id: (user as any).id, name: (user as any).name, email: (user as any).email,
      role: (user as any).role, is_admin: (user as any).is_admin,
    },
  });
}));

// Current admin profile + resolved permissions.
router.get('/me', adminAuth, asyncHandler(async (req: AdminRequest, res) => {
  const roles: any[] = await (req.admin as any).getRoles({ include: [Permission] });
  adminOk(res, {
    id: req.admin.id, name: req.admin.name, email: req.admin.email,
    role: req.admin.role, is_admin: req.admin.is_admin,
    roles: roles.map((r) => r.name),
    permissions: req.adminPermissions,
  });
}));

// Roles & permissions listing (for building the dashboard UI).
router.get('/roles', adminAuth, asyncHandler(async (_req, res) => {
  const roles = await Role.findAll({ include: [Permission] });
  adminOk(res, roles.map((r: any) => ({
    id: r.id, name: r.name, description: r.description,
    permissions: (r.permissions || []).map((p: any) => p.name),
  })));
}));

router.get('/permissions', adminAuth, asyncHandler(async (_req, res) => {
  const perms = await Permission.findAll();
  adminOk(res, perms.map((p: any) => ({ id: p.id, name: p.name, description: p.description })));
}));

export default router;
