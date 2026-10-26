import request from 'supertest';

// Capture outgoing Mailgun messages instead of sending them.
const sent: any[] = [];
jest.mock('mailgun.js', () => jest.fn().mockImplementation(() => ({
  client: () => ({ messages: { create: async (_domain: string, msg: any) => { sent.push(msg); return { id: 'x' }; } } }),
})));
process.env.MAILGUN_API_KEY = 'test-key';

import { createApp } from '../src/app';
import { sequelize } from '../src/db/sequelize';
import { runSeed } from '../src/db/seed';
import { Product } from '../src/db/models';

let app: ReturnType<typeof createApp>;
let token: string;
const flush = () => new Promise((r) => setTimeout(r, 300));

beforeAll(async () => {
  await runSeed();
  app = createApp();
  token = (await request(app).post('/api/admin/auth/login').send({ email: 'admin@test.local', password: 'Admin@Test1' })).body.data.token;
});
afterAll(async () => { await sequelize.close(); });
beforeEach(() => { sent.length = 0; });

describe('Mailgun emails', () => {
  it('sends a welcome email on sign-up (name is HTML-escaped)', async () => {
    const res = await request(app).post('/api/signUp').type('form').send({
      name: '<b>Ali</b>', email: 'ali@example.com', mobile: '96511111111', password: 'Secret123', confirm_password: 'Secret123',
    });
    expect(res.body.status).toBe(true);
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(['ali@example.com']);
    expect(sent[0].subject).toMatch(/Welcome/);
    expect(sent[0].html).toContain('&lt;b&gt;Ali&lt;/b&gt;');
    expect(sent[0].html).not.toContain('<b>Ali</b>');
  });

  it('sends an order confirmation with items for buy-now, copied to the shop', async () => {
    const product: any = await Product.findOne();
    const res = await request(app).post('/api/checkOutByProductId').set('fcmToken', 'guest-1').type('form').send({
      product_id: product.id, quantity: 2, payment_type: 3, full_name: 'Sara', email: 'sara@example.com', mobile: '96522222222',
    });
    expect(res.body.status).toBe(true);
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(['sara@example.com']);
    expect(sent[0].cc).toEqual(['info@thabayehkom.app']);
    expect(sent[0].subject).toContain(`#${res.body.order.id}`);
    expect(sent[0].html).toContain(product.name);
    expect(sent[0].html).toContain('Cash on Delivery');
  });

  it('emails the customer when the admin changes status, not when it stays the same', async () => {
    const product: any = await Product.findOne();
    const order = await request(app).post('/api/checkOutByProductId').set('fcmToken', 'guest-2').type('form').send({
      product_id: product.id, quantity: 1, payment_type: 3, full_name: 'Omar', email: 'omar@example.com', mobile: '965333',
    });
    await flush();
    sent.length = 0;
    const id = order.body.order.id;
    await request(app).put(`/api/admin/orders/${id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 3 });
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain('Out for Delivery');
    sent.length = 0;
    await request(app).put(`/api/admin/orders/${id}`).set('Authorization', `Bearer ${token}`).send({ status: 3 });
    await flush();
    expect(sent).toHaveLength(0);
  });

  it('skips orders without a valid email', async () => {
    const product: any = await Product.findOne();
    await request(app).post('/api/checkOutByProductId').set('fcmToken', 'guest-3').type('form').send({
      product_id: product.id, quantity: 1, payment_type: 3, full_name: 'NoMail', email: 'not-an-email', mobile: '965444',
    });
    await flush();
    expect(sent).toHaveLength(0);
  });
});
