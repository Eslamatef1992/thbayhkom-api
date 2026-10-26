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
import { Order, Product } from '../src/db/models';

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
const status = (orderId: number, result: string, total: number) =>
  ({ status: true, data: { transaction: { result, requested_order_id: String(orderId), total_price: total, tran_id: 'T-' + orderId } } });

describe('UPayments flow', () => {
  it('checkout returns the gateway link and points callbacks at the backend', async () => {
    const res = await knetOrder('p1');
    expect(res.body.status).toBe(true);
    expect(res.body.url).toBe('https://sandbox.upayments.com/pay/abc');
    const axios = (await import('axios')).default as any;
    const body = axios.post.mock.calls.at(-1)[1];
    expect(body.returnUrl).toBe(`https://back.thabayehkom.app/api/payment/return?oid=${res.body.order.id}&lang=en`);
    expect(body.notificationUrl).toContain('/api/payment/webhook?oid=');
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
});
