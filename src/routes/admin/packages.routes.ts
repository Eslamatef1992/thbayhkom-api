import { Router } from 'express';
import { Op } from 'sequelize';
import { Extra, Package, PackageExtra, PackageProduct, Product, PackageType, PackageTypeLink } from '../../db/models';
import { sequelize } from '../../db/sequelize';
import { adminOk, adminFail } from '../../utils/response';
import { asyncHandler } from '../../utils/http';
import { adminAuth, requirePermission } from '../../middleware/adminAuth';

/**
 * Admin CRUD for packages. Body:
 *   { name, name_ar, description, description_ar, image, price_before, price_after,
 *     status, sort_order, features, features_ar (one per line), badge, badge_ar,
 *     products: [{ product_id, quantity }], extra_ids: [1, 3] (add-ons customers can tick),
 *     has_types: true, type_ids: [2, 5] (customer must pick one) }
 */
const router = Router();
const VIEW = 'packages.view';
const MANAGE = 'packages.manage';

const include = [
  { model: PackageProduct, as: 'items', include: [{ model: Product, as: 'product' }] },
  { model: Extra, as: 'extras', through: { attributes: [] } }, { model: PackageType, as: 'types', through: { attributes: [] } },
];

function fields(b: any) {
  const text = (v: any) => (v == null || String(v).trim() === '' ? null : String(v).trim());
  const num = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));
  return {
    name: b.name, name_ar: b.name_ar ?? null,
    description: b.description ?? null, description_ar: b.description_ar ?? null,
    image: b.image ?? null,
    price_before: num(b.price_before), price_after: num(b.price_after) ?? 0,
    status: b.status === 'inactive' ? 'inactive' : 'active',
    sort_order: num(b.sort_order) ?? 0,
    features: text(b.features), features_ar: text(b.features_ar),
    badge: text(b.badge), badge_ar: text(b.badge_ar),
    has_types: b.has_types === true || b.has_types === 'true' || b.has_types === 1 || b.has_types === '1',
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
  const hasTypes = b.has_types === true || b.has_types === 'true' || b.has_types === 1 || b.has_types === '1';
  if (hasTypes && (!Array.isArray(b.type_ids) || b.type_ids.length === 0)) return 'Choose at least one type, or turn off "Has types"';
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

/** Replace the package's add-ons. `undefined` leaves them unchanged. */
async function setExtras(pkgId: number, extraIds: unknown, t: any) {
  if (extraIds === undefined) return;
  const ids = [...new Set((Array.isArray(extraIds) ? extraIds : []).map((x) => Number(x)).filter((n) => n > 0))];
  const valid = ids.length ? (await Extra.findAll({ where: { id: { [Op.in]: ids } }, transaction: t })).map((e: any) => e.id) : [];
  await PackageExtra.destroy({ where: { package_id: pkgId }, transaction: t });
  for (const id of valid) await PackageExtra.create({ package_id: pkgId, extra_id: id }, { transaction: t });
}

/** Replace the package's types. `undefined` leaves them unchanged. */
async function setTypes(pkgId: number, typeIds: unknown, t: any) {
  if (typeIds === undefined) return;
  const ids = [...new Set((Array.isArray(typeIds) ? typeIds : []).map((x) => Number(x)).filter((n) => n > 0))];
  const valid = ids.length ? (await PackageType.findAll({ where: { id: { [Op.in]: ids } }, transaction: t })).map((r: any) => r.id) : [];
  await PackageTypeLink.destroy({ where: { package_id: pkgId }, transaction: t });
  for (const id of valid) await PackageTypeLink.create({ package_id: pkgId, type_id: id }, { transaction: t });
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
    await setExtras(pkg.id, req.body.extra_ids, t);
    await setTypes(pkg.id, req.body.type_ids, t);
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
    await setExtras(pkg.id, req.body.extra_ids, t);
    await setTypes(pkg.id, req.body.type_ids, t);
  });
  adminOk(res, await Package.findByPk(pkg.id, { include }));
}));

router.delete('/:id', adminAuth, requirePermission(MANAGE), asyncHandler(async (req, res) => {
  const pkg: any = await Package.findByPk(req.params.id);
  if (!pkg) return adminFail(res, 404, 'Package not found');
  await sequelize.transaction(async (t) => {
    await PackageProduct.destroy({ where: { package_id: pkg.id }, transaction: t });
    await PackageExtra.destroy({ where: { package_id: pkg.id }, transaction: t });
    await PackageTypeLink.destroy({ where: { package_id: pkg.id }, transaction: t });
    await pkg.destroy({ transaction: t });
  });
  adminOk(res, { deleted: true });
}));

export default router;
