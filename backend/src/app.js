import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { openApiRouter } from './routes/openapi.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { createRateLimiter } from './middleware/rateLimit.middleware.js';
import { ApiError } from './utils/ApiError.js';

function resolveCorsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (env.CORS_ORIGINS.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new ApiError(403, `CORS blocked origin: ${origin}`));
}

export function createApp() {
  const app = express();
  const jsonParser = express.json({ limit: '2mb' });
  const apiRateLimiter = createRateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    keyPrefix: 'api',
  });

  app.use(helmet());
  app.set('trust proxy', 1);
  app.use(
    cors({
      origin: resolveCorsOrigin,
      credentials: true,
    }),
  );
  app.use((req, res, next) => {
    if (req.method === 'PUT' && req.path.startsWith('/api/v1/uploads/mock/')) {
      return next();
    }

    return jsonParser(req, res, next);
  });
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'manage-files-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(openApiRouter);
  app.use('/api/v1', apiRateLimiter);
  app.use('/api/v1', apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
