import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, Role, Permission } from '../db/models';
import { adminFail } from '../utils/response';

export interface AdminRequest extends Request {
  admin?: any;
  adminPermissions?: string[];
}

async function permissionsFor(user: any): Promise<string[]> {
  // Super admin (role column) shortcut → all permissions.
  const roles: any[] = await (user as any).getRoles({ include: [Permission] });
  const perms = new Set<string>();
  for (const r of roles) {
    if (r.name === 'admin') perms.add('*');
    for (const p of (r as any).permissions || []) perms.add(p.name);
  }
  if ((user as any).role === 'admin' || (user as any).is_admin) perms.add('*');
  return [...perms];
}

/** Verifies a JWT and ensures the user is an admin/manager. */
export async function adminAuth(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const h = req.header('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return adminFail(res, 401, 'Unauthenticated');
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const user = await User.findByPk(decoded.sub);
    if (!user) return adminFail(res, 401, 'Unauthenticated');
    if (!((user as any).is_admin || (user as any).role === 'admin' || (user as any).role === 'manager')) {
      return adminFail(res, 403, 'Forbidden: admin access required');
    }
    req.admin = user;
    req.adminPermissions = await permissionsFor(user);
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
