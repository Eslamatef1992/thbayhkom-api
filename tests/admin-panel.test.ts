import request from 'supertest';
import { createApp } from '../src/app';
import { sequelize } from '../src/db/sequelize';
import { runSeed } from '../src/db/seed';
import { Order, User } from '../src/db/models';

/** Endpoints the rebuilt admin panel depends on (beyond the generic CRUD). */

let app: ReturnType<typeof createApp>;
let token: string;
const auth = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await runSeed();
  app = createApp();
  const res = await request(app).post('/api/admin/auth/login').send({ email: 'admin@test.local', password: 'Admin@Test1' });
  token = res.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Admin panel support endpoints', () => {
  it('GET /admin/roles lists roles with permissions', async () => {
    const res = await request(app).get('/api/admin/roles').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: any) => r.name)).toEqual(expect.arrayContaining(['admin', 'manager', 'customer']));
    expect(res.body.data.find((r: any) => r.name === 'manager').permissions).toContain('orders.manage');
  });

  it('customers list never exposes password hashes or admins', async () => {
    const res = await request(app).get('/api/admin/customers').set(auth());
    expect(res.status).toBe(200);
    for (const u of res.body.data) {
      expect(u).not.toHaveProperty('password_hash');
      expect(u.email).not.toBe('admin@test.local');
    }
  });

  it('customers update cannot escalate to admin', async () => {
    const { id } = (await User.create({ name: 'Cust', email: 'cust@test.local', role: 'customer' })) as any;
    const list = await request(app).get('/api/admin/customers').set(auth());
    expect(list.body.data.map((u: any) => u.id)).toContain(id);
    await request(app).put(`/api/admin/customers/${id}`).set(auth()).send({ role: 'admin', is_admin: true, status: 'inactive' });
    const after = await request(app).get('/api/admin/admins').set(auth());
    expect(after.body.data.map((a: any) => a.id)).not.toContain(id);
  });

  it('creates a manager who can log in but cannot manage admins', async () => {
    const created = await request(app).post('/api/admin/admins').set(auth())
      .send({ name: 'Ops', email: 'ops@test.local', password: 'Ops@12345', role: 'manager' });
    expect(created.status).toBe(200);
    expect(created.body.data).not.toHaveProperty('password_hash');

    const login = await request(app).post('/api/admin/auth/login').send({ email: 'ops@test.local', password: 'Ops@12345' });
    expect(login.status).toBe(200);
    const mgr = { Authorization: `Bearer ${login.body.data.token}` };
    expect((await request(app).get('/api/admin/products').set(mgr)).status).toBe(200);
    expect((await request(app).get('/api/admin/admins').set(mgr)).status).toBe(403);
  });

  it('rejects short admin passwords and duplicate emails', async () => {
    const short = await request(app).post('/api/admin/admins').set(auth()).send({ name: 'X', email: 'x@test.local', password: '123' });
    expect(short.status).toBe(400);
    const dup = await request(app).post('/api/admin/admins').set(auth()).send({ name: 'X', email: 'ops@test.local', password: 'Longenough1' });
    expect(dup.status).toBe(409);
  });

  it('an admin cannot remove themselves', async () => {
    const me = await request(app).get('/api/admin/auth/me').set(auth());
    const res = await request(app).delete(`/api/admin/admins/${me.body.data.id}`).set(auth());
    expect(res.status).toBe(400);
  });

  it('GET /admin/products/:id returns linked cut/service type ids', async () => {
    const cut = await request(app).post('/api/admin/cut-types').set(auth()).send({ name: 'Cubes' });
    const created = await request(app).post('/api/admin/products').set(auth())
      .send({ name: 'Test Leg', price: 10, cut_type_ids: [cut.body.data.id], images: ['a.png'] });
    const res = await request(app).get(`/api/admin/products/${created.body.data.id}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.cut_type_ids).toEqual([cut.body.data.id]);
    expect(res.body.data.images).toHaveLength(1);
  });

  it('PUT /admin/orders/:id updates status', async () => {
    const order: any = await Order.create({ name: 'Guest', total_price: 5, status: 0 });
    const res = await request(app).put(`/api/admin/orders/${order.id}`).set(auth()).send({ status: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(3);
  });

  it('filters cities by level', async () => {
    const gov = await request(app).get('/api/admin/cities?level=governorate').set(auth());
    const area = await request(app).get('/api/admin/cities?level=area').set(auth());
    expect(gov.body.data.every((c: any) => c.parent_id === null)).toBe(true);
    expect(area.body.data.every((c: any) => c.parent_id !== null)).toBe(true);
  });

  it('banners and countries keep video_url / icon_url', async () => {
    const b = await request(app).post('/api/admin/banners').set(auth()).send({ type: 3, video_url: 'https://x/v.mp4', status: 'active' });
    expect(b.body.data.video_url).toBe('https://x/v.mp4');
    const mobile = await request(app).get('/api/getBanners');
    expect(mobile.body.items.some((x: any) => x.video_url === 'https://x/v.mp4')).toBe(true);
    const c = await request(app).post('/api/admin/countries').set(auth()).send({ name: 'Flagland', icon_url: 'https://x/f.png' });
    expect(c.body.data.icon_url).toBe('https://x/f.png');
  });

  it('video upload requires an admin token', async () => {
    const res = await request(app).post('/api/upload/video').attach('file', Buffer.from('x'), { filename: 'v.mp4', contentType: 'video/mp4' });
    expect(res.status).toBe(401);
  });
});

describe('Promotion code validity', () => {
  const create = (body: any) => request(app).post('/api/admin/promotion-codes').set(auth()).send({ status: 'active', type: 2, percent: 10, ...body });
  const check = (code: string) => request(app).get(`/api/checkPromo?name=${code}`);

  it('rejects expired and not-yet-started codes', async () => {
    await create({ code: 'OLD10', end_date: '2020-01-01' });
    await create({ code: 'SOON10', start_date: '2999-01-01' });
    await create({ code: 'NOW10', start_date: '2020-01-01', end_date: '2999-01-01' });
    expect((await check('OLD10')).body.status).toBe(false);
    expect((await check('SOON10')).body.status).toBe(false);
    expect((await check('NOW10')).body.status).toBe(true);
  });

  it('stops working after max_use orders', async () => {
    await create({ code: 'ONCE', max_use: 1 });
    expect((await check('ONCE')).body.status).toBe(true);
    await Order.create({ name: 'Guest', total_price: 9, discount_code: 'ONCE' });
    expect((await check('ONCE')).body.status).toBe(false);
  });
});

describe('Location contract used by the Flutter app', () => {
  it('getCitiesByCountryId/:governorateId returns that governorate\'s areas', async () => {
    const gov = await request(app).post('/api/admin/cities').set(auth()).send({ name: 'Gov X', country_id: 1, parent_id: null });
    const area = await request(app).post('/api/admin/cities').set(auth()).send({ name: 'Area Y', country_id: 1, parent_id: gov.body.data.id });
    const res = await request(app).get(`/api/getCitiesByCountryId/${gov.body.data.id}`);
    expect(res.body.status).toBe(true);
    expect(res.body.items.map((c: any) => c.id)).toEqual([area.body.data.id]);
  });
});

describe('Arabic localization for the app', () => {
  it('returns Arabic names when Accept-Language is ar, English otherwise', async () => {
    const gov = await request(app).post('/api/admin/cities').set(auth()).send({ name: 'Hawalli', name_en: 'Hawalli', name_ar: 'حولي', country_id: 7, parent_id: null });
    expect(gov.status).toBe(200);
    const ar = await request(app).get('/api/getGovernoratesByCountryId/7').set('Accept-Language', 'ar');
    const en = await request(app).get('/api/getGovernoratesByCountryId/7').set('Accept-Language', 'en');
    expect(ar.body.items[0].name).toBe('حولي');
    expect(en.body.items[0].name).toBe('Hawalli');
    expect(ar.body.items[0]).toMatchObject({ name_en: 'Hawalli', name_ar: 'حولي' });
  });
});
