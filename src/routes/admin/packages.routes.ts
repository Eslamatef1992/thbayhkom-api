import { Router } from 'express';
import { Op } from 'sequelize';
import { Package, PackageProduct, Product } from '../../db/models';
import { sequelize } from '../../db/sequelize';
import { adminOk, adminFail } from '../../utils/response';
import { asyncHandler } from '../../utils/http';
import { adminAuth, requirePermission } from '../../middleware/adminAuth';

/**
 * Admin CRUD for packages. Body:
 *   { name, name_ar, description, description_ar, image, price_before, price_after,
 *     status, sort_order, products: [{ product_id, quantity }] }
 */
const router = Router();
const VIEW = 'packages.view';
const MANAGE = 'packages.manage';

const include = [{ model: PackageProduct, as: 'items', include: [{ model: Product, as: 'product' }] }];

function fields(b: any) {
  const num = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));
  return {
    name: b.name, name_ar: b.name_ar ?? null,
    description: b.description ?? null, description_ar: b.description_ar ?? null,
    image: b.image ?? null,
    price_before: num(b.price_before), price_after: num(b.price_after) ?? 0,
    status: b.status === 'inactive' ? 'inactive' : 'active',
    sort_order: num(b.sort_order) ?? 0,
  };
}

function validate(b: any): string | null {
  if (!b?.name || !String(b.name).trim()) return 'Name is required';
  const after = Number(b.price_after);
  if (!(after > 0)) return 'Package price (after) must be greater than 0';
  if (b.price_before !== undefined && b.price_before !== null && b.price_before !== '' && Number(b.price_before) < after) {
    return 'Price before must be greater than or equal to the package price';
  }
  if (!Array.isArray(b.products) || b.products.length === 0) return 'Add at least one product';
  return null;
}

async function setProducts(pkgId: number, products: any[], t: any) {
  await PackageProduct.destroy({ where: { package_id: pkgId }, transaction: t });
  const seen = new Set<number>();
  for (const p of products) {
    const id = Number(p.product_id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    await PackageProduct.create({ package_id: pkgId, product_id: id, quantity: Math.max(1, Number(p.quantity) || 1) }, { transaction: t });
  }
}

async function productsExist(products: any[]): Promise<boolean> {
  const ids = [...new Set(products.map((p) => Number(p.product_id)).filter(Boolean))];
  return ids.length > 0 && (await Product.count({ where: { id: { [Op.in]: ids } } })) === ids.length;
}

router.get('/', adminAuth, requirePermission(VIEW), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
  const { count, rows } = await Package.findAndCountAll({
    include, distinct: true, order: [['sort_order', 'ASC'], ['id', 'DESC']],
    limit: pageSize, offset: (page - 1) * pageSize,
  });
  adminOk(res, rows, { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) });
}));

router.get('/:id', adminAuth, requirePermission(VIEW), asyncHandler(async (req, res) => {
  const pkg = await Package.findByPk(req.params.id, { include });
  if (!pkg) return adminFail(res, 404, 'Package not found');
  adminOk(res, pkg);
}));

router.post('/', adminAuth, requirePermission(MANAGE), asyncHandler(async (req, res) => {
  const err = validate(req.body);
  if (err) return adminFail(res, 400, err);
  if (!(await productsExist(req.body.products))) return adminFail(res, 400, 'One or more products no longer exist');
  const id = await sequelize.transaction(async (t) => {
    const pkg: any = await Package.create(fields(req.body), { transaction: t });
    await setProducts(pkg.id, req.body.products, t);
    return pkg.id;
  });
  adminOk(res, await Package.findByPk(id, { include }));
}));

router.put('/:id', adminAuth, requirePermission(MANAGE), asyncHandler(async (req, res) => {
  const pkg: any = await Package.findByPk(req.params.id);
  if (!pkg) return adminFail(res, 404, 'Package not found');
  const err = validate(req.body);
  if (err) return adminFail(res, 400, err);
  if (!(await productsExist(req.body.products))) return adminFail(res, 400, 'One or more products no longer exist');
  await sequelize.transaction(async (t) => {
    await pkg.update(fields(req.body), { transaction: t });
    await setProducts(pkg.id, req.body.products, t);
  });
  adminOk(res, await Package.findByPk(pkg.id, { include }));
}));

router.delete('/:id', adminAuth, requirePermission(MANAGE), asyncHandler(async (req, res) => {
  const pkg: any = await Package.findByPk(req.params.id);
  if (!pkg) return adminFail(res, 404, 'Package not found');
  await sequelize.transaction(async (t) => {
    await PackageProduct.destroy({ where: { package_id: pkg.id }, transaction: t });
    await pkg.destroy({ transaction: t });
  });
  adminOk(res, { deleted: true });
}));

export default router;
