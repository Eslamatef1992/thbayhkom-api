import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { Order, OrderProduct, Product, Package } from '../db/models';
import { parseSnapshot, parseTypeSnapshot } from './extras';

/**
 * Transactional email via Mailgun (bilingual EN/AR).
 *   - sendWelcomeEmail          on sign-up
 *   - sendOrderConfirmation     when an order is placed (cart checkout and buy-now)
 *   - sendOrderStatusUpdate     when the admin changes an order's status
 *
 * Config: MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM, MAILGUN_EU_REGION, MAILGUN_CC.
 * Without MAILGUN_API_KEY every send is skipped. Sends never throw into the request:
 * use `sendInBackground()` so a mail outage can't break checkout.
 */

const mailgun = new Mailgun(FormData);

// Created lazily: mailgun.js throws when the key is empty, which used to crash the
// whole API on startup. Without MAILGUN_API_KEY, emails are skipped (logged) instead.
type MgClient = ReturnType<typeof mailgun.client>;
let mgClient: MgClient | null | undefined;
function getMailgun(): MgClient | null {
  if (mgClient !== undefined) return mgClient;
  const key = process.env.MAILGUN_API_KEY || '';
  if (!key) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV !== 'test') console.warn('[email] MAILGUN_API_KEY not set - emails disabled');
    mgClient = null;
    return null;
  }
  mgClient = mailgun.client({
    username: 'api',
    key,
    url: process.env.MAILGUN_EU_REGION === 'true' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net',
  });
  return mgClient;
}

const DOMAIN = () => process.env.MAILGUN_DOMAIN || 'mg.thabayehkom.app';
const FROM = () => process.env.MAILGUN_FROM || 'Thabayehkom <support@mg.thabayehkom.app>';
// Copy of every order email for the shop (set MAILGUN_CC= empty to disable).
const CC = () => (process.env.MAILGUN_CC ?? 'info@thabayehkom.app').split(',').map((s) => s.trim()).filter(Boolean);
const BRAND = '#AC2023';

const PAYMENT: Record<number, [string, string]> = {
  1: ['KNET', 'كي نت'], 2: ['Credit Card', 'بطاقة ائتمان'], 3: ['Cash on Delivery', 'الدفع عند الاستلام'], 4: ['Sadad', 'سداد'],
};

const STATUS: Record<number, { en: string; ar: string; msgEn: string; msgAr: string }> = {
  0: { en: 'Pending', ar: 'قيد الانتظار', msgEn: 'We received your order.', msgAr: 'استلمنا طلبك.' },
  1: { en: 'Confirmed', ar: 'تم التأكيد', msgEn: 'Your order has been confirmed and will be prepared soon.', msgAr: 'تم تأكيد طلبك وسيتم تجهيزه قريباً.' },
  2: { en: 'Processing', ar: 'قيد التجهيز', msgEn: 'Your order is being prepared.', msgAr: 'جاري تجهيز طلبك.' },
  3: { en: 'Out for Delivery', ar: 'في الطريق إليك', msgEn: 'Your order is on its way!', msgAr: 'طلبك في الطريق إليك!' },
  4: { en: 'Delivered', ar: 'تم التوصيل', msgEn: 'Your order has been delivered. Enjoy your meal!', msgAr: 'تم توصيل طلبك. بالهناء والشفاء!' },
  5: { en: 'Cancelled', ar: 'ملغي', msgEn: 'Your order has been cancelled. Contact us if you have any questions.', msgAr: 'تم إلغاء طلبك. تواصل معنا لأي استفسار.' },
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const kwd = (v: unknown) => `${Number(v || 0).toFixed(3)} KWD`;
export const isEmail = (v?: string | null): v is string => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function skipLog(what: string, to?: string | null) {
  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== 'test') console.warn(`[email] skipped ${what}: invalid address "${to ?? ''}"`);
}

function layout(bodyHtml: string): string {
  return `
  <div style="font-family:Arial,Tahoma,sans-serif;max-width:600px;margin:auto;border-top:4px solid ${BRAND};background:#fff">
    <div style="background:${BRAND};padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">ذبايحكم | Thabayehkom</h1>
    </div>
    <div style="padding:28px">${bodyHtml}</div>
    <div style="padding:16px;text-align:center;color:#888;font-size:12px;border-top:1px solid #eee">
      © ${new Date().getFullYear()} Thabayehkom · Kuwait · <a href="https://thabayehkom.app" style="color:#888">thabayehkom.app</a>
    </div>
  </div>`;
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:10px;border:1px solid #eee;background:#fafafa"><strong>${label}</strong></td><td style="padding:10px;border:1px solid #eee">${value}</td></tr>`;

async function send(to: string, subject: string, html: string, opts: { cc?: boolean } = {}): Promise<boolean> {
  const mg = getMailgun();
  if (!mg) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV !== 'test') console.warn(`[email] skipped "${subject}" to ${to}: MAILGUN_API_KEY not set`);
    return false;
  }
  const cc = opts.cc ? CC().filter((c) => c.toLowerCase() !== to.toLowerCase()) : [];
  const r: any = await mg.messages.create(DOMAIN(), { from: FROM(), to: [to], ...(cc.length ? { cc } : {}), subject, html });
  // eslint-disable-next-line no-console
  if (process.env.NODE_ENV !== 'test') console.log(`[email] sent "${subject}" to ${to}${cc.length ? ` (cc ${cc.join(',')})` : ''} id=${r?.id ?? '-'}`);
  return true;
}

/** Fire-and-forget with logging; email problems never fail the API request. */
export function sendInBackground(label: string, p: Promise<unknown>): void {
  p.catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`[email] ${label} failed:`, err?.message || err);
  });
}

/* ------------------------------------------------------------------ */

export async function sendWelcomeEmail(to: string | null | undefined, name?: string | null): Promise<boolean> {
  if (!isEmail(to)) { skipLog('welcome', to); return false; }
  const n = esc(name || '');
  return send(to, 'Welcome to Thabayehkom | أهلاً بك في ذبايحكم', layout(`
    <h2 style="color:${BRAND};margin-top:0">Welcome${n ? `, ${n}` : ''}!</h2>
    <p>Your account is ready. You can now order fresh meat delivered to your door.</p>
    <div dir="rtl" style="text-align:right;margin-top:20px">
      <h2 style="color:${BRAND}">أهلاً ${n}!</h2>
      <p>حسابك جاهز. يمكنك الآن طلب اللحوم الطازجة وتوصيلها إلى بابك.</p>
    </div>
    <p style="text-align:center;margin-top:24px">
      <a href="https://thabayehkom.app" style="display:inline-block;padding:12px 28px;background:${BRAND};color:#fff;border-radius:6px;text-decoration:none">Shop Now | تسوق الآن</a>
    </p>`));
}

/** Kept for existing callers. */
export const sendEmailConfirmation = (to: string, name: string) => sendWelcomeEmail(to, name);

async function loadOrder(orderId: number): Promise<any | null> {
  return Order.findByPk(orderId, {
    include: [{ model: OrderProduct, as: 'products', include: [{ model: Product, as: 'product' }, { model: Package, as: 'package' }] }],
  });
}

export async function sendOrderConfirmation(orderOrId: number | { id: number }): Promise<boolean> {
  const order = await loadOrder(typeof orderOrId === 'number' ? orderOrId : orderOrId.id);
  if (!order || !isEmail(order.email)) { if (order) skipLog(`order #${order.id}`, order.email); return false; }

  const items: any[] = order.products || [];
  const itemRows = items.map((it) => {
    const p = it.product || (it.package ? { name: `📦 ${it.package.name}`, name_ar: it.package.name_ar } : {});
    const unit = it.offer_price ?? it.price;
    const name = [p.name || p.name_en, p.name_ar].filter(Boolean).map(esc).join(' / ') || `#${it.product_id}`;
    const pt = parseTypeSnapshot(it.package_type);
    const typeLine = pt ? `Type | النوع: ${esc(pt.name)}${pt.name_ar ? ` / ${esc(pt.name_ar)}` : ''}` : '';
    const addOns = parseSnapshot(it.extras)
      .map((e) => `+ ${esc(e.name)}${e.name_ar ? ` / ${esc(e.name_ar)}` : ''} (${e.price ? kwd(e.price) : 'Free | مجاني'})`)
      .join('<br>');
    return `<tr>
      <td style="padding:8px;border:1px solid #eee">${name}${typeLine ? `<br><small style="color:#555">${typeLine}</small>` : ''}${addOns ? `<br><small style="color:#555">${addOns}</small>` : ''}${it.special_request ? `<br><small style="color:#888">${esc(it.special_request)}</small>` : ''}</td>
      <td style="padding:8px;border:1px solid #eee;text-align:center">${esc(it.quantity)}</td>
      <td style="padding:8px;border:1px solid #eee;text-align:right">${kwd(unit * it.quantity)}</td>
    </tr>`;
  }).join('');
  const pay = PAYMENT[order.payment_method] || ['-', '-'];
  const n = esc(order.name || '');

  const html = layout(`
    <h2 style="color:${BRAND};margin-top:0">Order received! | تم استلام طلبك!</h2>
    <p>Hi ${n || 'there'}, thank you for your order <strong>#${order.id}</strong>. We'll let you know when it's on its way.</p>
    <p dir="rtl" style="text-align:right">مرحباً ${n}، شكراً لطلبك رقم <strong>#${order.id}</strong>. سنخبرك عندما يكون في الطريق إليك.</p>
    ${items.length ? `
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
      <tr style="background:${BRAND};color:#fff">
        <th style="padding:8px;text-align:left">Item | المنتج</th><th style="padding:8px">Qty | الكمية</th><th style="padding:8px;text-align:right">Price | السعر</th>
      </tr>
      ${itemRows}
    </table>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
      ${row('Subtotal | المجموع', kwd(order.sub_total))}
      ${Number(order.discount) > 0 ? row(`Discount | الخصم${order.discount_code ? ` (${esc(order.discount_code)})` : ''}`, `- ${kwd(order.discount)}`) : ''}
      ${row('Delivery | التوصيل', kwd(order.delivery_cost))}
      ${row('Total | الإجمالي', `<strong style="color:${BRAND}">${kwd(order.total_price)}</strong>`)}
      ${row('Payment | الدفع', `${pay[0]} | ${pay[1]}`)}
    </table>`);

  return send(order.email, `Order #${order.id} received | تم استلام طلبك #${order.id}`, html, { cc: true });
}

export async function sendOrderStatusUpdate(orderOrId: number | { id: number }): Promise<boolean> {
  const order = await loadOrder(typeof orderOrId === 'number' ? orderOrId : orderOrId.id);
  if (!order || !isEmail(order.email)) return false;
  const st = STATUS[order.status];
  if (!st || order.status === 0) return false; // nothing to announce for "pending"
  const n = esc(order.name || '');
  const html = layout(`
    <h2 style="color:${BRAND};margin-top:0">Order #${order.id}: ${st.en}</h2>
    <p>Hi ${n || 'there'}, ${st.msgEn}</p>
    <div dir="rtl" style="text-align:right;margin-top:20px">
      <h2 style="color:${BRAND}">طلب #${order.id}: ${st.ar}</h2>
      <p>مرحباً ${n}، ${st.msgAr}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
      ${row('Order | الطلب', `#${order.id}`)}
      ${row('Status | الحالة', `${st.en} | ${st.ar}`)}
      ${row('Total | الإجمالي', kwd(order.total_price))}
    </table>`);
  return send(order.email, `Order #${order.id} — ${st.en} | ${st.ar}`, html, { cc: true });
}
