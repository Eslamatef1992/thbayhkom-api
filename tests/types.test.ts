import request from 'supertest';

jest.mock('mailgun.js', () => jest.fn().mockImplementation(() => ({
  client: () => ({ messages: { create: async () => ({}) } }),
})));
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));

import { createApp } from '../src/app';
import { sequelize } from '../src/db/sequelize';
import { runSeed } from '../src/db/seed';
import { OrderProduct, Product } from '../src/db/models';

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

const type = (body: any) => request(app).post('/api/admin/types').set(auth).send(body);
const pkgBody = (extra: any) => ({
  name: 'Whole lamb', name_ar: 'خروف كامل', price_after: 100,
  products: [{ product_id: products[0].id, quantity: 1 }], ...extra,
});

describe('Package types', () => {
  let naimi: number, harri: number, other: number, pkgId: number, plainId: number;

  it('admin creates types with AR/EN names', async () => {
    expect((await type({ name: 'Naimi' })).body.message).toBe('Arabic name is required');
    naimi = (await type({ name: 'Naimi', name_ar: 'نعيمي', sort_order: 1 })).body.data.id;
    harri = (await type({ name: 'Harri', name_ar: 'حري', sort_order: 2 })).body.data.id;
    other = (await type({ name: 'Australian', name_ar: 'أسترالي' })).body.data.id;
    expect((await request(app).get('/api/admin/types?all=1').set(auth)).body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('package "has types" needs at least one type; app lists them in order', async () => {
    expect((await request(app).post('/api/admin/packages').set(auth).send(pkgBody({ has_types: true, type_ids: [] }))).body.message)
      .toBe('Choose at least one type, or turn off "Has types"');
    const res = await request(app).post('/api/admin/packages').set(auth).send(pkgBody({ has_types: true, type_ids: [harri, naimi] }));
    pkgId = res.body.data.id;
    plainId = (await request(app).post('/api/admin/packages').set(auth).send(pkgBody({ name: 'Plain', type_ids: [naimi] }))).body.data.id;

    const ar = (await request(app).get(`/api/getPackageDetails/${pkgId}`).set('Accept-Language', 'ar')).body.item;
    expect(ar.has_types).toBe(true);
    expect(ar.types.map((t: any) => t.name)).toEqual(['نعيمي', 'حري']);
    const plain = (await request(app).get(`/api/getPackageDetails/${plainId}`)).body.item;
    expect(plain.has_types).toBe(false); // types linked but "has types" off -> not offered
    expect(plain.types).toEqual([]);
  });

  it('cart requires one of the package\'s types; different types are separate lines', async () => {
    const h = { fcmToken: 'types-guest' };
    expect((await request(app).get(`/api/addPackageToCart/${pkgId}`).set(h)).body.message).toBe('Please choose a type');
    expect((await request(app).get(`/api/addPackageToCart/${pkgId}?type_id=${other}`).set(h)).body.code).toBe(422);
    await request(app).get(`/api/addPackageToCart/${pkgId}?type_id=${naimi}`).set(h);
    await request(app).get(`/api/addPackageToCart/${pkgId}?type_id=${naimi}`).set(h);
    await request(app).get(`/api/addPackageToCart/${pkgId}?type_id=${harri}`).set(h);
    await request(app).get(`/api/addPackageToCart/${plainId}`).set(h); // no types needed
    const cart = (await request(app).get('/api/getMyCart').set(h).set('Accept-Language', 'ar')).body.MyCart;
    expect(cart).toHaveLength(3);
    const n = cart.find((c: any) => c.package_type?.id === naimi);
    expect(n.quantity).toBe(2);
    expect(n.package_type.name).toBe('نعيمي');
  });

  it('checkout keeps the chosen type on the order line', async () => {
    const res = await request(app).post('/api/checkOut').set('fcmToken', 'types-guest').type('form').send({
      payment_type: 3, full_name: 'Guest', mobile: '96500000000', email: 'g@example.com',
    });
    expect(res.body.status).toBe(true);
    const lines: any[] = await OrderProduct.findAll({ where: { order_id: res.body.order.id } });
    const names = lines.filter((l) => l.package_type).map((l) => JSON.parse(l.package_type).name).sort();
    expect(names).toEqual(['Harri', 'Naimi']);
  });

  it('checkout refuses a line whose type was removed from the package', async () => {
    const h = { fcmToken: 'types-guest-2' };
    await request(app).get(`/api/addPackageToCart/${pkgId}?type_id=${harri}`).set(h);
    await request(app).put(`/api/admin/packages/${pkgId}`).set(auth).send(pkgBody({ has_types: true, type_ids: [naimi] }));
    const res = await request(app).post('/api/checkOut').set(h).type('form').send({
      payment_type: 3, full_name: 'Guest', mobile: '96500000000',
    });
    expect(res.body.status).toBe(false);
    expect(res.body.message).toContain('Please choose a type');
  });
});
