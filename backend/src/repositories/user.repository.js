import { hasDatabase, query, withDatabaseClient } from '../config/database.js';

const users = new Map();
const clientMemberships = new Map();

export async function countUserRecords() {
  if (hasDatabase()) {
    const result = await query('select count(*)::int as total from users');
    return result.rows[0]?.total || 0;
  }

  return users.size;
}

export async function createUserRecord(user) {
  if (hasDatabase()) {
    const result = await query(
      `
        insert into users (id, email, name, role, status, password_hash, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6, $7, $7)
        returning *
      `,
      [user.id, user.email, user.name, user.role, user.status, user.passwordHash, user.createdAt],
    );

    return toUser(result.rows[0]);
  }

  users.set(user.id, user);
  return user;
}

export async function findUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (hasDatabase()) {
    const result = await query('select * from users where lower(email) = $1 limit 1', [normalizedEmail]);
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  return Array.from(users.values()).find((user) => user.email === normalizedEmail) || null;
}

export async function findUserById(userId) {
  if (hasDatabase()) {
    const result = await query('select * from users where id = $1 limit 1', [userId]);
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  return users.get(userId) || null;
}

export async function listUserRecords() {
  if (hasDatabase()) {
    const result = await query('select * from users order by created_at asc');
    return result.rows.map(toUser);
  }

  return Array.from(users.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function replaceClientMembershipRecords(userId, memberships) {
  const normalizedMemberships = memberships.map((membership) => ({
    id: membership.id,
    clientId: membership.clientId,
    role: membership.role,
  }));

  if (hasDatabase()) {
    await withDatabaseClient(async (client) => {
      await client.query('delete from client_users where user_id = $1', [userId]);

      for (const membership of normalizedMemberships) {
        await client.query(
          `
            insert into client_users (id, client_id, user_id, role, created_at)
            values ($1, $2, $3, $4, now())
          `,
          [membership.id, membership.clientId, userId, membership.role],
        );
      }
    });

    return listClientMembershipsByUserId(userId);
  }

  clientMemberships.set(userId, normalizedMemberships);
  return normalizedMemberships;
}

export async function listClientMembershipsByUserId(userId) {
  if (hasDatabase()) {
    const result = await query(
      `
        select client_id, role
        from client_users
        where user_id = $1
        order by created_at asc
      `,
      [userId],
    );

    return result.rows.map((row) => ({
      clientId: row.client_id,
      role: row.role,
    }));
  }

  return clientMemberships.get(userId) || [];
}

function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}
