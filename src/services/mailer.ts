import https from 'https';
import querystring from 'querystring';
import { config } from '../config';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailResult {
  ok: boolean;
  id?: string;
  message?: string;
}

function mailgunHost(): string {
  return config.mail.euRegion ? 'api.eu.mailgun.net' : 'api.mailgun.net';
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function mailerEnabled(): boolean {
  return Boolean(config.mail.apiKey && config.mail.domain);
}

/**
 * Sends an email through the Mailgun messages API. Resolves (never rejects)
 * with ok:false and a reason so callers can decide whether to log or ignore.
 */
export function sendMail(opts: MailOptions): Promise<MailResult> {
  if (!opts.to) return Promise.resolve({ ok: false, message: 'No recipient email on the order' });
  if (!mailerEnabled()) {
    return Promise.resolve({ ok: false, message: 'Mailgun is not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN)' });
  }

  const from = config.mail.from || `Thabayehkom <postmaster@${config.mail.domain}>`;
  const body = querystring.stringify({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text || stripHtml(opts.html),
    html: opts.html,
  });

  return new Promise<MailResult>((resolve) => {
    const req = https.request(
      {
        hostname: mailgunHost(),
        path: `/v3/${config.mail.domain}/messages`,
        method: 'POST',
        auth: `api:${config.mail.apiKey}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            let id: string | undefined;
            try { id = JSON.parse(raw)?.id; } catch { /* ignore */ }
            resolve({ ok: true, id });
          } else {
            resolve({ ok: false, message: `Mailgun ${res.statusCode}: ${raw.slice(0, 300)}` });
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('Mailgun request timeout'));
    });
    req.on('error', (err) => resolve({ ok: false, message: err.message }));
    req.write(body);
    req.end();
  });
}

// --- Order email templates ---

function baseLayout(title: string, bodyHtml: string): string {
  return `<html><body style="margin:0;padding:0;background:#f6f6f8;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#7a1f1f;margin:0 0 16px;">Thabayehkom</h2>
  <div style="background:#ffffff;border-radius:8px;padding:24px;">
    <h3 style="margin-top:0;color:#333;">${title}</h3>
    ${bodyHtml}
  </div>
  <p style="color:#999;font-size:12px;">This is an automated message from Thabayehkom.</p>
</div>
</body></html>`;
}

function money(n: number): string {
  return n.toFixed(3);
}

function orderRows(items: Array<{ product: any; quantity: number }>): string {
  return items
    .map((it) => {
      const name = it.product?.price != null
        ? (it.product?.translations?.find((t: any) => t.locale === 'en')?.name || it.product?.name || `#${it.product?.id}`)
        : `#${it.product?.id}`;
      return `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;">${name}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
      </tr>`;
    })
    .join('');
}

export async function sendOrderConfirmation(order: any, items: Array<{ product: any; quantity: number }>): Promise<MailResult> {
  if (!order?.email) return { ok: false, message: 'Order has no email' };
  const number = order.id;
  const body = `
    <p>Hi ${order.name || 'there'},</p>
    <p>Your order <strong>#${number}</strong> has been placed successfully.</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr><th align="left">Item</th><th align="center">Qty</th></tr>
      ${orderRows(items)}
    </table>
    <p><strong>Total:</strong> ${money(Number(order.total_price || 0))}</p>
    <p>Payment method: ${Number(order.payment_method) === 3 ? 'Cash on delivery' : 'Online'}</p>
  `;
  return sendMail({
    to: order.email,
    subject: `Order #${number} confirmed - Thabayehkom`,
    html: baseLayout('Order confirmed', body),
  });
}

const TRACK_STEPS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

function trackingTimeline(statusName: string): string {
  const lower = (statusName || '').trim().toLowerCase();
  if (lower.includes('cancel') || lower.includes('refund') || lower.includes('return')) {
    return `
      <p style="color:#b71c1c;font-weight:bold;">${statusName}</p>
      <p>If this was not expected, please contact our support with your order number.</p>`;
  }
  const idx = TRACK_STEPS.findIndex((s) => lower === s.toLowerCase() || lower.includes(s.toLowerCase()));
  const current = idx >= 0 ? idx : 0;
  return `<table style="border-collapse:collapse;margin:8px 0;">${TRACK_STEPS.map((s, i) => {
    const done = i < current;
    const active = i === current;
    const label = done ? `<strong>&#10003; ${s}</strong>` : active ? `<strong>${s}</strong> (current)` : s;
    const color = active ? '#7a1f1f' : done ? '#2e7d32' : '#aaa';
    return `<tr><td style="width:56px;text-align:center;${done ? 'color:#2e7d32;' : 'color:#ccc;'}">${done ? '&#10003;' : i === 0 ? '&#9679;' : '&#9675;'}</td><td style="padding:4px 0;color:${color};${active ? 'font-weight:bold;' : ''}">${label}</td></tr>`;
  }).join('')}</table>`;
}

export async function sendOrderStatusUpdate(order: any): Promise<MailResult> {
  if (!order?.email) return { ok: false, message: 'Order has no email' };
  const body = `
    <p>Hi ${order.name || 'there'},</p>
    <p>Here is the latest tracking update for your order <strong>#${order.id}</strong>.</p>
    <p>${trackingTimeline(order.status_name || '')}</p>
    <p><strong>Current status:</strong> ${order.status_name || `Status ${order.status}`}</p>
    <p><strong>Payment:</strong> ${Number(order.payment_status) === 1 ? 'Paid' : 'Not paid yet'}
       (${Number(order.payment_method) === 3 ? 'cash on delivery' : 'online'})</p>
    <p><strong>Total:</strong> ${money(Number(order.total_price || 0))}</p>
    <p>Keep your order number <strong>#${order.id}</strong> to track this order in the Thabayehkom app or website.</p>
  `;
  return sendMail({
    to: order.email,
    subject: `Order #${order.id} is now ${order.status_name || 'updated'} - Thabayehkom`,
    html: baseLayout('Order tracking update', body),
  });
}
