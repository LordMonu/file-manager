import { hasDatabase, query } from '../config/database.js';

const auditLogs = [];

export async function createAuditLogRecord(log) {
  if (hasDatabase()) {
    const result = await query(
      `
        insert into audit_logs (
          id,
          actor_user_id,
          client_id,
          action,
          entity_type,
          entity_id,
          metadata,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning *
      `,
      [
        log.id,
        log.actorUserId,
        log.clientId,
        log.action,
        log.entityType,
        log.entityId,
        JSON.stringify(log.metadata || {}),
        log.createdAt,
      ],
    );

    return toAuditLog(result.rows[0]);
  }

  auditLogs.push(log);
  return log;
}

export async function listAuditLogRecords({ clientId, action, page = 1, limit = 50 }) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  if (hasDatabase()) {
    const params = [];
    const filters = [];

    if (clientId) {
      params.push(clientId);
      filters.push(`client_id = $${params.length}`);
    }

    if (action) {
      params.push(action);
      filters.push(`action = $${params.length}`);
    }

    const where = filters.length ? `where ${filters.join(' and ')}` : '';
    const countResult = await query(`select count(*)::int as total from audit_logs ${where}`, params);
    const total = countResult.rows[0]?.total || 0;

    params.push(safeLimit, offset);
    const result = await query(
      `
        select *
        from audit_logs
        ${where}
        order by created_at desc
        limit $${params.length - 1}
        offset $${params.length}
      `,
      params,
    );

    return {
      records: result.rows.map(toAuditLog),
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: offset + result.rows.length < total,
    };
  }

  const filtered = auditLogs
    .filter((log) => !clientId || log.clientId === clientId)
    .filter((log) => !action || log.action === action)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    records: filtered.slice(offset, offset + safeLimit),
    total: filtered.length,
    page: safePage,
    limit: safeLimit,
    hasMore: offset + safeLimit < filtered.length,
  };
}

function toAuditLog(row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    clientId: row.client_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata || {},
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
}

