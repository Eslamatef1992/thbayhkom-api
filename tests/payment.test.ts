import request from 'supertest';

// Mock UPayments: charge returns a link; status lookups come from `statuses`.
const statuses: Record<string, any> = {};
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: { status: true, data: { link: 'https://sandbox.upayments.com/pay/abc' } } })),
    get: jest.fn(async (url: string) => {
      const track = decodeURIComponent(url.split('/').pop()!);
      if (!statuses[track]) throw Object.assign(new Error('not found'), { response: { status: 404 } });
      return { data: statuses[track] };
    }),
  },
}));

import { createApp } from '../src/app';
import { sequelize } from '../src/db/sequelize';
import { runSeed } from '../src/db/seed';
import { Cart, Notification, Order, Product } from '../src/db/models';

let app: ReturnType<typeof createApp>;
beforeAll(async () => { await runSeed(); app = createApp(); });
afterAll(async () => { await sequelize.close(); });

async function knetOrder(fcm: string) {
  const product: any = await Product.findOne();
  const res = await request(app).post('/api/checkOutByProductId').set('fcmToken', fcm).type('form').send({
    product_id: product.id, quantity: 1, payment_type: 1, full_name: 'Pay', email: 'pay@example.com', mobile: '965',
  });
  return res;
}
// Shaped like UPayments: its own internal order_id plus our requested_order_id/reference.
const status = (orderId: number, result: string, total: number) =>
  ({ status: true, data: { transaction: {
    result, order_id: '01a1776f99dab00fa72c08a43f94324f', requested_order_id: String(orderId),
    reference: `order-${orderId}`, total_price: total, tran_id: 'T-' + orderId,
  } } });

describe('UPayments flow', () => {
  it('checkout returns the gateway link and points callbacks at the backend', async () => {
    const res = await knetOrder('p1');
    expect(res.body.status).toBe(true);
    expect(res.body.url).toBe('https://sandbox.upayments.com/pay/abc');
    const axios = (await import('axios')).default as any;
    const body = axios.post.mock.calls.at(-1)[1];
    expect(body.returnUrl).toBe(`https://back.thabayehkom.app/api/payment/return?oid=${res.body.order.id}&lang=en`);
    expect(body.notificationUrl).toContain('/api/payment/webhook?oid=');
    expect(body.reference).toEqual({ id: `order-${res.body.order.id}` });
  });

  it('webhook marks the order paid only after UPayments confirms CAPTURED', async () => {
    const { body } = await knetOrder('p2');
    const id = body.order.id;
    const order: any = await Order.findByPk(id);
    statuses['TRK-OK'] = status(id, 'CAPTURED', order.total_price);
    const res = await request(app).post('/api/payment/webhook').send({ track_id: 'TRK-OK', order_id: String(id), result: 'CAPTURED' });
    expect(res.body.payment_status).toBe(1);
    const saved: any = await Order.findByPk(id);
    expect(saved.payment_status).toBe(1);
    expect(saved.transaction_id).toBe('T-' + id);
  });

  it('ignores a forged "CAPTURED" callback that UPayments does not confirm', async () => {
    const { body } = await knetOrder('p3');
    statuses['TRK-FAIL'] = status(body.order.id, 'NOT CAPTURED', 1);
    const res = await request(app).post('/api/payment/webhook').send({ track_id: 'TRK-FAIL', order_id: String(body.order.id), result: 'CAPTURED' });
    expect(res.body.payment_status).toBe(2);
  });

  it('rejects another order\'s track_id and amount mismatches', async () => {
    const a = (await knetOrder('p4')).body.order.id;
    const b = (await knetOrder('p5')).body.order.id;
    statuses['TRK-A'] = status(a, 'CAPTURED', 999);
    expect((await request(app).post('/api/payment/webhook').send({ track_id: 'TRK-A', order_id: String(b) })).body.payment_status).toBe(0);
    expect((await request(app).post('/api/payment/webhook').send({ track_id: 'TRK-A', order_id: String(a) })).body.payment_status).toBe(0);
  });

  it('return URL verifies then redirects to the page the app watches for', async () => {
    const { body } = await knetOrder('p6');
    const order: any = await Order.findByPk(body.order.id);
    statuses['TRK-RET'] = status(order.id, 'CAPTURED', order.total_price);
    const ok = await request(app).get(`/api/payment/return?oid=${order.id}&lang=ar&track_id=TRK-RET&result=CAPTURED`);
    expect(ok.status).toBe(302);
    expect(ok.headers.location).toBe(`https://thabayehkom.com/ar/successpayment?order_id=${order.id}`);
    const bad = await request(app).get(`/api/payment/cancel?oid=99999&lang=en`);
    expect(bad.headers.location).toBe('https://thabayehkom.com/en/failpayment?order_id=99999');
  });

  it('keeps the cart during payment, then clears it and notifies once paid', async () => {
    const email = `buyer${Date.now()}@test.local`;
    const signup = await request(app).post('/api/signUp').type('form').send({
      name: 'Buyer', email, mobile: '96512345678', password: 'Pass@123', confirm_password: 'Pass@123',
    });
    const token = signup.body.user.access_token;
    const userId = signup.body.user.id;
    const auth = { Authorization: `Bearer ${token}` };
    const product: any = await Product.findOne();
    await request(app).get(`/api/addProductToCart/${product.id}?quantity=1`).set(auth);
    const addr = await request(app).post('/api/addNewAdress').set(auth).type('form').send({ address_name: 'Home', block: '1', street: '2' });
    const addressId = addr.body.address_id;
    expect(addressId).toBeTruthy();

    const co = await request(app).post('/api/checkOut').set(auth).type('form').send({ address_id: addressId, payment_type: 1 });
    expect(co.body.status).toBe(true);
    expect(co.body.url).toBeTruthy();
    expect(await Cart.count({ where: { user_id: userId } })).toBeGreaterThan(0); // not emptied yet
    expect(await Notification.count({ where: { user_id: userId } })).toBe(0);    // nothing until paid

    const order: any = await Order.findByPk(co.body.order.id);
    statuses['TRK-CART'] = status(order.id, 'CAPTURED', order.total_price);
    await request(app).post('/api/payment/webhook').send({ track_id: 'TRK-CART', order_id: String(order.id) });
    expect(await Cart.count({ where: { user_id: userId } })).toBe(0);

    const notes = await request(app).get('/api/myNotifications').set(auth);
    expect(notes.body.items).toHaveLength(1);
    expect(notes.body.items[0].messag_type).toBe('1');
    expect(notes.body.items[0].order_id).toBe(order.id);
    expect(notes.body.items[0].created_at).toBeTruthy(); // null dates crashed the app's list
  });

  it('a refused charge returns an error (no fake payment URL) and marks the order failed', async () => {
    const axios = (await import('axios')).default as any;
    axios.post.mockImplementationOnce(async () => {
      throw Object.assign(new Error('401'), { response: { status: 401, data: { status: false, message: 'Unauthenticated.' } } });
    });
    const res = await knetOrder('p7');
    expect(res.body.status).toBe(false);
    expect(res.body.url ?? null).toBeNull();
    expect(res.body.message).toContain('Unauthenticated.');
    const last: any = await Order.findOne({ order: [['id', 'DESC']] });
    expect(last.payment_status).toBe(2);
  });

  it('the old unauthenticated /payment/callback can no longer mark orders paid', async () => {
    const { body } = await knetOrder('p8');
    await request(app).get(`/api/payment/callback?order_id=${body.order.id}&status=paid`);
    expect(((await Order.findByPk(body.order.id)) as any).payment_status).toBe(0);
  });
});
