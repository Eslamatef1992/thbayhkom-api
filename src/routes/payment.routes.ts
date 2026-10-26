import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Order } from '../db/models';
import { asyncHandler } from '../utils/http';
import { config } from '../config';
import { verifyUPayment } from '../services/payment';
import { sendOrderConfirmation, sendInBackground } from '../services/email.service';

/**
 * UPayments callbacks. Nothing here trusts the incoming parameters: the payment
 * result is always re-checked with UPayments (get-payment-status) before an order
 * is marked paid.
 *
 *   GET  /api/payment/return   returnUrl  — browser lands here after paying; we verify,
 *                                           then redirect to the success/fail page the app watches for.
 *   GET  /api/payment/cancel   cancelUrl
 *   POST /api/payment/webhook  notificationUrl — server-to-server, works even if the app was closed.
 */
const router = Router();

// payment_status: 0 = unpaid/pending, 1 = paid, 2 = failed/cancelled
const PAID = 1;
const FAILED = 2;

function pick(src: any, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = src?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return undefined;
}

/** Verify with UPayments and update the order. Returns the final payment_status. */
async function settle(params: any): Promise<{ orderId?: number; status: number }> {
  const oid = Number(pick(params, 'oid', 'order_id', 'requested_order_id')) || undefined;
  const trackId = pick(params, 'track_id', 'trackId');
  const order: any = oid ? await Order.findByPk(oid) : null;
  if (!order) return { orderId: oid, status: 0 };
  if (order.payment_status === PAID) return { orderId: order.id, status: PAID }; // idempotent

  if (!trackId) return { orderId: order.id, status: order.payment_status };
  const v = await verifyUPayment(trackId);
  // Guard against a valid track_id from a different order being replayed onto this one:
  // if UPayments echoes our reference back, it must be this order's.
  const ours = [String(order.id), `order-${order.id}`];
  const refs = v.merchantRefs.filter((r) => /^(order-)?\d+$/.test(r));
  if (refs.length && !refs.some((r) => ours.includes(r))) {
    console.warn(`[uPayments] track ${trackId} references ${refs.join(',')}, not order ${order.id}`);
    order.payment_check_response = JSON.stringify(v.raw ?? null).slice(0, 20000);
    await order.save();
    return { orderId: order.id, status: order.payment_status };
  }
  // A track_id can only pay for one order.
  const reused = await Order.findOne({ where: { payment_id: trackId, payment_status: PAID, id: { [Op.ne]: order.id } } });
  if (reused) {
    console.warn(`[uPayments] track ${trackId} already paid order ${(reused as any).id}`);
    return { orderId: order.id, status: order.payment_status };
  }
  if (v.paid && v.amount != null && Math.abs(v.amount - Number(order.total_price)) > 0.001) {
    console.warn(`[uPayments] amount mismatch for order ${order.id}: paid ${v.amount}, expected ${order.total_price}`);
    order.payment_check_response = JSON.stringify(v.raw ?? null).slice(0, 20000);
    await order.save();
    return { orderId: order.id, status: order.payment_status };
  }
  if (v.paid) {
    order.payment_status = PAID;
    order.transaction_id = v.transactionId || order.transaction_id;
    order.payment_id = trackId;
  } else if (v.final) {
    order.payment_status = FAILED;
  }
  order.payment_check_response = JSON.stringify(v.raw ?? null).slice(0, 20000);
  await order.save();
  // Paid just now (we returned early above if it was already paid): send the confirmation.
  if (order.payment_status === PAID) {
    sendInBackground(`order #${order.id} confirmation`, sendOrderConfirmation(order.id));
  }
  return { orderId: order.id, status: order.payment_status };
}

function pageUrl(kind: 'success' | 'fail', lang: string, orderId?: number): string {
  const base = (kind === 'success' ? config.payment.successUrl : config.payment.failUrl).replace('{lang}', lang === 'ar' ? 'ar' : 'en');
  return orderId ? `${base}?order_id=${orderId}` : base;
}

router.get('/payment/return', asyncHandler(async (req: Request, res: Response) => {
  const lang = String(req.query.lang || 'en');
  const r = await settle(req.query);
  res.redirect(302, pageUrl(r.status === PAID ? 'success' : 'fail', lang, r.orderId));
}));

router.get('/payment/cancel', asyncHandler(async (req: Request, res: Response) => {
  const lang = String(req.query.lang || 'en');
  const r = await settle(req.query); // still verify: a late capture must not be lost
  res.redirect(302, pageUrl(r.status === PAID ? 'success' : 'fail', lang, r.orderId));
}));

const webhook = asyncHandler(async (req: Request, res: Response) => {
  const r = await settle({ ...req.query, ...(req.body || {}) });
  res.status(200).json({ status: true, order_id: r.orderId ?? null, payment_status: r.status });
});
router.post('/payment/webhook', webhook);
router.get('/payment/webhook', webhook);

export default router;
