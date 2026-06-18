import { env } from '../config/env.js';
import { authenticateJwtToken } from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';

export async function attachUser(req, _res, next) {
  const role = req.header('x-user-role');
  const userId = req.header('x-user-id');
  const clientIds = parseClientIds(req.header('x-client-ids') || req.header('x-client-id'));
  const bearerToken = parseBearerToken(req.header('authorization'));

  if (env.AUTH_MODE === 'api-key') {
    const authenticated = authenticateApiKey(bearerToken);

    if (!authenticated) {
      return next(new ApiError(401, 'Authentication required'));
    }

    req.user = authenticated;
    return next();
  }

  if (env.AUTH_MODE === 'jwt') {
    const authenticated = await authenticateJwtToken(bearerToken);

    if (!authenticated) {
      return next(new ApiError(401, 'Authentication required'));
    }

    req.user = authenticated;
    return next();
  }

  if (!role && env.NODE_ENV === 'production') {
    return next(new ApiError(401, 'Authentication required'));
  }

  req.user = {
    id: userId || 'dev_admin',
    email: role ? `${role}@dev.local` : 'admin@dev.local',
    name: role ? `${role} user` : 'Dev Admin',
    role: role || 'admin',
    clientIds,
    clientAccess: Object.fromEntries(clientIds.map((clientId) => [clientId, 'manager'])),
    authMode: 'dev',
  };

  return next();
}

function authenticateApiKey(token) {
  if (!token) {
    return null;
  }

  if (env.ADMIN_API_KEY && token === env.ADMIN_API_KEY) {
    return {
      id: 'api_admin',
      email: 'api-admin@system.local',
      name: 'API Admin',
      role: 'admin',
      clientIds: [],
      clientAccess: {},
      authMode: 'api-key',
    };
  }

  if (env.CLIENT_API_KEY && token === env.CLIENT_API_KEY) {
    return {
      id: 'api_client',
      email: 'api-client@system.local',
      name: 'API Client',
      role: 'client',
      clientIds: env.CLIENT_API_KEY_CLIENT_IDS,
      clientAccess: Object.fromEntries(env.CLIENT_API_KEY_CLIENT_IDS.map((clientId) => [clientId, 'manager'])),
      authMode: 'api-key',
    };
  }

  return null;
}

function parseBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    return '';
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function parseClientIds(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
