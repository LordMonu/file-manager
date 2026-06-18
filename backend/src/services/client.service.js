import { createClientRecord, findClientById, listClientRecords } from '../repositories/client.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { createId } from '../utils/ids.js';

function createSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function createClient({ clientName }) {
  const name = clientName?.trim();
  if (!name) {
    throw new ApiError(400, 'clientName is required');
  }

  return createClientRecord({
    id: createId('clt'),
    name,
    slug: createSlug(name),
    status: 'active',
    createdAt: new Date().toISOString(),
  });
}

export async function listClients() {
  return listClientRecords();
}

export async function listClientsForUser(user) {
  const clients = await listClients();

  if (user?.role === 'admin') {
    return clients;
  }

  return clients.filter((client) => user?.clientIds?.includes(client.id));
}

export async function requireClient(clientId) {
  const client = await findClientById(clientId);

  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  return client;
}
