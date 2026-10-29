import { sendOrderConfirmation, sendInBackground } from '../services/email.service';
import { Router } from 'express';
import {
  Cart, Product, Order, OrderProduct, Address, PromotionCode, City, Notification, Package, Extra, PackageType,
} from '../db/models';
import { availableTypes, chosenExtras, chosenType, extrasSnapshot, extrasTotal, parseExtraIds, typeSnapshot } from '../services/extras';
import { ok, fail } from '../utils/response';
import { asyncHandler, getPage, paginate } from '../utils/http';
import { authRequired, authOptional, AuthedRequest } from '../middleware/auth';
import { pageSize } from './app.routes';
import { presentOrder, presentOrderDetails } from '../presenters/app';
import { paymentAdapterFor } from '../services/payment';
import { findValidPromo, promoDiscount } from '../services/promo';

const router = Router();

function unitPrice(p: any): number {
  return p ? (p.discount_price ?? p.price ?? 0) : 0;
}

async function applyPromo(codeName: string | undefined, subTotal: number): Promise<{ discount: number; code?: string }> {
  if (!codeName) return { discount: 0 };
  const promo = await findValidPromo(codeName);
  if (!promo) return { discount: 0 };
  return { discount: promoDiscount(promo, subTotal), code: promo.code };
}

async function deliveryFor(cityId?: number): Promise<number> {
  if (!cityId) return 0;
  const city: any = await City.findByPk(cityId);
  return city?.deliveryCost ?? 0;
}

async function guestAddress(b: any) {
  const address = await Address.create({
    address_name: b.address_name, country_id: b.country_id || null, city_id: b.city_id || null,
    governorate_id: b.governorate_id || null, block: b.block, street: b.street, avenue: b.avenue,
    type: b.type, building_number: b.building_number, house_number: b.house_number,
    floor_number: b.floor_number, apartment_number: b.apartment_number,
    address_line_1: b.address_line_1, address_line_2: b.address_line_2, notes: b.notes,
    latitude: b.latitude, longitude: b.longitude,
  });
  return (address as any).id;
}

/** A product line, or a package line (`packageId` set; `product` then holds its prices). */
interface LineItem {
  product: any; packageId?: number; quantity: number; cut_type_id?: number; service_type_id?: number; special_request?: string;
  /** Package add-ons chosen (already included in `product` prices). */
  extras?: any[];
  /** Package type chosen (e.g. Naimi). */
  packageType?: any;
}

/** Pricing view of a package: customers pay price_after + chosen add-ons (price_before kept for reference). */
const packagePricing = (pkg: any, extras: any[] = []) => {
  const add = extrasTotal(extras);
  const after = Number(pkg.price_after ?? 0) + add;
  return { id: null, price: (pkg.price_before != null ? Number(pkg.price_before) + add : after), discount_price: after };
};

async function buildOrder(params: {
  req: AuthedRequest;
  items: LineItem[];
  addressId?: number;
  guestContact?: { name?: string; email?: string; mobile?: string };
  codeName?: string;
  paymentType: number;
  cityIdForDelivery?: number;
}) {
  const { req, items, addressId, guestContact, codeName, paymentType, cityIdForDelivery } = params;
  const subTotal = items.reduce((s, it) => s + unitPrice(it.product) * it.quantity, 0);
  const { discount, code } = await applyPromo(codeName, subTotal);
  const deliveryCost = await deliveryFor(cityIdForDelivery);
  const total = Math.max(0, subTotal - discount) + deliveryCost;

  const order = await Order.create({
    user_id: req.authUser?.id || null,
    sub_total: subTotal, discount, delivery_cost: deliveryCost, total_price: total,
    discount_code: code || null,
    count_items: items.reduce((s, it) => s + it.quantity, 0),
    fcm_token: req.ctx?.fcmToken || null,
    address_id: addressId || null,
    name: guestContact?.name || req.authUser?.name || null,
    email: guestContact?.email || req.authUser?.email || null,
    mobile: guestContact?.mobile || req.authUser?.mobile || null,
    payment_method: paymentType, payment_status: 0, status: 0, status_name: 'Pending',
    ordered_date: new Date(),
  });

  for (const it of items) {
    await OrderProduct.create({
      order_id: (order as any).id, product_id: it.packageId ? null : it.product.id, package_id: it.packageId ?? null,
      cut_type_id: it.cut_type_id || null, service_type_id: it.service_type_id || null,
      special_request: it.special_request || null, quantity: it.quantity,
      price: it.product.price, offer_price: it.product.discount_price ?? null, discount: 0,
      extras: it.extras?.length ? JSON.stringify(extrasSnapshot(it.extras)) : null,
      extras_total: extrasTotal(it.extras || []),
      package_type_id: it.packageType?.id ?? null,
      package_type: it.packageType ? JSON.stringify(typeSnapshot(it.packageType)) : null,
    });
  }

  const adapter = paymentAdapterFor(paymentType);
  const pay = await adapter.createPayment(order, paymentType, req.ctx?.lang || 'en');
  if (pay.error) {
    // The gateway refused the charge: keep the order for the record, marked failed.
    (order as any).payment_status = 2;
    (order as any).status_name = 'Payment failed';
    await order.save();
    return { order, url: null, error: pay.error };
  }
  if (pay.paymentId) (order as any).payment_id = pay.paymentId;
  await order.save();

  // Cash on delivery: confirm now. KNET/card: the notification and confirmation email are
  // sent once the payment is verified (routes/payment.routes.ts), never for an unpaid order.
  if (!pay.requiresRedirect) {
    await notifyOrderPlaced(order);
    sendInBackground(`order #${(order as any).id} confirmation`, sendOrderConfirmation((order as any).id));
  }

  return { order, url: pay.requiresRedirect ? pay.url ?? null : null, error: undefined as string | undefined };
}

/** In-app notification for a confirmed order (messag_type '1' = opens the order in the app). */
export async function notifyOrderPlaced(order: any) {
  if (!order.user_id) return;
  await Notification.create({
    user_id: order.user_id, order_id: order.id, messag_type: '1',
    title: 'Order placed', message: `Your order #${order.id} has been placed.`, status: 'unread',
  });
}

// --- Checkout (cart) ---
router.post('/checkOut', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const paymentType = parseInt(req.body.payment_type, 10) || 3;
  const scope = req.authUser?.id ? { user_id: req.authUser.id } : { fcm_token: req.ctx?.fcmToken || 'anonymous' };
  const cartItems = await Cart.findAll({
    where: scope,
    include: [
      { model: Product, as: 'product' },
      { model: Package, as: 'package', include: [{ model: Extra, as: 'extras', through: { attributes: [] } }, { model: PackageType, as: 'types', through: { attributes: [] } }] },
    ],
  });
  // Skip lines whose product/package was deleted since it was added.
  const validItems = cartItems.filter((c: any) => c.product || c.package);
  if (!validItems.length) return fail(res, 422, 'Your cart is empty');

  let addressId: number | undefined;
  let guestContact;
  let cityId: number | undefined;

  if (req.authUser?.id) {
    addressId = req.body.address_id ? parseInt(req.body.address_id, 10) : undefined;
    if (!addressId) return fail(res, 400, 'The Address Is Required');
    const address: any = await Address.findByPk(addressId);
    cityId = address?.city_id;
  } else {
    addressId = await guestAddress(req.body);
    cityId = req.body.city_id ? parseInt(req.body.city_id, 10) : undefined;
    guestContact = { name: req.body.full_name, email: req.body.email, mobile: req.body.mobile };
  }

  // A package that offers types needs one chosen (it may have been removed since it was added).
  const missingType = validItems.find((c: any) => c.package && availableTypes(c.package).length && !chosenType(c.package, c.package_type_id));
  if (missingType) {
    return fail(res, 422, `Please choose a type for "${(missingType as any).package.name}" (remove it from the cart and add it again)`);
  }

  const items: LineItem[] = validItems.map((c: any) => {
    // Prices come from the database: removed/disabled add-ons are dropped, never charged.
    const extras = c.package ? chosenExtras(c.package, parseExtraIds(c.extra_ids)) : [];
    return {
    product: c.package ? packagePricing(c.package, extras) : c.product,
    packageId: c.package ? c.package.id : undefined,
    extras,
    packageType: c.package ? chosenType(c.package, c.package_type_id) : null,
    quantity: c.quantity, cut_type_id: c.cut_type_id,
    service_type_id: c.service_type_id, special_request: c.special_request,
    };
  });

  const { order, url, error } = await buildOrder({
    req, items, addressId, guestContact, codeName: req.body.code_name, paymentType, cityIdForDelivery: cityId,
  });
  if (error) return fail(res, 502, error); // cart kept so the customer can retry

  // Online payments keep the cart until the payment is verified (payment.routes.ts clears it),
  // so a failed or cancelled payment doesn't empty it.
  if (!url) await Cart.destroy({ where: scope });
  ok(res, { order: presentOrder(order), url }, 'Order created');
}));

// --- Buy now (single product) ---
router.post('/checkOutByProductId', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const paymentType = parseInt(req.body.payment_type, 10) || 3;
  const product = await Product.findByPk(req.body.product_id);
  if (!product) return fail(res, 404, 'Product not found');
  const quantity = parseInt(req.body.quantity, 10) || 1;

  let addressId: number | undefined;
  let guestContact;
  let cityId: number | undefined;

  if (req.authUser?.id) {
    addressId = req.body.address_id ? parseInt(req.body.address_id, 10) : undefined;
    if (!addressId) return fail(res, 400, 'The Address Is Required');
    const address: any = await Address.findByPk(addressId);
    cityId = address?.city_id;
  } else {
    addressId = await guestAddress(req.body);
    cityId = req.body.city_id ? parseInt(req.body.city_id, 10) : undefined;
    guestContact = { name: req.body.full_name, email: req.body.email, mobile: req.body.mobile };
  }

  const { order, url, error } = await buildOrder({
    req,
    items: [{
      product, quantity,
      cut_type_id: req.body.cut_type_id ? parseInt(req.body.cut_type_id, 10) : undefined,
      service_type_id: req.body.service_type_id ? parseInt(req.body.service_type_id, 10) : undefined,
      special_request: req.body.special_request,
    }],
    addressId, guestContact, codeName: req.body.code_name, paymentType, cityIdForDelivery: cityId,
  });
  if (error) return fail(res, 502, error);

  ok(res, { order: presentOrder(order), url }, 'Order created');
}));

// --- Orders (auth) ---
router.get('/getMyOrders', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const page = getPage(req);
  const size = await pageSize();
  const { limit, offset } = paginate(page, size);
  const { count, rows } = await Order.findAndCountAll({
    where: { user_id: req.authUser.id }, order: [['id', 'DESC']], limit, offset,
  });
  ok(res, { items: rows.map(presentOrder), is_more: offset + rows.length < count });
}));

router.get('/getOrderById/:id', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const order = await Order.findOne({
    where: { id: req.params.id, user_id: req.authUser.id },
    include: [
      { model: OrderProduct, as: 'products', include: [{ model: Product, as: 'product' }, { model: Package, as: 'package' }] },
      { model: Address, as: 'address' },
    ],
  });
  if (!order) return fail(res, 404, 'Order not found');
  ok(res, { item: presentOrderDetails(order) });
}));

export default router;
export { buildOrder, guestAddress };
