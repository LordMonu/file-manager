import { hasDatabase, query } from '../config/database.js';

const clients = new Map();

export async function createClientRecord(client) {
  if (hasDatabase()) {
    const result = await query(
      `
        insert into clients (id, name, slug, status, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $5)
        returning id, name, slug, status, created_at, updated_at
      `,
      [client.id, client.name, client.slug, client.status, client.createdAt],
    );

    return toClient(result.rows[0]);
  }

  clients.set(client.id, client);
  return client;
}

export async function listClientRecords() {
  if (hasDatabase()) {
    const result = await query(
      `
        select id, name, slug, status, created_at, updated_at
        from clients
        where status != 'deleted'
        order by name asc
      `,
    );

    return result.rows.map(toClient);
  }

  return Array.from(clients.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function findClientById(clientId) {
  if (hasDatabase()) {
    const result = await query(
      `
        select id, name, slug, status, created_at, updated_at
        from clients
        where id = $1
        limit 1
      `,
      [clientId],
    );

    return result.rows[0] ? toClient(result.rows[0]) : null;
  }

  return clients.get(clientId) || null;
}

function toClient(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}
