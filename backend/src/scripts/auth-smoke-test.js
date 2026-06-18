process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'mock';
process.env.DATABASE_URL = process.env.DATABASE_URL || '';
process.env.BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'http://127.0.0.1';
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '200';
process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS = process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS || '20';
process.env.AUTH_MODE = process.env.AUTH_MODE || 'jwt';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-jwt-secret';

const { createApp } = await import('../app.js');
const { closeDatabase } = await import('../config/database.js');

const app = createApp();
const server = app.listen(0);
const listening = new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

function getBaseUrl() {
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, options);
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }

  return { response, body };
}

async function requestAllowError(path, options = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, options);
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function run() {
  await listening;

  const bootstrap = await request('/api/v1/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'supersecret1',
    }),
  });
  assert(bootstrap.body.user.role === 'admin', 'expected bootstrap admin user');

  const duplicateBootstrap = await requestAllowError('/api/v1/auth/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin2@example.com',
      name: 'Second Admin',
      password: 'supersecret1',
    }),
  });
  assert(duplicateBootstrap.response.status === 409, 'expected bootstrap to be blocked after first admin');

  const adminLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'supersecret1',
    }),
  });
  assert(adminLogin.body.user.authMode === 'jwt', 'expected jwt auth mode after login');
  const adminToken = adminLogin.body.token;

  const createdClient = await request('/api/v1/clients', {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({ clientName: 'JWT Smoke Client' }),
  });
  const clientId = createdClient.body.client.id;

  await request('/api/v1/auth/users', {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      email: 'manager@example.com',
      name: 'Manager User',
      password: 'supersecret1',
      role: 'client',
      clientAccess: [{ clientId, role: 'manager' }],
    }),
  });

  await request('/api/v1/auth/users', {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      email: 'viewer@example.com',
      name: 'Viewer User',
      password: 'supersecret1',
      role: 'client',
      clientAccess: [{ clientId, role: 'viewer' }],
    }),
  });

  const managerLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'manager@example.com',
      password: 'supersecret1',
    }),
  });
  const managerToken = managerLogin.body.token;

  const managerMe = await request('/api/v1/me', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(managerMe.body.user.email === 'manager@example.com', 'expected /me to return jwt user email');

  const managerClients = await request('/api/v1/clients', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(managerClients.body.clients.length === 1, 'expected manager to see one client');
  assert(managerClients.body.clients[0].id === clientId, 'expected manager to see assigned client');

  const managerUpload = await request('/api/v1/uploads/generate-upload-url', {
    method: 'POST',
    headers: authHeaders(managerToken),
    body: JSON.stringify({
      clientId,
      fileName: 'jwt-smoke.pdf',
      fileType: 'application/pdf',
      fileSize: 128,
    }),
  });
  assert(managerUpload.body.file.folder === 'pdfs', 'expected manager upload to be allowed');

  const viewerLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'viewer@example.com',
      password: 'supersecret1',
    }),
  });
  const viewerToken = viewerLogin.body.token;

  const viewerUpload = await requestAllowError('/api/v1/uploads/generate-upload-url', {
    method: 'POST',
    headers: authHeaders(viewerToken),
    body: JSON.stringify({
      clientId,
      fileName: 'viewer-smoke.pdf',
      fileType: 'application/pdf',
      fileSize: 128,
    }),
  });
  assert(viewerUpload.response.status === 403, 'expected viewer upload to be denied');

  console.log('Auth smoke test passed');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
    server.close();
  });
