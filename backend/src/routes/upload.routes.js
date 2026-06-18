import { Router } from 'express';
import express from 'express';
import {
  confirmUploadController,
  generateUploadUrl,
  getMockUploadController,
  putMockUploadController,
} from '../controllers/upload.controller.js';
import { env } from '../config/env.js';
import { requireClientAccess } from '../middleware/permission.middleware.js';
import { createRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { confirmUploadSchema, generateUploadUrlSchema } from '../validators/upload.validator.js';

export const uploadRouter = Router();
const uploadRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.UPLOAD_RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: 'upload',
});

uploadRouter.put(
  '/mock/:fileId',
  express.raw({ type: '*/*', limit: `${env.MAX_UPLOAD_SIZE_MB}mb` }),
  asyncHandler(putMockUploadController),
);
uploadRouter.get('/mock/:fileId', asyncHandler(getMockUploadController));
uploadRouter.post(
  '/generate-upload-url',
  uploadRateLimiter,
  validate(generateUploadUrlSchema),
  requireClientAccess('body'),
  asyncHandler(generateUploadUrl),
);
uploadRouter.post('/:fileId/confirm', validate(confirmUploadSchema), asyncHandler(confirmUploadController));
