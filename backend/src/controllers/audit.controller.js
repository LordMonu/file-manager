import { listAuditLogs as listAuditLogsService } from '../services/audit.service.js';

export async function listAuditLogs(req, res) {
  const { clientId, action, page, limit } = req.query;
  const result = await listAuditLogsService({ clientId, action, page, limit });

  res.json(result);
}

