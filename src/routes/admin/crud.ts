import { Router } from 'express';
import { adminOk, adminFail } from '../../utils/response';
import { asyncHandler } from '../../utils/http';
import { adminAuth, requirePermission } from '../../middleware/adminAuth';

/**
 * Generic admin CRUD router factory. Produces list/get/create/update/delete
 * endpoints for a Sequelize model, guarded by a permission prefix.
 *   GET    /            list (paginated: ?page=&pageSize=&q=)
 *   GET    /:id         read
 *   POST   /            create
 *   PUT    /:id         update
 *   DELETE /:id         delete
 */
export function crudRouter(model: any, permissionPrefix: string, options: { searchFields?: string[] } = {}): Router {
  const router = Router();
  const { Op } = require('sequelize');

  router.get('/', adminAuth, requirePermission(`${permissionPrefix}.view`), asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    const where: any = {};
    const q = req.query.q as string;
    if (q && options.searchFields?.length) {
      where[Op.or] = options.searchFields.map((f) => ({ [f]: { [Op.like]: `%${q}%` } }));
    }
    const { count, rows } = await model.findAndCountAll({
      where, limit: pageSize, offset: (page - 1) * pageSize, order: [['id', 'DESC']],
    });
    adminOk(res, rows, { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) });
  }));

  router.get('/:id', adminAuth, requirePermission(`${permissionPrefix}.view`), asyncHandler(async (req, res) => {
    const row = await model.findByPk(req.params.id);
    if (!row) return adminFail(res, 404, 'Not found');
    adminOk(res, row);
  }));

  router.post('/', adminAuth, requirePermission(`${permissionPrefix}.manage`), asyncHandler(async (req, res) => {
    const row = await model.create(req.body);
    adminOk(res, row);
  }));

  router.put('/:id', adminAuth, requirePermission(`${permissionPrefix}.manage`), asyncHandler(async (req, res) => {
    const row = await model.findByPk(req.params.id);
    if (!row) return adminFail(res, 404, 'Not found');
    await row.update(req.body);
    adminOk(res, row);
  }));

  router.delete('/:id', adminAuth, requirePermission(`${permissionPrefix}.manage`), asyncHandler(async (req, res) => {
    const row = await model.findByPk(req.params.id);
    if (!row) return adminFail(res, 404, 'Not found');
    await row.destroy();
    adminOk(res, { deleted: true });
  }));

  return router;
}
