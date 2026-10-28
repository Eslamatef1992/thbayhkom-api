import request from 'supertest';

const sent: any[] = [];
jest.mock('mailgun.js', () => jest.fn().mockImplementation(() => ({
  client: () => ({ messages: { create: async (_d: string, msg: any) => { sent.push(msg); return {}; } } }),
})));
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: { status: true, data: { link: 'https://sandbox.upayments.com/pay/x' } } })),
    get: jest.fn(async () => ({ data: { status: true, data: { transaction: { result: 'CAPTURED' } } } })),
  },
}));
process.env.MAILGUN_API_KEY = 'test-key';

import { createApp } from '../src/app';
import { sequelize } from '../src/db/sequelize';
import { runSeed } from '../src/db/seed';
import { Order, OrderProduct, Product } from '../src/db/models';

let app: ReturnType<typeof createApp>;
let auth: Record<string, string>;
let products: any[];
const flush = () => new Promise((r) => setTimeout(r, 300));

beforeAll(async () => {
  await runSeed();
  app = createApp();
  const t = (await request(app).post('/api/admin/auth/login').send({ email: 'admin@test.local', password: 'Admin@Test1' })).body.data.token;
  auth = { Authorization: `Bearer ${t}` };
  products = await Product.findAll({ limit: 2 });
});
afterAll(async () => { await sequelize.close(); });

async function makePackage(extra: any = {}) {
  return request(app).post('/api/admin/packages').set(auth).send({
    name: 'BBQ Box', name_ar: 'صندوق المشاوي', description: 'For 4', description_ar: 'لأربعة',
    price_before: 20, price_after: 15,
    products: [{ product_id: products[0].id, quantity: 2 }, { product_id: products[1].id, quantity: 1 }],
    ...extra,
  });
}

describe('Packages', () => {
  it('admin creates, validates, updates and deletes packages', async () => {
    expect((await makePackage({ products: [] })).status).toBe(400);
    expect((await makePackage({ price_after: 0 })).status).toBe(400);
    expect((await makePackage({ price_before: 10 })).status).toBe(400); // before < after
    const res = await makePackage();
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    const id = res.body.data.id;
    const upd = await request(app).put(`/api/admin/packages/${id}`).set(auth).send({
      name: 'BBQ Box XL', price_before: 30, price_after: 22, products: [{ product_id: products[0].id, quantity: 3 }],
    });
    expect(upd.body.data.items).toHaveLength(1);
    expect(upd.body.data.items[0].quantity).toBe(3);
    const list = await request(app).get('/api/admin/packages').set(auth);
    expect(list.body.meta.total).toBeGreaterThanOrEqual(1);
    expect((await request(app).delete(`/api/admin/packages/${id}`).set(auth)).body.success).toBe(true);
  });

  it('app lists packages (localized) and shows details with products', async () => {
    const id = (await makePackage()).body.data.id;
    await makePackage({ name: 'Hidden', status: 'inactive' });
    const ar = await request(app).get('/api/getPackages').set('Accept-Language', 'ar');
    const names = ar.body.items.map((p: any) => p.name);
    expect(names).toContain('صندوق المشاوي');
    expect(names).not.toContain('Hidden');
    const d = await request(app).get(`/api/getPackageDetails/${id}`);
    expect(d.body.item).toMatchObject({ price_before: 20, price_after: 15, discount_percent: 25 });
    expect(d.body.item.products[0].product.name).toBeTruthy();
  });

  it('features and badge are localized for the package cards', async () => {
    const created = await makePackage({
      name: 'Whole lamb', features: 'Fresh meat\n• Serves 24\n\n', features_ar: 'لحم طازج\nتكفى 24 شخص',
      badge: 'Best seller', badge_ar: 'الأكثر مبيعا',
    });
    const id = created.body.data.id;
    const ar = (await request(app).get(`/api/getPackageDetails/${id}`).set('Accept-Language', 'ar')).body.item;
    expect(ar.features).toEqual(['لحم طازج', 'تكفى 24 شخص']);
    expect(ar.badge).toBe('الأكثر مبيعا');
    const en = (await request(app).get(`/api/getPackageDetails/${id}`)).body.item;
    expect(en.features).toEqual(['Fresh meat', 'Serves 24']);
    expect(en.badge).toBe('Best seller');
  });

  it('package goes through cart and checkout at the package price', async () => {
    const id = (await makePackage()).body.data.id;
    const fcm = { fcmToken: 'pkg-guest' };
    await request(app).get(`/api/addPackageToCart/${id}?quantity=2`).set(fcm);
    const cart = await request(app).get('/api/getMyCart').set(fcm);
    expect(cart.body.total).toBe(30);
    expect(cart.body.MyCart[0].package.id).toBe(id);
    expect(cart.body.MyCart[0].product).toMatchObject({ is_package: true, discount_price: 15 });
    sent.length = 0;
    const out = await request(app).post('/api/checkOut').set(fcm).type('form')
      .send({ payment_type: 3, full_name: 'Guest', email: 'g@example.com', mobile: '965', fcmToken: 'pkg-guest' });
    expect(out.body.status).toBe(true);
    const order: any = await Order.findByPk(out.body.order.id);
    expect(order.sub_total).toBe(30);
    const lines: any[] = await OrderProduct.findAll({ where: { order_id: order.id } });
    expect(lines[0].package_id).toBe(id);
    expect(lines[0].product_id).toBeNull();
    await flush();
    expect(sent).toHaveLength(1); // COD: confirmation sent immediately
    expect(sent[0].html).toContain('BBQ Box');
  });

  it('KNET: no confirmation email until the payment is verified', async () => {
    const product: any = products[0];
    sent.length = 0;
    const res = await request(app).post('/api/checkOutByProductId').set('fcmToken', 'knet-1').type('form')
      .send({ product_id: product.id, quantity: 1, payment_type: 1, full_name: 'K', email: 'k@example.com', mobile: '965' });
    await flush();
    expect(sent).toHaveLength(0);
    await request(app).post('/api/payment/webhook').send({ track_id: 'T1', order_id: String(res.body.order.id) });
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(['k@example.com']);
    // a repeated callback for an already-paid order doesn't send it again
    await request(app).post('/api/payment/webhook').send({ track_id: 'T1', order_id: String(res.body.order.id) });
    await flush();
    expect(sent).toHaveLength(1);
  });
});
