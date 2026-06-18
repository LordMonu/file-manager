import { env } from '../config/env.js';
import {
  countUserRecords,
  createUserRecord,
  findUserByEmail,
  findUserById,
  listClientMembershipsByUserId,
  listUserRecords,
  replaceClientMembershipRecords,
} from '../repositories/user.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { createId } from '../utils/ids.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signJwt, verifyJwt } from '../utils/jwt.js';
import { requireClient } from './client.service.js';

const allowedMembershipRoles = new Set(['viewer', 'uploader', 'manager']);

export async function bootstrapAdmin({ email, name, password }) {
  if (await countUserRecords()) {
    throw new ApiError(409, 'Bootstrap is already complete');
  }

  const user = await createUserRecord({
    id: createId('usr'),
    email: normalizeEmail(email),
    name: name?.trim() || 'Admin',
    role: 'admin',
    status: 'active',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });

  return buildUserResponse(user, []);
}

export async function login({ email, password }) {
  const user = await findUserByEmail(normalizeEmail(email));

  if (!user || user.status !== 'active' || !verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const memberships = await listClientMembershipsByUserId(user.id);
  const authUser = buildAuthUser(user, memberships, 'jwt');

  return {
    token: signJwt({ sub: user.id }, env.JWT_SECRET, env.JWT_EXPIRES_SECONDS),
    expiresIn: env.JWT_EXPIRES_SECONDS,
    user: authUser,
  };
}

export async function createUser({ email, name, password, role, clientAccess = [] }) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findUserByEmail(normalizedEmail);

  if (existing) {
    throw new ApiError(409, 'A user with that email already exists');
  }

  if (role === 'client' && clientAccess.length === 0) {
    throw new ApiError(400, 'Client users must be assigned to at least one client');
  }

  const memberships = await validateMemberships(clientAccess);
  const user = await createUserRecord({
    id: createId('usr'),
    email: normalizedEmail,
    name: name.trim(),
    role,
    status: 'active',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });

  await replaceClientMembershipRecords(
    user.id,
    memberships.map((membership) => ({
      ...membership,
      id: createId('cusr'),
    })),
  );

  return buildUserResponse(user, memberships);
}

export async function listUsers() {
  const users = await listUserRecords();

  return Promise.all(
    users.map(async (user) => {
      const memberships = await listClientMembershipsByUserId(user.id);
      return buildUserResponse(user, memberships);
    }),
  );
}

export async function authenticateJwtToken(token) {
  if (!token) {
    return null;
  }

  let payload;
  try {
    payload = verifyJwt(token, env.JWT_SECRET);
  } catch {
    return null;
  }

  const user = await findUserById(payload.sub);
  if (!user || user.status !== 'active') {
    return null;
  }

  const memberships = await listClientMembershipsByUserId(user.id);
  return buildAuthUser(user, memberships, 'jwt');
}

function buildAuthUser(user, memberships, authMode) {
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

function buildUserResponse(user, memberships) {
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

async function validateMemberships(clientAccess) {
  const normalized = [];

  for (const membership of clientAccess) {
    const clientId = membership.clientId?.trim();
    const role = membership.role?.trim();

    if (!clientId || !allowedMembershipRoles.has(role)) {
      throw new ApiError(400, 'clientAccess entries must include clientId and role');
    }

    await requireClient(clientId);
    normalized.push({ clientId, role });
  }

  return normalized;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
