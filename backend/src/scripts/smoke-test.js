process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'mock';
process.env.DATABASE_URL = process.env.DATABASE_URL || '';
process.env.BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'http://127.0.0.1';
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '200';
process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS = process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS || '3';

const { createApp } = await import('../app.js');
const { closeDatabase } = await import('../config/database.js');
const { getMockObject } = await import('../services/mockStorage.service.js');
const {
  detectFolderFromUpload,
  isBlockedUploadExtension,
  normalizeUploadMimeType,
} = await import('../utils/fileType.js');

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

async function createClient(name) {
  const { body } = await request('/api/v1/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientName: name }),
  });

  return body.client;
}

async function uploadTextFile({ clientId, fileName, text }) {
  const { body: generated } = await request('/api/v1/uploads/generate-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      fileName,
      fileType: 'text/plain',
      fileSize: text.length,
    }),
  });

  await request(`/api/v1/uploads/mock/${generated.file.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: text,
  });

  await request(`/api/v1/uploads/${generated.file.id}/confirm`, {
    method: 'POST',
  });

  return generated.file;
}

async function generateUpload(clientId, fileName) {
  return requestAllowError('/api/v1/uploads/generate-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId,
      fileName,
      fileType: 'text/plain',
      fileSize: 10,
    }),
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  await listening;

  assert(detectFolderFromUpload({ fileName: 'brochure.pdf', mimeType: 'application/octet-stream' }) === 'pdfs', 'expected pdf extension fallback');
  assert(normalizeUploadMimeType({ fileName: 'brochure.pdf', mimeType: '' }) === 'application/pdf', 'expected pdf mime normalization');
  assert(isBlockedUploadExtension('installer.exe') === true, 'expected executable uploads to be blocked');

  const alpha = await createClient('Smoke Alpha');
  const beta = await createClient('Smoke Beta');

  const uploaded = await uploadTextFile({
    clientId: alpha.id,
    fileName: 'smoke-alpha.txt',
    text: 'smoke content',
  });

  const { body: files } = await request(`/api/v1/files?clientId=${alpha.id}&folder=docs&q=smoke`);
  assert(files.files.length === 1, 'expected uploaded file to appear in docs search');
  assert(files.files[0].viewUrl.includes(`/api/v1/files/${uploaded.id}/content`), 'expected protected view URL');

  const allowedView = await requestAllowError(`/api/v1/files/${uploaded.id}/content`, {
    headers: {
      'x-user-role': 'client',
      'x-client-ids': alpha.id,
    },
  });
  assert(allowedView.response.status === 200, 'expected same-client content access');
  assert(allowedView.body === 'smoke content', 'expected downloaded content to match');
  assert(
    String(allowedView.response.headers.get('content-disposition') || '').startsWith('inline'),
    'expected inline disposition for file view',
  );

  const allowedDownload = await requestAllowError(`/api/v1/files/${uploaded.id}/content?download=1`, {
    headers: {
      'x-user-role': 'client',
      'x-client-ids': alpha.id,
    },
  });
  assert(allowedDownload.response.status === 200, 'expected same-client download access');
  assert(allowedDownload.body === 'smoke content', 'expected download content to match');
  assert(
    String(allowedDownload.response.headers.get('content-disposition') || '').startsWith('attachment'),
    'expected attachment disposition for file download',
  );

  const deniedView = await requestAllowError(`/api/v1/files/${uploaded.id}/content`, {
    headers: {
      'x-user-role': 'client',
      'x-client-ids': beta.id,
    },
  });
  assert(deniedView.response.status === 403, 'expected cross-client content access to be denied');

  await request(`/api/v1/files/${uploaded.id}`, {
    method: 'DELETE',
  });

  let removedFromMockStorage = false;
  try {
    getMockObject(uploaded.id);
  } catch {
    removedFromMockStorage = true;
  }
  assert(removedFromMockStorage, 'expected deleted file object to be removed from mock storage');

  const { body: afterDelete } = await request(`/api/v1/files?clientId=${alpha.id}&folder=docs&q=smoke`);
  assert(afterDelete.files.length === 0, 'expected deleted file to be hidden from listings');

  const { body: audit } = await request(`/api/v1/audit-logs?clientId=${alpha.id}&limit=20`);
  const actions = audit.auditLogs.map((log) => log.action);
  for (const action of [
    'client.created',
    'file.upload_url.generated',
    'file.upload.confirmed',
    'file.viewed',
    'file.deleted',
  ]) {
    assert(actions.includes(action), `expected audit action ${action}`);
  }

  const clientAudit = await requestAllowError('/api/v1/audit-logs', {
    headers: {
      'x-user-role': 'client',
      'x-client-ids': alpha.id,
    },
  });
  assert(clientAudit.response.status === 403, 'expected audit logs to be admin-only');

  const me = await request('/api/v1/me', {
    headers: {
      'x-user-role': 'admin',
    },
  });
  assert(me.body.user.authMode === 'dev', 'expected dev auth mode in smoke test');

  const system = await request('/api/v1/system');
  assert(system.body.system.authMode === 'dev', 'expected system auth mode to match test env');
  assert(system.body.system.storageDriver === 'mock', 'expected system storage driver to match test env');
  assert(system.body.system.databaseMode === 'memory', 'expected memory mode without DATABASE_URL');

  await generateUpload(alpha.id, 'limit-1.txt');
  await generateUpload(alpha.id, 'limit-2.txt');

  const rateLimited = await generateUpload(alpha.id, 'limit-3.txt');
  assert(rateLimited.response.status === 429, 'expected upload URL rate limit to reject excess requests');

  const docsPage = await requestAllowError('/docs');
  assert(docsPage.response.status === 200, 'expected docs page to be reachable');
  assert(
    typeof docsPage.body === 'string' && docsPage.body.includes('Manage Files API Docs'),
    'expected docs page to include title',
  );

  const openApi = await request('/openapi.json');
  assert(openApi.body.openapi === '3.1.0', 'expected OpenAPI document version');
  assert(openApi.body.paths?.['/api/v1/files/{fileId}/content'], 'expected files content path in OpenAPI spec');

  console.log('Smoke test passed');
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
