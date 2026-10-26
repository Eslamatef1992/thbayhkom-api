import { Router } from 'express';
import { Notification } from '../db/models';
import { ok } from '../utils/response';
import { asyncHandler, getPage, paginate } from '../utils/http';
import { authRequired, AuthedRequest } from '../middleware/auth';
import { pageSize } from './app.routes';
import { presentNotification } from '../presenters/app';

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

// The old unauthenticated /payment/callback (which marked orders paid from query
// parameters) was removed: payments are settled only by routes/payment.routes.ts,
// which verifies each one with UPayments.

export default router;
