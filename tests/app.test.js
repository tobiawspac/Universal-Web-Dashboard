const request = require('supertest');
const app = require('../src/app');
const fs = require('fs');
const path = require('path');

const DEVICES_FILE = path.join(__dirname, '..', 'devices.json');

beforeEach(() => {
  fs.writeFileSync(DEVICES_FILE, '[]', 'utf8');
});

afterAll(() => {
  fs.writeFileSync(DEVICES_FILE, '[]', 'utf8');
});

describe('Health', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Auth (optional)', () => {
  test('POST /api/login with correct password succeeds', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST /api/login with wrong password fails', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('POST /api/logout clears session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/login').send({ password: 'admin123' });
    const res = await agent.post('/api/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Devices', () => {
  test('GET /devices returns array (no auth required)', async () => {
    const res = await request(app).get('/devices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /devices adds a device', async () => {
    const res = await request(app)
      .post('/devices')
      .send({ name: 'Test Router', ip: '192.168.1.1', type: 'router' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Router');
    expect(res.body.ip).toBe('192.168.1.1');
  });

  test('POST /devices rejects missing name/ip', async () => {
    const res = await request(app)
      .post('/devices')
      .send({ name: 'No IP' });
    expect(res.status).toBe(400);
  });

  test('POST /devices rejects invalid IP', async () => {
    const res = await request(app)
      .post('/devices')
      .send({ name: 'Bad IP', ip: '192.168.1.1; rm -rf /' });
    expect(res.status).toBe(400);
  });

  test('POST /devices with _delete removes device', async () => {
    await request(app)
      .post('/devices')
      .send({ name: 'ToDelete', ip: '10.0.0.1' });

    const delRes = await request(app)
      .post('/devices')
      .send({ name: 'ToDelete', ip: '10.0.0.1', _delete: true });
    expect(delRes.status).toBe(200);
    expect(delRes.body.ok).toBe(true);

    const listRes = await request(app).get('/devices');
    expect(listRes.body.find(d => d.ip === '10.0.0.1')).toBeUndefined();
  });
});

describe('Checks', () => {
  test('POST /ping requires host', async () => {
    const res = await request(app)
      .post('/ping')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('host required');
  });

  test('POST /ping/bulk requires hosts array', async () => {
    const res = await request(app)
      .post('/ping/bulk')
      .send({ hosts: 'not-an-array' });
    expect(res.status).toBe(400);
  });
});

describe('History', () => {
  test('GET /history/:host returns data (no auth required)', async () => {
    const res = await request(app).get('/history/127.0.0.1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /summary/:host returns summary (no auth required)', async () => {
    const res = await request(app).get('/summary/127.0.0.1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uptimePercent');
  });
});
