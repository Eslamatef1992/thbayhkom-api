import { Router } from 'express';
import {
  Cart, Product, ProductTranslation, Order, OrderProduct, Address, PromotionCode, City, Notification, NotificationTranslation,
} from '../db/models';
import { ok, fail } from '../utils/response';
import { asyncHandler, getPage, paginate } from '../utils/http';
import { authRequired, authOptional, AuthedRequest } from '../middleware/auth';
import { pageSize } from './app.routes';
import { presentOrder, presentOrderDetails } from '../presenters/app';
import { paymentAdapterFor } from '../services/payment';

const router = Router();

function unitPrice(p: any): number {
  if (!p) return 0;
  const price = Number(p.price ?? 0);
  const discount = Number(p.discount_price ?? 0);
  return discount > 0 ? discount : price;
}

async function applyPromo(codeName: string | undefined, subTotal: number): Promise<{ discount: number; code?: string }> {
  if (!codeName) return { discount: 0 };
  const promo: any = await PromotionCode.findOne({ where: { code: codeName, status: 'active' } });
  if (!promo) return { discount: 0 };
  const discount = promo.type === 2 ? (subTotal * (promo.percent || 0)) / 100 : promo.percent || 0;
  return { discount, code: promo.code };
}

async function deliveryFor(cityId?: number): Promise<number> {
  if (!cityId) return 0;
  const city: any = await City.findByPk(cityId);
  return city ? Number(city.delivery_cost ?? 0) : 0;
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

interface LineItem { product: any; quantity: number; cut_type_id?: number; service_type_id?: number; special_request?: string; }

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
      order_id: (order as any).id, product_id: it.product.id,
      cut_type_id: it.cut_type_id || null, service_type_id: it.service_type_id || null,
      special_request: it.special_request || null, quantity: it.quantity,
      price: it.product.price, offer_price: it.product.discount_price ?? null, discount: 0,
    });
  }

  const adapter = paymentAdapterFor(paymentType);
  const pay = await adapter.createPayment(order, paymentType, req.ctx?.lang || 'en');
  if (pay.paymentId) (order as any).payment_id = pay.paymentId;
  await order.save();

  // Record a notification (title/message live in the translation table).
  const notif: any = await Notification.create({
    user_id: req.authUser?.id || null, order_id: (order as any).id, messag_type: 'order', status: 'unread',
  });
  await NotificationTranslation.bulkCreate([
    { notify_id: notif.id, locale: 'en', title: 'Order placed', message: `Your order #${(order as any).id} has been placed.` },
    { notify_id: notif.id, locale: 'ar', title: 'تم إنشاء الطلب', message: `تم إنشاء طلبك رقم #${(order as any).id}.` },
  ]);

  return { order, url: pay.requiresRedirect ? pay.url : null };
}

// --- Checkout (cart) ---
router.post('/checkOut', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const paymentType = parseInt(req.body.payment_type, 10) || 3;
  const scope = req.authUser?.id ? { user_id: req.authUser.id } : { fcm_token: req.ctx?.fcmToken || 'anonymous' };
  const cartItems = await Cart.findAll({ where: scope, include: [{ model: Product, as: 'product' }] });
  if (!cartItems.length) return fail(res, 422, 'Your cart is empty');

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

  const items: LineItem[] = cartItems.map((c: any) => ({
    product: c.product, quantity: c.quantity, cut_type_id: c.cut_type_id,
    service_type_id: c.service_type_id, special_request: c.special_request,
  }));

  const { order, url } = await buildOrder({
    req, items, addressId, guestContact, codeName: req.body.code_name, paymentType, cityIdForDelivery: cityId,
  });

  await Cart.destroy({ where: scope });
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

  const { order, url } = await buildOrder({
    req,
    items: [{
      product, quantity,
      cut_type_id: req.body.cut_type_id ? parseInt(req.body.cut_type_id, 10) : undefined,
      service_type_id: req.body.service_type_id ? parseInt(req.body.service_type_id, 10) : undefined,
      special_request: req.body.special_request,
    }],
    addressId, guestContact, codeName: req.body.code_name, paymentType, cityIdForDelivery: cityId,
  });

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
  const lang = req.ctx?.lang || 'en';
  const order = await Order.findOne({
    where: { id: req.params.id, user_id: req.authUser.id },
    include: [
      { model: OrderProduct, as: 'products', include: [{ model: Product, as: 'product', include: [{ model: ProductTranslation, as: 'translations' }] }] },
      { model: Address, as: 'address' },
    ],
  });
  if (!order) return fail(res, 404, 'Order not found');
  ok(res, { item: presentOrderDetails(order, lang) });
}));

export default router;
export { buildOrder, guestAddress };
