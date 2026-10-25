import Mailgun from 'mailgun.js';
import FormData from 'form-data';

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
  url: process.env.MAILGUN_EU_REGION === 'true' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net',
});

const DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.thabayehkom.app';
const FROM   = process.env.MAILGUN_FROM   || 'Thabayehkom <support@mg.thabayehkom.app>';
const CC     = 'info@thabayehkom.app';
const BRAND  = '#AC2023';

export async function sendEmailConfirmation(to: string, name: string): Promise<void> {
  if (!to) return;
  await mg.messages.create(DOMAIN, {
    from: FROM,
    to:   [to],
    subject: 'Welcome to Thabayehkom | أهلاً بك في ذبايحكم',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border-top:4px solid ${BRAND}">
        <div style="background:${BRAND};padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0">ذبايحكم | Thabayehkom</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:${BRAND}">Welcome, ${name || 'Customer'}! | أهلاً ${name || ''}!</h2>
          <p>Your account has been confirmed. You can now place orders for fresh meat delivered to your door.</p>
          <p>تم تأكيد حسابك. يمكنك الآن طلب اللحوم الطازجة وتوصيلها إلى بابك.</p>
          <a href="https://thabayehkom.app" style="display:inline-block;margin-top:16px;padding:12px 28px;background:${BRAND};color:#fff;border-radius:6px;text-decoration:none">Shop Now | تسوق الآن</a>
        </div>
        <div style="padding:16px;text-align:center;color:#888;font-size:12px">
          © 2024 Thabayehkom. Kuwait.
        </div>
      </div>`,
  });
}

export async function sendOrderConfirmation(order: {
  id: number; email?: string; name?: string; total_price?: number; items?: any[];
}): Promise<void> {
  if (!order.email) return;
  const subject = `Order Confirmed #${order.id} | تم تأكيد طلبك #${order.id}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border-top:4px solid ${BRAND}">
      <div style="background:${BRAND};padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0">ذبايحكم | Thabayehkom</h1>
      </div>
      <div style="padding:32px">
        <h2 style="color:${BRAND}">Order Confirmed! | تم تأكيد الطلب!</h2>
        <p>Hi ${order.name || 'Customer'}, your order <strong>#${order.id}</strong> has been placed successfully.</p>
        <p>مرحباً ${order.name || ''}، تم استلام طلبك رقم <strong>#${order.id}</strong> بنجاح.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr style="background:#f9f9f9">
            <td style="padding:12px;border:1px solid #eee"><strong>Order ID | رقم الطلب</strong></td>
            <td style="padding:12px;border:1px solid #eee">#${order.id}</td>
          </tr>
          <tr>
            <td style="padding:12px;border:1px solid #eee"><strong>Total | الإجمالي</strong></td>
            <td style="padding:12px;border:1px solid #eee">${order.total_price} KWD</td>
          </tr>
        </table>
        <p style="margin-top:24px;color:#555">We'll notify you when your order is on its way.</p>
        <p style="color:#555">سنخبرك عندما يكون طلبك في الطريق إليك.</p>
      </div>
      <div style="padding:16px;text-align:center;color:#888;font-size:12px">
        © 2024 Thabayehkom. Kuwait.
      </div>
    </div>`;

  await mg.messages.create(DOMAIN, {
    from: FROM, to: [order.email], cc: [CC], subject, html,
  });
}
