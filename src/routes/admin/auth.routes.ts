import { Router } from 'express';
import { Admin, Role, RoleTranslation, Permission, RolePermission } from '../../db/models';
import { adminOk, adminFail } from '../../utils/response';
import { asyncHandler } from '../../utils/http';
import { signAdminToken, comparePassword } from '../../services/auth';
import { adminAuth, AdminRequest } from '../../middleware/adminAuth';

const router = Router();

// Admin login (against the admins table). Uses conventional REST shape.
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return adminFail(res, 400, 'Email and password are required');
  const admin: any = await Admin.findOne({ where: { email } });
  if (!admin || !(await comparePassword(password, admin.password))) {
    return adminFail(res, 401, 'Invalid credentials');
  }
  if (admin.status !== 'active') return adminFail(res, 403, 'Account is not active');
  const token = signAdminToken(admin.id);
  adminOk(res, {
    token,
    user: { id: admin.id, name: admin.name, email: admin.email, role_id: admin.role_id },
  });
}));

// Current admin profile + resolved permissions.
router.get('/me', adminAuth, asyncHandler(async (req: AdminRequest, res) => {
  adminOk(res, {
    id: req.admin.id,
    name: req.admin.name,
    email: req.admin.email,
    role_id: req.admin.role_id,
    permissions: req.adminPermissions,
  });
}));

// Roles + permissions listing (for building the dashboard UI).
router.get('/roles', adminAuth, asyncHandler(async (_req, res) => {
  const roles = await Role.findAll({ include: [{ model: RoleTranslation, as: 'translations' }] });
  const result: any[] = [];
  for (const r of roles as any[]) {
    const links = await RolePermission.findAll({ where: { role_id: r.id } });
    const permIds = links.map((l: any) => l.permission_id);
    const perms = await Permission.findAll({ where: { id: permIds } });
    result.push({
      id: r.id,
      name: (r.translations || []).find((t: any) => t.locale === 'en')?.name || null,
      translations: (r.translations || []).map((t: any) => ({ locale: t.locale, name: t.name })),
      permissions: perms.map((p: any) => p.key),
    });
  }
  adminOk(res, result);
}));

router.get('/permissions', adminAuth, asyncHandler(async (_req, res) => {
  const perms = await Permission.findAll();
  adminOk(res, perms.map((p: any) => ({ id: p.id, key: p.key })));
}));

export default router;

