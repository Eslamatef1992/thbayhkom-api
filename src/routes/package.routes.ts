import { Router } from 'express';
import { Cart, Extra, Package, PackageProduct, Product, ProductImage, PackageType } from '../db/models';
import { availableExtras, availableTypes, chosenType, extraIdsKey, parseExtraIds } from '../services/extras';
import { ok, fail } from '../utils/response';
import { asyncHandler } from '../utils/http';
import { authOptional, AuthedRequest } from '../middleware/auth';
import { presentPackage } from '../presenters/catalog';

/** Mobile API for packages (bundles of products at a package price). */
const router = Router();

const packageInclude = [
  {
    model: PackageProduct, as: 'items',
    include: [{ model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] }],
  },
  { model: Extra, as: 'extras', through: { attributes: [] } }, { model: PackageType, as: 'types', through: { attributes: [] } },
];

router.get('/getPackages', authOptional, asyncHandler(async (_req, res) => {
  const rows = await Package.findAll({
    where: { status: 'active' }, include: packageInclude,
    order: [['sort_order', 'ASC'], ['id', 'DESC']],
  });
  ok(res, { items: rows.map(presentPackage) });
}));

router.get('/getPackageDetails/:id', authOptional, asyncHandler(async (req, res) => {
  const pkg = await Package.findOne({ where: { id: req.params.id, status: 'active' }, include: packageInclude });
  if (!pkg) return fail(res, 404, 'Package not found');
  ok(res, { item: presentPackage(pkg) });
}));

/**
 * Same cart owner rules as addProductToCart (user, or guest fcmToken).
 * ?quantity=2&type_id=4&extras=1,3
 *  - type_id: required when the package offers types; must be one of them.
 *  - extras: the add-on ids the customer ticked; each must be attached to this package.
 * The same package with a different type or add-ons is a separate cart line.
 */
router.get('/addPackageToCart/:id', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const pkg: any = await Package.findOne({
    where: { id: req.params.id, status: 'active' },
    include: [{ model: Extra, as: 'extras', through: { attributes: [] } }, { model: PackageType, as: 'types', through: { attributes: [] } }],
  });
  if (!pkg) return fail(res, 404, 'Package not found');
  const ids = parseExtraIds(req.query.extras ?? req.query.extra_ids);
  const allowed = new Set(availableExtras(pkg).map((e: any) => Number(e.id)));
  if (ids.some((id) => !allowed.has(id))) return fail(res, 422, 'One of the selected add-ons is no longer available');
  const key = extraIdsKey(ids);
  let typeId: number | null = null;
  if (availableTypes(pkg).length) {
    const t = chosenType(pkg, req.query.type_id ?? req.query.package_type_id);
    if (!t) return fail(res, 422, 'Please choose a type');
    typeId = Number(t.id);
  }

  const scope = req.authUser?.id
    ? { user_id: req.authUser.id }
    : { fcm_token: (req.query.fcmToken as string) || req.header('fcmToken') || 'anonymous' };
  const qty = Math.max(1, parseInt(String(req.query.quantity || '1'), 10) || 1);
  const existing: any = await Cart.findOne({
    where: { ...scope, package_id: pkg.id, extra_ids: key as any, package_type_id: typeId as any },
  });
  if (existing) {
    existing.quantity += qty;
    await existing.save();
    return ok(res, { cart_id: existing.id }, 'Added to cart');
  }
  const cart: any = await Cart.create({
    ...scope, package_id: pkg.id, product_id: null, quantity: qty, extra_ids: key, package_type_id: typeId,
  });
  ok(res, { cart_id: cart.id }, 'Added to cart');
}));

export default router;
