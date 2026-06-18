import pg from 'pg';

import { env } from './env.js';

let pool;

export function hasDatabase() {
  return Boolean(env.DATABASE_URL);
}

export function getPool() {
  if (!hasDatabase()) {
    return null;
  }

  if (!pool) {
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  return pool;
}

export async function query(text, params = []) {
  const activePool = getPool();

  if (!activePool) {
    throw new Error('DATABASE_URL is not configured');
  }

  return activePool.query(text, params);
}

export async function withDatabaseClient(callback) {
  const activePool = getPool();

  if (!activePool) {
    throw new Error('DATABASE_URL is not configured');
  }

  const client = await activePool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
