import { Router } from 'express';
import {
  Cart, Product, CutType, ServiceType, City, PromotionCode, Package, Extra,
} from '../db/models';
import { chosenExtras, extrasTotal, parseExtraIds } from '../services/extras';
import { ok, fail } from '../utils/response';
import { asyncHandler } from '../utils/http';
import { authOptional, AuthedRequest } from '../middleware/auth';
import { presentCartItem, presentPromotionCode } from '../presenters/app';
import { findValidPromo } from '../services/promo';

const router = Router();

/** Resolve the cart owner scope: logged-in user OR guest fcm_token. */
function cartScope(req: AuthedRequest) {
  if (req.authUser?.id) return { user_id: req.authUser.id };
  const fcm = (req.query.fcmToken as string) || (req.body?.fcmToken as string) || req.header('fcmToken');
  return { fcm_token: fcm || 'anonymous' };
}

const cartInclude = [
  { model: Product, as: 'product' },
  { model: CutType, as: 'cut_type' },
  { model: ServiceType, as: 'service_type' },
  { model: Package, as: 'package', include: [{ model: Extra, as: 'extras', through: { attributes: [] } }] },
];

function lineTotal(item: any): number {
  const p = item.product;
  const unit = p
    ? (p.discount_price ?? p.price ?? 0)
    : item.package
      ? Number(item.package.price_after ?? 0) + extrasTotal(chosenExtras(item.package, parseExtraIds(item.extra_ids)))
      : 0;
  return unit * (item.quantity || 1);
}

router.get('/addProductToCart/:productId', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const scope = cartScope(req);
  const product = await Product.findByPk(req.params.productId);
  if (!product) return fail(res, 404, 'Product not found');
  const cutId = req.query.cut_type_id ? parseInt(req.query.cut_type_id as string, 10) : null;
  const serviceId = req.query.service_type_id ? parseInt(req.query.service_type_id as string, 10) : null;
  const qty = req.query.quantity ? parseInt(req.query.quantity as string, 10) : 1;

  const existing = await Cart.findOne({
    where: { ...scope, product_id: (product as any).id, cut_type_id: cutId as any, service_type_id: serviceId as any },
  });
  let cart;
  if (existing) {
    (existing as any).quantity += qty;
    await existing.save();
    cart = existing;
  } else {
    cart = await Cart.create({
      ...scope, product_id: (product as any).id, cut_type_id: cutId, service_type_id: serviceId,
      quantity: qty, country_id: (product as any).country_id,
    });
  }
  ok(res, { cart_id: (cart as any).id }, 'Added to cart');
}));

router.get('/getMyCart', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const items = await Cart.findAll({ where: cartScope(req), include: cartInclude, order: [['id', 'DESC']] });
  const total = items.reduce((sum: number, it: any) => sum + lineTotal(it), 0);
  ok(res, { MyCart: items.map(presentCartItem), total });
}));

router.get('/changeQuantity/:cart_id', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const item = await Cart.findOne({ where: { id: req.params.cart_id, ...cartScope(req) } });
  if (!item) return fail(res, 404, 'Cart item not found');
  const type = parseInt(req.query.type as string, 10);
  if (type === 1) (item as any).quantity += 1;
  else if (type === 2) (item as any).quantity = Math.max(1, (item as any).quantity - 1);
  await item.save();
  ok(res, {}, 'Quantity updated');
}));

router.get('/deleteProductCart/:id', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  await Cart.destroy({ where: { id: req.params.id, ...cartScope(req) } });
  ok(res, {}, 'Removed from cart');
}));

router.get('/deleteCartItems', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  await Cart.destroy({ where: cartScope(req) });
  ok(res, {}, 'Cart cleared');
}));

router.get('/checkPromo', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const name = (req.query.name as string) || '';
  const promo = await findValidPromo(name);
  if (!promo) return fail(res, 404, 'Invalid code please type right code');
  ok(res, { PromotionCode: presentPromotionCode(promo) }, 'Applied Successfully.');
}));

router.get('/calculateDeliveryCost', asyncHandler(async (req, res) => {
  const city = await City.findByPk(req.query.city_id as string);
  ok(res, { deliveryCost: (city as any)?.deliveryCost ?? 0 });
}));

export default router;
