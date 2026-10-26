import { PromotionCode, Order } from '../db/models';

/**
 * Looks up an active promotion code and checks it is usable right now:
 * within start/end dates and under max_use (counted from orders that used it).
 */
export async function findValidPromo(code: string | undefined): Promise<any | null> {
  if (!code) return null;
  const promo: any = await PromotionCode.findOne({ where: { code, status: 'active' } });
  if (!promo) return null;
  const now = new Date();
  if (promo.start_date && new Date(promo.start_date) > now) return null;
  if (promo.end_date) {
    // end_date is inclusive: valid until the end of that day.
    const end = new Date(promo.end_date);
    end.setHours(23, 59, 59, 999);
    if (end < now) return null;
  }
  if (promo.max_use != null && promo.max_use > 0) {
    const used = await Order.count({ where: { discount_code: promo.code } });
    if (used >= promo.max_use) return null;
  }
  return promo;
}

/** type 2 = percentage of subtotal; anything else = fixed amount. Never exceeds the subtotal. */
export function promoDiscount(promo: any, subTotal: number): number {
  const raw = promo.type === 2 ? (subTotal * (promo.percent || 0)) / 100 : promo.percent || 0;
  return Math.max(0, Math.min(raw, subTotal));
}
