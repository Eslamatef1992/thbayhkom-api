import { Router } from 'express';
import { Notification, Order } from '../db/models';
import { ok } from '../utils/response';
import { asyncHandler, getPage, paginate } from '../utils/http';
import { authRequired, AuthedRequest } from '../middleware/auth';
import { pageSize } from './app.routes';
import { presentNotification } from '../presenters/app';
import { config } from '../config';

const router = Router();

router.get('/myNotifications', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const page = getPage(req);
  const size = await pageSize();
  const { limit, offset } = paginate(page, size);
  const { count, rows } = await Notification.findAndCountAll({
    where: { user_id: req.authUser.id }, order: [['id', 'DESC']], limit, offset,
  });
  ok(res, { items: rows.map(presentNotification), is_more: offset + rows.length < count });
}));

/**
 * Payment gateway callback (webhook or return URL). Once a real gateway (docs Q1)
 * is wired, verify the payload here, then redirect the WebView to the app's
 * hardcoded success/fail URLs which it matches by substring.
 */
router.get('/payment/callback', asyncHandler(async (req, res) => {
  const lang = (req.query.lang as string) || 'en';
  const orderId = req.query.order_id as string;
  const success = String(req.query.status || '') === 'paid';
  if (orderId) {
    const order: any = await Order.findByPk(orderId);
    if (order) {
      order.payment_status = success ? 1 : 0;
      order.status_name = success ? 'Paid' : 'Payment failed';
      if (req.query.transaction_id) order.transaction_id = req.query.transaction_id;
      await order.save();
    }
  }
  const base = success ? config.payment.successUrl : config.payment.failUrl;
  const url = base.replace('{lang}', lang) + (success && req.query.transaction_id ? `?transaction_id=${req.query.transaction_id}` : '');
  res.redirect(url);
}));

export default router;
