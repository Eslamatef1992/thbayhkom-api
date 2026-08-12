import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Admin, Role, RoleTranslation, Permission, RolePermission } from '../db/models';
import { adminFail } from '../utils/response';

export interface AdminRequest extends Request {
  admin?: any;
  adminPermissions?: string[];
}

/** Resolve permission keys for an admin. Role id 1 (super admin) → all ('*'). */
export async function permissionsForAdmin(admin: any): Promise<string[]> {
  const perms = new Set<string>();
  if (!admin.role_id || admin.role_id === 1) {
    perms.add('*'); // super admin / no explicit role → full access
    return [...perms];
  }
  const links = await RolePermission.findAll({ where: { role_id: admin.role_id } });
  const ids = links.map((l: any) => l.permission_id);
  const found = await Permission.findAll({ where: { id: ids } });
  for (const p of found) perms.add((p as any).key);
  return [...perms];
}

/** JWT payload for admins carries { sub, kind: 'admin' } to separate them from app users. */
export async function adminAuth(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const h = req.header('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return adminFail(res, 401, 'Unauthenticated');
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    if (decoded.kind !== 'admin') return adminFail(res, 403, 'Not an admin token');
    const admin = await Admin.findByPk(decoded.sub);
    if (!admin || (admin as any).status !== 'active') return adminFail(res, 401, 'Unauthenticated');
    req.admin = admin;
    req.adminPermissions = await permissionsForAdmin(admin);
    next();
  } catch {
    return adminFail(res, 401, 'Invalid token');
  }
}

/** Factory: require a specific permission (admins with '*' always pass). */
export function requirePermission(permission: string) {
  return (req: AdminRequest, res: Response, next: NextFunction): void => {
    const perms = req.adminPermissions || [];
    if (perms.includes('*') || perms.includes(permission)) return next();
    return adminFail(res, 403, `Forbidden: missing permission '${permission}'`);
  };
}

