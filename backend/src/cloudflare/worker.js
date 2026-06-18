import { createId } from '../utils/ids.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signJwt, verifyJwt } from '../utils/jwt.js';

const freeStore = globalThis.__manageFilesFreeStore || {
  users: new Map(),
  memberships: new Map(),
  clients: new Map(),
  folders: new Map(),
  files: new Map(),
  blobs: new Map(),
  auditLogs: [],
};

globalThis.__manageFilesFreeStore = freeStore;

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function html(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'text/html; charset=utf-8');

  return new Response(body, {
    ...init,
    headers,
  });
}

export default {
  async fetch(request, envBindings) {
    globalThis.__ENV__ = envBindings || {};
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return corsPreflight(request);
    }

    const body = await readJsonBody(request);

    if (url.pathname === '/health' || url.pathname === '/api/v1/health') {
      return withCors(json({
        ok: true,
        service: 'manage-files-backend',
        timestamp: new Date().toISOString(),
      }), request);
    }

    if (url.pathname === '/api/v1/system') {
      return withCors(json({ system: getRuntimeSystemInfo() }), request);
    }

    if (url.pathname === '/api/v1/auth/bootstrap' && request.method === 'POST') {
      return withCors(await handleBootstrap(body), request);
    }

    if (url.pathname === '/api/v1/auth/login' && request.method === 'POST') {
      return withCors(await handleLogin(body), request);
    }

    if (url.pathname === '/api/v1/me' && request.method === 'GET') {
      return withCors(await handleMe(request), request);
    }

    if (url.pathname === '/api/v1/auth/users' && request.method === 'GET') {
      return withCors(handleListUsers(request), request);
    }

    if (url.pathname === '/api/v1/auth/users' && request.method === 'POST') {
      return withCors(await handleCreateUser(body, request), request);
    }

    if (url.pathname === '/api/v1/clients' && request.method === 'GET') {
      return withCors(json({ clients: listVisibleClients(request) }), request);
    }

    if (url.pathname === '/api/v1/clients' && request.method === 'POST') {
      return withCors(await handleCreateClient(request, body), request);
    }

    if (url.pathname === '/api/v1/folders' && request.method === 'GET') {
      return withCors(handleListFolders(url, request), request);
    }

    if (url.pathname === '/api/v1/files' && request.method === 'GET') {
      return withCors(handleListFiles(url, request), request);
    }

    if (url.pathname === '/api/v1/audit-logs' && request.method === 'GET') {
      return withCors(handleListAuditLogs(url, request), request);
    }

    if (url.pathname === '/api/v1/uploads/generate-upload-url' && request.method === 'POST') {
      return withCors(await handleGenerateUploadUrl(body, request), request);
    }

    const confirmMatch = url.pathname.match(/^\/api\/v1\/uploads\/([^/]+)\/confirm$/);
    if (confirmMatch && request.method === 'POST') {
      return withCors(await handleConfirmUpload(confirmMatch[1], request), request);
    }

    const mockUploadMatch = url.pathname.match(/^\/api\/v1\/uploads\/mock\/([^/]+)$/);
    if (mockUploadMatch && request.method === 'PUT') {
      return withCors(await handleMockUpload(mockUploadMatch[1], request), request);
    }

    const contentMatch = url.pathname.match(/^\/api\/v1\/files\/([^/]+)\/content$/);
    if (contentMatch && request.method === 'GET') {
      return withCors(handleFileContent(contentMatch[1], url), request);
    }

    if (url.pathname === '/openapi.json') {
      return withCors(json(buildOpenApiDocument(url.origin)), request);
    }

    if (url.pathname === '/docs') {
      const specUrl = `${url.origin}/openapi.json`;
      return withCors(
        html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Manage Files API Docs</title>
  </head>
  <body>
    <main style="font-family: system-ui, sans-serif; padding: 24px;">
      <h1>Manage Files API Docs</h1>
      <p>OpenAPI spec: <a href="${specUrl}">${specUrl}</a></p>
      <pre id="spec">Loading spec...</pre>
    </main>
    <script>
      fetch(${JSON.stringify(specUrl)})
        .then((response) => response.json())
        .then((spec) => {
          document.getElementById('spec').textContent = JSON.stringify(spec, null, 2);
        })
        .catch((error) => {
          document.getElementById('spec').textContent = 'Failed to load spec: ' + error.message;
        });
    </script>
  </body>
</html>`),
        request,
      );
    }

    return withCors(json(
      {
        ok: false,
        error: 'Not Found',
      },
      { status: 404 },
    ), request);
  },
};

async function handleBootstrap(body) {
  if (freeStore.users.size > 0) {
    return json({ ok: false, error: 'Bootstrap is already complete' }, { status: 409 });
  }

  const email = normalizeEmail(body?.email);
  const name = body?.name?.trim();
  const password = body?.password;

  if (!email || !name || !password || String(password).length < 8) {
    return json({ ok: false, error: 'Invalid bootstrap payload' }, { status: 400 });
  }

  const user = {
    id: createId('usr'),
    email,
    name,
    role: 'admin',
    status: 'active',
    passwordHash: hashPassword(String(password)),
    createdAt: new Date().toISOString(),
  };

  freeStore.users.set(user.id, user);
  freeStore.memberships.set(user.id, []);
  pushAuditLog({
    clientId: null,
    action: 'auth.bootstrap',
    entityType: 'user',
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  return json({ user: buildUserResponse(user, [], 'jwt') }, { status: 201 });
}

async function handleLogin(body) {
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  const user = Array.from(freeStore.users.values()).find((record) => record.email === email);

  if (!user || user.status !== 'active' || !verifyPassword(String(password || ''), user.passwordHash)) {
    return json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
  }

  const memberships = freeStore.memberships.get(user.id) || [];
  const token = signJwt({ sub: user.id }, env.JWT_SECRET || 'free-worker-secret', Number(env.JWT_EXPIRES_SECONDS) || 3600);
  pushAuditLog({
    clientId: null,
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  return json({
    token,
    expiresIn: 3600,
    user: buildUserResponse(user, memberships, 'jwt'),
  });
}

async function handleMe(request) {
  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token) {
    return json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyJwt(token, env.JWT_SECRET || 'free-worker-secret');
  } catch {
    return json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const user = freeStore.users.get(payload.sub);
  if (!user) {
    return json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const memberships = freeStore.memberships.get(user.id) || [];
  return json({ user: buildUserResponse(user, memberships, 'jwt') });
}

async function handleCreateClient(request, body) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== 'admin') {
    return json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }

  const clientName = body?.clientName?.trim();
  if (!clientName) {
    return json({ ok: false, error: 'clientName is required' }, { status: 400 });
  }

  const client = {
    id: createId('clt'),
    name: clientName,
    slug: clientName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'),
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  freeStore.clients.set(client.id, client);
  freeStore.folders.set(client.id, [
    { name: 'images', label: 'Images', fileCount: 0 },
    { name: 'videos', label: 'Videos', fileCount: 0 },
    { name: 'pdfs', label: 'PDFs', fileCount: 0 },
    { name: 'docs', label: 'Docs', fileCount: 0 },
  ]);
  pushAuditLog({
    clientId: client.id,
    action: 'client.created',
    entityType: 'client',
    entityId: client.id,
    metadata: { name: client.name, slug: client.slug },
  });

  return json({ client }, { status: 201 });
}

function handleListFolders(url, request) {
  const clientId = url.searchParams.get('clientId');
  if (!clientId) {
    return json({ ok: false, error: 'clientId is required' }, { status: 400 });
  }

  const user = parseAuthUser(request);
  if (!canAccessClient(user, clientId)) {
    return json({ ok: false, error: 'You do not have access to this client' }, { status: 403 });
  }

  const folders = freeStore.folders.get(clientId) || [];
  return json({ folders });
}

function handleListUsers(request) {
  const user = parseAuthUser(request);
  if (!user || user.role !== 'admin') {
    return json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }

  const users = Array.from(freeStore.users.values()).map((record) => buildUserResponse(record, freeStore.memberships.get(record.id) || [], 'jwt'))
    .map((item) => ({
      ...item,
      status: freeStore.users.get(item.id)?.status || 'active',
      createdAt: freeStore.users.get(item.id)?.createdAt || new Date().toISOString(),
    }));

  return json({ users });
}

function handleListFiles(url, request) {
  const clientId = url.searchParams.get('clientId');
  if (!clientId) {
    return json({ ok: false, error: 'clientId is required' }, { status: 400 });
  }

  const user = parseAuthUser(request);
  if (!canAccessClient(user, clientId)) {
    return json({ ok: false, error: 'You do not have access to this client' }, { status: 403 });
  }

  const folder = url.searchParams.get('folder');
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const files = Array.from(freeStore.files.values())
    .filter((file) => file.clientId === clientId)
    .filter((file) => !folder || file.folder === folder)
    .filter((file) => file.status !== 'deleted')
    .filter((file) => {
      if (!q) return true;
      return file.originalName.toLowerCase().includes(q) || file.mimeType.toLowerCase().includes(q);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((file) => toFileResponse(file));

  return json({
    files,
    pagination: {
      page: 1,
      limit: files.length,
      total: files.length,
      hasMore: false,
    },
  });
}

async function handleGenerateUploadUrl(body, request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const clientId = body?.clientId?.trim();
  const fileName = body?.fileName?.trim();
  const fileType = body?.fileType?.trim() || 'application/octet-stream';
  const fileSize = Number(body?.fileSize || 0) || null;

  if (!clientId || !fileName) {
    return json({ ok: false, error: 'clientId and fileName are required' }, { status: 400 });
  }

  const fileId = createId('file');
  const normalizedFileType = normalizeMimeType(fileType, fileName);
  const folder = detectFolder(normalizedFileType, fileName);
  const storedName = `${fileId}-${sanitizeFileName(fileName)}`;
  const objectKey = `clients/${clientId}/${folder}/${storedName}`;

  const file = {
    id: fileId,
    clientId,
    uploadedBy: user.id,
    originalName: fileName,
    storedName,
    mimeType: normalizedFileType,
    folder,
    objectKey,
    publicUrl: `${request.url.split('/api/v1/')[0]}api/v1/files/${fileId}/content`,
    sizeBytes: fileSize,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    uploadedAt: null,
    deletedAt: null,
  };

  freeStore.files.set(fileId, file);
  pushAuditLog({
    clientId,
    action: 'file.upload_url.generated',
    entityType: 'file',
    entityId: fileId,
    metadata: {
      folder,
      originalName: fileName,
      objectKey,
    },
  });

  return json({
    file: toPendingFileResponse(file),
    upload: {
      uploadUrl: `${request.url.split('/api/v1/')[0]}api/v1/uploads/mock/${fileId}`,
      expiresIn: 900,
      publicUrl: file.publicUrl,
    },
  }, { status: 201 });
}

async function handleCreateUser(body, request) {
  const user = parseAuthUser(request);
  if (!user || user.role !== 'admin') {
    return json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }

  const email = normalizeEmail(body?.email);
  const name = body?.name?.trim();
  const password = body?.password;
  const role = body?.role;
  const clientAccess = Array.isArray(body?.clientAccess) ? body.clientAccess : [];

  if (!email || !name || !password || String(password).length < 8 || !['admin', 'client'].includes(role)) {
    return json({ ok: false, error: 'Invalid user payload' }, { status: 400 });
  }

  if (role === 'client' && clientAccess.length === 0) {
    return json({ ok: false, error: 'Client users must be assigned to at least one client' }, { status: 400 });
  }

  if (Array.from(freeStore.users.values()).some((record) => record.email === email)) {
    return json({ ok: false, error: 'A user with that email already exists' }, { status: 409 });
  }

  const memberships = [];
  for (const entry of clientAccess) {
    const clientId = String(entry?.clientId || '').trim();
    const accessRole = String(entry?.role || '').trim();
    if (!clientId || !['viewer', 'uploader', 'manager'].includes(accessRole)) {
      return json({ ok: false, error: 'Invalid clientAccess entry' }, { status: 400 });
    }

    if (!freeStore.clients.has(clientId)) {
      return json({ ok: false, error: 'Client not found' }, { status: 404 });
    }

    memberships.push({ clientId, role: accessRole });
  }

  const record = {
    id: createId('usr'),
    email,
    name,
    role,
    status: 'active',
    passwordHash: hashPassword(String(password)),
    createdAt: new Date().toISOString(),
  };

  freeStore.users.set(record.id, record);
  freeStore.memberships.set(record.id, memberships);
  pushAuditLog({
    clientId: memberships[0]?.clientId || null,
    action: 'auth.user.created',
    entityType: 'user',
    entityId: record.id,
    metadata: { email: record.email, role: record.role },
  });

  return json({
    user: buildManagedUserResponse(record, memberships),
  }, { status: 201 });
}

async function handleConfirmUpload(fileId, request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const file = freeStore.files.get(fileId);
  if (!file) {
    return json({ ok: false, error: 'File not found' }, { status: 404 });
  }

  file.status = 'uploaded';
  file.uploadedAt = new Date().toISOString();
  file.updatedAt = new Date().toISOString();
  freeStore.files.set(fileId, file);
  pushAuditLog({
    clientId: file.clientId,
    action: 'file.upload.confirmed',
    entityType: 'file',
    entityId: file.id,
    metadata: {
      folder: file.folder,
      originalName: file.originalName,
      objectKey: file.objectKey,
    },
  });

  return json({ file: toFileResponse(file) });
}

async function handleMockUpload(fileId, request) {
  const file = freeStore.files.get(fileId);
  if (!file) {
    return json({ ok: false, error: 'File not found' }, { status: 404 });
  }

  const buffer = await request.arrayBuffer();
  freeStore.blobs.set(fileId, {
    buffer,
    contentType: request.headers.get('content-type') || file.mimeType || 'application/octet-stream',
  });

  return new Response(null, { status: 204 });
}

function handleFileContent(fileId, url) {
  const file = freeStore.files.get(fileId);
  if (!file || file.status === 'deleted') {
    return json({ ok: false, error: 'File not found' }, { status: 404 });
  }

  const blob = freeStore.blobs.get(fileId);
  if (!blob) {
    return json({ ok: false, error: 'File content not found' }, { status: 404 });
  }

  const download = url.searchParams.get('download') === '1';
  return new Response(blob.buffer, {
    status: 200,
    headers: {
      'Content-Type': blob.contentType || file.mimeType || 'application/octet-stream',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${sanitizeFileName(file.originalName)}"`,
    },
  });
}

function handleListAuditLogs(url, request) {
  const user = parseAuthUser(request);
  if (!user || user.role !== 'admin') {
    return json({ ok: false, error: 'Admin access required' }, { status: 403 });
  }

  const clientId = url.searchParams.get('clientId');
  const action = url.searchParams.get('action');
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 100);
  const filtered = freeStore.auditLogs
    .filter((log) => !clientId || log.clientId === clientId)
    .filter((log) => !action || log.action === action)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const offset = (page - 1) * limit;
  const records = filtered.slice(offset, offset + limit);

  return json({
    auditLogs: records,
    pagination: {
      page,
      limit,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
    },
  });
}

function listVisibleClients(request) {
  const user = parseAuthUser(request);
  const clients = Array.from(freeStore.clients.values());

  if (user?.role === 'admin') {
    return clients;
  }

  return clients.filter((client) => user?.clientIds?.includes(client.id));
}

function canAccessClient(user, clientId) {
  if (!user || !clientId) return false;
  if (user.role === 'admin') return true;
  return user.clientIds?.includes(clientId);
}

function buildUserResponse(user, memberships, authMode = 'jwt') {
  const clientAccess = Object.fromEntries(memberships.map((membership) => [membership.clientId, membership.role]));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientIds: memberships.map((membership) => membership.clientId),
    clientAccess,
    authMode,
  };
}

function buildManagedUserResponse(user, memberships) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    clientIds: memberships.map((membership) => membership.clientId),
    clientAccess: memberships,
    createdAt: user.createdAt,
  };
}

function toPendingFileResponse(file) {
  return {
    id: file.id,
    clientId: file.clientId,
    originalName: file.originalName,
    storedName: file.storedName,
    folder: file.folder,
    objectKey: file.objectKey,
    status: file.status,
  };
}

function toFileResponse(file) {
  return {
    id: file.id,
    clientId: file.clientId,
    name: file.originalName,
    mimeType: file.mimeType,
    folder: file.folder,
    sizeBytes: file.sizeBytes,
    status: file.status,
    objectKey: file.objectKey,
    viewUrl: file.publicUrl,
    downloadUrl: `${file.publicUrl}?download=1`,
    createdAt: file.createdAt,
    uploadedAt: file.uploadedAt,
  };
}

async function readJsonBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return null;
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function authenticateRequest(request) {
  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token) return null;

  let payload;
  try {
    payload = verifyJwt(token, 'free-worker-secret');
  } catch {
    return null;
  }

  const user = freeStore.users.get(payload.sub);
  if (!user) return null;

  const memberships = freeStore.memberships.get(user.id) || [];
  return buildUserResponse(user, memberships, 'jwt');
}

function parseAuthUser(request) {
  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token) return null;

  try {
    const payload = verifyJwt(token, getRuntimeEnv().JWT_SECRET || 'free-worker-secret');
    const user = freeStore.users.get(payload.sub);
    if (!user) return null;
    const memberships = freeStore.memberships.get(user.id) || [];
    return buildUserResponse(user, memberships, 'jwt');
  } catch {
    return null;
  }
}

function parseBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    return '';
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function withCors(response, request) {
  const origin = request.headers.get('origin');
  const allowed = getAllowedOrigin(origin);
  if (!allowed) return response;

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', allowed);
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.append('Vary', 'Origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function corsPreflight(request) {
  const origin = request.headers.get('origin');
  const allowed = getAllowedOrigin(origin);
  if (!allowed) {
    return new Response(null, { status: 204 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      Vary: 'Origin',
    },
  });
}

function getAllowedOrigin(origin) {
  if (!origin) return '';
  const allowed = String(getRuntimeEnv().CORS_ORIGIN || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : '';
}

function pushAuditLog({ clientId, action, entityType, entityId, metadata }) {
  freeStore.auditLogs.push({
    id: createId('aud'),
    actorUserId: null,
    clientId: clientId || null,
    action,
    entityType,
    entityId: entityId || null,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  });
}

function sanitizeFileName(fileName) {
  return String(fileName || '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

function normalizeMimeType(fileType, fileName) {
  if (fileType && fileType !== 'application/octet-stream') return fileType;

  const extension = String(fileName || '').toLowerCase().split('.').pop();
  if (extension === 'pdf') return 'application/pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension)) return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  if (['mp4', 'webm', 'mov'].includes(extension)) return `video/${extension}`;
  return 'application/octet-stream';
}

function detectFolder(mimeType, fileName) {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType === 'application/pdf') return 'pdfs';
  const ext = String(fileName || '').toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdfs';
  return 'docs';
}

function getRuntimeEnv() {
  return globalThis.__ENV__ || {};
}

function getRuntimeSystemInfo() {
  const env = getRuntimeEnv();
  return {
    authMode: env.AUTH_MODE || 'jwt',
    storageDriver: env.STORAGE_DRIVER || 'mock',
    databaseMode: 'memory',
    maxUploadSizeMb: Number(env.MAX_UPLOAD_SIZE_MB) || 200,
    folders: ['images', 'videos', 'pdfs', 'docs'],
  };
}

function buildOpenApiDocument(serverUrl) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Manage Files API',
      version: '1.0.0',
      description: 'Free deployment Worker API for client creation, upload URL generation, folder browsing, protected file access, and audit logging.',
    },
    servers: [{ url: serverUrl, description: 'Worker base URL' }],
    paths: {
      '/api/v1/health': { get: { summary: 'Health check' } },
      '/api/v1/auth/bootstrap': { post: { summary: 'Create initial admin user' } },
      '/api/v1/auth/login': { post: { summary: 'Log in a user' } },
      '/api/v1/clients': { get: { summary: 'List clients' }, post: { summary: 'Create client' } },
      '/api/v1/folders': { get: { summary: 'List folders' } },
      '/api/v1/files': { get: { summary: 'List files' } },
      '/api/v1/uploads/generate-upload-url': { post: { summary: 'Generate upload URL' } },
      '/api/v1/uploads/{fileId}/confirm': { post: { summary: 'Confirm upload' } },
      '/api/v1/files/{fileId}/content': { get: { summary: 'Fetch file content' } },
    },
  };
}
