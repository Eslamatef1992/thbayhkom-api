import { Router } from 'express';
import { Cart, Package, PackageProduct, Product, ProductImage } from '../db/models';
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

/** Same cart owner rules as addProductToCart (user, or guest fcmToken). */
router.get('/addPackageToCart/:id', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const pkg: any = await Package.findOne({ where: { id: req.params.id, status: 'active' } });
  if (!pkg) return fail(res, 404, 'Package not found');
  const scope = req.authUser?.id
    ? { user_id: req.authUser.id }
    : { fcm_token: (req.query.fcmToken as string) || req.header('fcmToken') || 'anonymous' };
  const qty = Math.max(1, parseInt(String(req.query.quantity || '1'), 10) || 1);
  const existing: any = await Cart.findOne({ where: { ...scope, package_id: pkg.id } });
  if (existing) {
    existing.quantity += qty;
    await existing.save();
    return ok(res, { cart_id: existing.id }, 'Added to cart');
  }
  const cart: any = await Cart.create({ ...scope, package_id: pkg.id, product_id: null, quantity: qty });
  ok(res, { cart_id: cart.id }, 'Added to cart');
}));

export default router;
