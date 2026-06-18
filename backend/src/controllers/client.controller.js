import { createClient as createClientService, listClientsForUser } from '../services/client.service.js';
import { recordAuditLog } from '../services/audit.service.js';

export async function createClient(req, res) {
  const client = await createClientService(req.body || {});
  await recordAuditLog({
    user: req.user,
    clientId: client.id,
    action: 'client.created',
    entityType: 'client',
    entityId: client.id,
    metadata: {
      name: client.name,
      slug: client.slug,
    },
  });

  res.status(201).json({ client });
}

export async function listClients(req, res) {
  res.json({ clients: await listClientsForUser(req.user) });
}
