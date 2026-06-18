import { Router } from 'express';
import { listAuditLogs } from '../controllers/audit.controller.js';
import { requireAdmin } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listAuditLogsSchema } from '../validators/audit.validator.js';

export const auditRouter = Router();

auditRouter.get('/', requireAdmin, validate(listAuditLogsSchema), asyncHandler(listAuditLogs));

