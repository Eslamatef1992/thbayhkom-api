import request from 'supertest';

jest.mock('mailgun.js', () => jest.fn().mockImplementation(() => ({
  client: () => ({ messages: { create: async () => ({}) } }),
})));
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: { status: true, data: { link: 'https://sandbox.upayments.com/pay/x' } } })),
    get: jest.fn(async () => ({ data: {} })),
  },
}));

import { createApp } from '../src/app';
import { sequelize } from '../src/db/sequelize';
import { runSeed } from '../src/db/seed';
import { Order, OrderProduct, Product } from '../src/db/models';

let app: ReturnType<typeof createApp>;
let auth: Record<string, string>;
let products: any[];

beforeAll(async () => {
  await runSeed();
  app = createApp();
  const t = (await request(app).post('/api/admin/auth/login').send({ email: 'admin@test.local', password: 'Admin@Test1' })).body.data.token;
  auth = { Authorization: `Bearer ${t}` };
  products = await Product.findAll({ limit: 1 });
});
afterAll(async () => { await sequelize.close(); });

const extra = (body: any) => request(app).post('/api/admin/extras').set(auth).send(body);

describe('Extras (package add-ons)', () => {
  let liver: number, cutting: number, other: number, pkgId: number;

  it('admin creates extras (paid and free) with validation', async () => {
    expect((await extra({ name: 'Liver' })).body.message).toBe('Arabic name is required');
    expect((await extra({ name: 'X', name_ar: 'س', price: -1 })).body.message).toBe('Price must be 0 (free) or more');
    liver = (await extra({ name: 'Extra liver', name_ar: 'كبدة إضافية', price: 2.5 })).body.data.id;
    cutting = (await extra({ name: 'Cutting', name_ar: 'تقطيع', price: 0 })).body.data.id;
    other = (await extra({ name: 'Not on this package', name_ar: 'غير مرتبطة', price: 9 })).body.data.id;
    const all = await request(app).get('/api/admin/extras?all=1').set(auth);
    expect(all.body.data.map((e: any) => e.id)).toEqual(expect.arrayContaining([liver, cutting, other]));
  });

  it('admin attaches extras to a package; the app lists them as add-ons', async () => {
    const res = await request(app).post('/api/admin/packages').set(auth).send({
      name: 'Half lamb', name_ar: 'نص خروف', price_after: 80,
      products: [{ product_id: products[0].id, quantity: 1 }], extra_ids: [liver, cutting],
    });
    pkgId = res.body.data.id;
    expect(res.body.data.extras.map((e: any) => e.id).sort()).toEqual([liver, cutting].sort());
    const ar = (await request(app).get(`/api/getPackageDetails/${pkgId}`).set('Accept-Language', 'ar')).body.item;
    expect(ar.extras.map((e: any) => e.name).sort()).toEqual(['تقطيع', 'كبدة إضافية'].sort());
    expect(ar.extras.find((e: any) => e.id === cutting).is_free).toBe(true);
  });

  it('cart: add-ons priced from the database; different add-ons = separate lines; foreign add-ons rejected', async () => {
    const h = { fcmToken: 'extras-guest' };
    expect((await request(app).get(`/api/addPackageToCart/${pkgId}?extras=${other}`).set(h)).body.code).toBe(422);
    await request(app).get(`/api/addPackageToCart/${pkgId}?quantity=2&extras=${liver},${cutting}`).set(h);
    await request(app).get(`/api/addPackageToCart/${pkgId}?extras=${cutting},${liver}`).set(h); // same set -> merged
    await request(app).get(`/api/addPackageToCart/${pkgId}`).set(h);                           // no add-ons -> new line
    const cart = (await request(app).get('/api/getMyCart').set(h)).body;
    expect(cart.MyCart).toHaveLength(2);
    const withAddOns = cart.MyCart.find((c: any) => c.extras.length === 2);
    expect(withAddOns.quantity).toBe(3);
    expect(withAddOns.extras_total).toBe(2.5);
    expect(withAddOns.product.discount_price ?? withAddOns.product.price).toBe(82.5);
    expect(cart.total).toBe(82.5 * 3 + 80);
  });

  it('checkout stores a priced snapshot of the add-ons', async () => {
    const res = await request(app).post('/api/checkOut').set('fcmToken', 'extras-guest').type('form').send({
      payment_type: 3, full_name: 'Guest', mobile: '96500000000', email: 'g@example.com',
    });
    expect(res.body.status).toBe(true);
    const order: any = await Order.findByPk(res.body.order.id);
    expect(Number(order.sub_total)).toBe(82.5 * 3 + 80);
    const lines: any[] = await OrderProduct.findAll({ where: { order_id: order.id } });
    const line = lines.find((l) => l.extras);
    expect(line.extras_total).toBe(2.5);
    expect(JSON.parse(line.extras).map((e: any) => e.name).sort()).toEqual(['Cutting', 'Extra liver']);
  });

  it('a deleted extra is never charged for lines already in a cart', async () => {
    const h = { fcmToken: 'extras-guest-2' };
    await request(app).get(`/api/addPackageToCart/${pkgId}?extras=${liver}`).set(h);
    await request(app).delete(`/api/admin/extras/${liver}`).set(auth);
    const cart = (await request(app).get('/api/getMyCart').set(h)).body;
    expect(cart.total).toBe(80);
  });
});
