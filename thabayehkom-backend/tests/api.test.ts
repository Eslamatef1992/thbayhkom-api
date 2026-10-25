import request from 'supertest';
import { createApp } from '../src/app';
import { sequelize } from '../src/db/sequelize';
import { runSeed } from '../src/db/seed';

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await runSeed(); // syncs schema + seeds admin, catalog, settings
  app = createApp();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Mobile contract', () => {
  it('GET /api/getSetting returns envelope with settings', async () => {
    const res = await request(app).get('/api/getSetting');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.code).toBe(200);
    expect(res.body.settings).toBeTruthy();
    expect(res.body.settings).toHaveProperty('paginateTotal');
    expect(res.body.settings).toHaveProperty('is_alowed_login');
  });

  it('GET /api/getCategories returns items array', async () => {
    const res = await request(app).get('/api/getCategories');
    expect(res.body.status).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty('name');
  });

  it('POST /api/getProducts returns items + is_there_more with is_fevorite key', async () => {
    const res = await request(app).post('/api/getProducts').type('form').send({});
    expect(res.body.status).toBe(true);
    expect(res.body).toHaveProperty('is_there_more');
    expect(res.body.items[0]).toHaveProperty('is_fevorite');
    expect(res.body.items[0]).toHaveProperty('url_link');
  });

  it('signUp + login return a user with access_token', async () => {
    const email = `cust${Date.now()}@test.local`;
    const signup = await request(app).post('/api/signUp').type('form').send({
      name: 'Test', email, mobile: '96599999999', password: 'Pass@123', confirm_password: 'Pass@123',
    });
    expect(signup.body.code).toBe(200);
    expect(signup.body.user.access_token).toBeTruthy();

    const login = await request(app).post('/api/login').type('form').send({ email, password: 'Pass@123' });
    expect(login.body.code).toBe(200);
    expect(login.body.user.access_token).toBeTruthy();
  });

  it('guest cart + COD checkout returns an order with null url', async () => {
    const fcm = 'guest-fcm-1';
    await request(app).get('/api/addProductToCart/1').query({ quantity: 2, fcmToken: fcm });
    const cart = await request(app).get('/api/getMyCart').query({ fcmToken: fcm });
    expect(cart.body.MyCart.length).toBeGreaterThan(0);
    expect(cart.body).toHaveProperty('total');

    const checkout = await request(app).post('/api/checkOut').type('form').send({
      fcmToken: fcm, payment_type: 3, full_name: 'Guest', email: 'g@test.local', mobile: '965',
      address_name: 'Home', country_id: 1, city_id: 2,
    });
    expect(checkout.body.status).toBe(true);
    expect(checkout.body.order).toBeTruthy();
    expect(checkout.body.url == null || checkout.body.url === '').toBe(true);
  });
});

describe('Admin dashboard', () => {
  let token: string;

  it('admin can log in', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({
      email: 'admin@test.local', password: 'Admin@Test1',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    token = res.body.data.token;
  });

  it('dashboard stats require auth and return totals', async () => {
    const unauth = await request(app).get('/api/admin/dashboard/stats');
    expect(unauth.status).toBe(401);

    const res = await request(app).get('/api/admin/dashboard/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totals).toHaveProperty('orders');
    expect(res.body.data.totals).toHaveProperty('revenue');
  });

  it('admin can create a category via CRUD', async () => {
    const res = await request(app).post('/api/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Seafood', status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Seafood');
  });

  it('non-admin token is forbidden on admin routes', async () => {
    const email = `cust2${Date.now()}@test.local`;
    const signup = await request(app).post('/api/signUp').type('form').send({
      name: 'C', email, mobile: '965', password: 'Pass@123', confirm_password: 'Pass@123',
    });
    const custToken = signup.body.user.access_token;
    const res = await request(app).get('/api/admin/dashboard/stats').set('Authorization', `Bearer ${custToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Swagger docs', () => {
  it('serves the OpenAPI spec at /swagger.json', async () => {
    const res = await request(app).get('/swagger.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Thabayehkom API');
    // Covers both surfaces.
    expect(res.body.paths).toHaveProperty('/getSetting');
    expect(res.body.paths).toHaveProperty('/checkOut');
    expect(res.body.paths).toHaveProperty('/admin/auth/login');
    expect(res.body.paths).toHaveProperty('/admin/dashboard/stats');
  });

  it('admin resource requests/responses carry concrete examples', async () => {
    const res = await request(app).get('/swagger.json');
    const p = res.body.paths;
    // Create category has a filled request body example.
    const createBody = p['/admin/categories'].post.requestBody.content['application/json'];
    expect(createBody.example).toMatchObject({ name: 'Beef' });
    // And a response data example.
    const createResp = p['/admin/categories'].post.responses['200'].content['application/json'].example;
    expect(createResp.success).toBe(true);
    expect(createResp.data).toMatchObject({ name: 'Beef' });
    // Login shows credentials + token example.
    const loginResp = p['/admin/auth/login'].post.responses['200'].content['application/json'].example;
    expect(loginResp.data).toHaveProperty('token');
    // Mobile getSetting response example is present.
    const setting = p['/getSetting'].get.responses['200'].content['application/json'].example;
    expect(setting.status).toBe(true);
    expect(setting.settings).toHaveProperty('paginateTotal');
  });


  it('serves Swagger UI at /swagger', async () => {
    const res = await request(app).get('/swagger/').redirects(1);
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});

