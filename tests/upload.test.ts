import request from 'supertest';
import { createApp } from '../src/app';
import { sequelize } from '../src/db/sequelize';
import { runSeed } from '../src/db/seed';

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await runSeed();
  app = createApp();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Uploads', () => {
  let token: string;

  it('user can log in for upload', async () => {
    const email = `up${Date.now()}@test.local`;
    const signup = await request(app).post('/api/signUp').type('form').send({
      name: 'Up', email, mobile: '965', password: 'Pass@123', confirm_password: 'Pass@123',
    });
    token = signup.body.user.access_token;
    expect(token).toBeTruthy();
  });

  it('rejects unauthenticated upload', async () => {
    const res = await request(app).post('/api/upload/single').attach('file', Buffer.from('x'), 'x.png');
    expect(res.body.code).toBe(401);
  });

  it('uploads a single image and returns a url, then deletes it', async () => {
    const png = Buffer.from('89504e470d0a1a0a', 'hex'); // minimal PNG signature
    const up = await request(app)
      .post('/api/upload/single')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', png, { filename: 'test.png', contentType: 'image/png' });
    expect(up.body.status).toBe(true);
    expect(up.body.url).toContain('/uploads/');
    expect(up.body.filename).toBeTruthy();

    // File is served statically.
    const served = await request(app).get(`/uploads/${up.body.filename}`);
    expect(served.status).toBe(200);

    // Delete by url.
    const del = await request(app)
      .post('/api/upload/delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: up.body.url });
    expect(del.body.status).toBe(true);

    // Deleting again → not found.
    const del2 = await request(app)
      .post('/api/upload/delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: up.body.filename });
    expect(del2.body.code).toBe(404);
  });

  it('rejects non-image files', async () => {
    const res = await request(app)
      .post('/api/upload/single')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });
    // multer fileFilter error → envelope 500 via error handler
    expect(res.body.status).toBe(false);
  });
});
