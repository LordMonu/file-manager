import { createAuditLogRecord, listAuditLogRecords } from '../repositories/audit.repository.js';
import { createId } from '../utils/ids.js';

export async function recordAuditLog({ user, clientId, action, entityType, entityId, metadata }) {
  return createAuditLogRecord({
    id: createId('aud'),
    actorUserId: null,
    clientId: clientId || null,
    action,
    entityType,
    entityId: entityId || null,
    metadata: {
      ...(metadata || {}),
      actor: user
        ? {
            id: user.id,
            role: user.role,
            clientIds: user.clientIds || [],
          }
        : null,
    },
    createdAt: new Date().toISOString(),
  });
}

export async function listAuditLogs({ clientId, action, page, limit }) {
  const result = await listAuditLogRecords({ clientId, action, page, limit });

  return {
    auditLogs: result.records,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasMore: result.hasMore,
    },
  };
}
