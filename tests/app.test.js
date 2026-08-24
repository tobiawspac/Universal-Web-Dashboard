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

async function login(agent) {
  const res = await agent
    .post('/api/login')
    .send({ password: 'admin123' });
  return res;
}

describe('Auth', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /api/check-auth returns unauthenticated', async () => {
    const res = await request(app).get('/api/check-auth');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
  });

  test('POST /api/login with correct password succeeds', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('POST /api/login with wrong password fails', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid password');
  });

  test('POST /api/logout clears session', async () => {
    const agent = request.agent(app);
    await login(agent);
    const res = await agent.post('/api/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Devices CRUD', () => {
  test('GET /devices requires auth', async () => {
    const res = await request(app).get('/devices');
    expect(res.status).toBe(401);
  });

  test('POST /devices adds a device when authenticated', async () => {
    const agent = request.agent(app);
    await login(agent);

    const res = await agent
      .post('/devices')
      .send({ name: 'Test Router', ip: '192.168.1.1', type: 'router' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Router');
    expect(res.body.ip).toBe('192.168.1.1');
  });

  test('POST /devices rejects missing name/ip', async () => {
    const agent = request.agent(app);
    await login(agent);

    const res = await agent
      .post('/devices')
      .send({ name: 'No IP' });
    expect(res.status).toBe(400);
  });

  test('POST /devices rejects invalid IP', async () => {
    const agent = request.agent(app);
    await login(agent);

    const res = await agent
      .post('/devices')
      .send({ name: 'Bad IP', ip: '192.168.1.1; rm -rf /' });
    expect(res.status).toBe(400);
  });

  test('POST /devices with _delete removes device', async () => {
    const agent = request.agent(app);
    await login(agent);

    await agent
      .post('/devices')
      .send({ name: 'ToDelete', ip: '10.0.0.1' });

    const delRes = await agent
      .post('/devices')
      .send({ name: 'ToDelete', ip: '10.0.0.1', _delete: true });
    expect(delRes.status).toBe(200);
    expect(delRes.body.ok).toBe(true);

    const listRes = await agent.get('/devices');
    expect(listRes.body.find(d => d.ip === '10.0.0.1')).toBeUndefined();
  });
});

describe('Checks', () => {
  test('POST /check requires auth', async () => {
    const res = await request(app)
      .post('/check')
      .send({ host: '127.0.0.1' });
    expect(res.status).toBe(401);
  });

  test('POST /ping requires host', async () => {
    const agent = request.agent(app);
    await login(agent);

    const res = await agent
      .post('/ping')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('host required');
  });

  test('POST /ping/bulk requires hosts array', async () => {
    const agent = request.agent(app);
    await login(agent);

    const res = await agent
      .post('/ping/bulk')
      .send({ hosts: 'not-an-array' });
    expect(res.status).toBe(400);
  });
});

describe('History', () => {
  test('GET /history/:host requires auth', async () => {
    const res = await request(app).get('/history/127.0.0.1');
    expect(res.status).toBe(401);
  });

  test('GET /summary/:host requires auth', async () => {
    const res = await request(app).get('/summary/127.0.0.1');
    expect(res.status).toBe(401);
  });
});
