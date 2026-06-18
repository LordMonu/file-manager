import { Router } from 'express';

import { attachUser } from '../middleware/auth.middleware.js';
import { auditRouter } from './audit.routes.js';
import { authProtectedRouter, authPublicRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { meRouter } from './me.routes.js';
import { systemRouter } from './system.routes.js';
import { clientRouter } from './client.routes.js';
import { folderRouter } from './folder.routes.js';
import { fileRouter } from './file.routes.js';
import { uploadRouter } from './upload.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/system', systemRouter);
apiRouter.use('/auth', authPublicRouter);
apiRouter.use(attachUser);
apiRouter.use('/auth', authProtectedRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/clients', clientRouter);
apiRouter.use('/folders', folderRouter);
apiRouter.use('/files', fileRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/audit-logs', auditRouter);
