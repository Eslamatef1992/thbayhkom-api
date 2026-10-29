import { Router } from 'express';
import { Op } from 'sequelize';
import { PackageType, PackageTypeLink } from '../../db/models';
import { sequelize } from '../../db/sequelize';
import { adminOk, adminFail } from '../../utils/response';
import { asyncHandler } from '../../utils/http';
import { adminAuth, requirePermission } from '../../middleware/adminAuth';

/**
 * Admin CRUD for package types (e.g. Naimi / Harri). Body:
 *   { name, name_ar, status, sort_order }
 * ?all=1 returns every type unpaginated (for the package form's picker).
 */
const router = Router();
const VIEW = 'types.view';
const MANAGE = 'types.manage';

function fields(b: any) {
  const text = (v: any) => (v == null || String(v).trim() === '' ? null : String(v).trim());
  return {
    name: text(b.name), name_ar: text(b.name_ar),
    status: b.status === 'inactive' ? 'inactive' : 'active',
    sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0,
  };
}

function validate(b: any): string | null {
  if (!b?.name || !String(b.name).trim()) return 'English name is required';
  if (!b?.name_ar || !String(b.name_ar).trim()) return 'Arabic name is required';
  return null;
}

router.get('/', adminAuth, requirePermission(VIEW), asyncHandler(async (req, res) => {
  const order: any = [['sort_order', 'ASC'], ['id', 'DESC']];
  if (req.query.all) {
    const rows = await PackageType.findAll({ order });
    return adminOk(res, rows, { page: 1, pageSize: rows.length, total: rows.length, totalPages: 1 });
  }
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
  const where: any = {};
  const q = String(req.query.q || '').trim();
  if (q) {
    const like = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
    where[Op.or] = [{ name: { [like]: `%${q}%` } }, { name_ar: { [like]: `%${q}%` } }];
  }
  const { count, rows } = await PackageType.findAndCountAll({ where, order, limit: pageSize, offset: (page - 1) * pageSize });
  adminOk(res, rows, { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) });
}));

router.get('/:id', adminAuth, requirePermission(VIEW), asyncHandler(async (req, res) => {
  const row = await PackageType.findByPk(req.params.id);
  if (!row) return adminFail(res, 404, 'Type not found');
  adminOk(res, row);
}));

router.post('/', adminAuth, requirePermission(MANAGE), asyncHandler(async (req, res) => {
  const err = validate(req.body);
  if (err) return adminFail(res, 400, err);
  adminOk(res, await PackageType.create(fields(req.body)));
}));

router.put('/:id', adminAuth, requirePermission(MANAGE), asyncHandler(async (req, res) => {
  const row: any = await PackageType.findByPk(req.params.id);
  if (!row) return adminFail(res, 404, 'Type not found');
  const err = validate(req.body);
  if (err) return adminFail(res, 400, err);
  await row.update(fields(req.body));
  adminOk(res, row);
}));

router.delete('/:id', adminAuth, requirePermission(MANAGE), asyncHandler(async (req, res) => {
  const row: any = await PackageType.findByPk(req.params.id);
  if (!row) return adminFail(res, 404, 'Type not found');
  // Past orders keep their own snapshot, so deleting is safe.
  await sequelize.transaction(async (t) => {
    await PackageTypeLink.destroy({ where: { type_id: row.id }, transaction: t });
    await row.destroy({ transaction: t });
  });
  adminOk(res, { deleted: true });
}));

export default router;
