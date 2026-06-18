import { Router } from 'express';
import { deleteFile, getFile, getFileContent, listFiles } from '../controllers/file.controller.js';
import { requireClientAccess } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getFileSchema, listFilesSchema } from '../validators/file.validator.js';

export const fileRouter = Router();

fileRouter.get(
  '/',
  validate(listFilesSchema),
  requireClientAccess('query'),
  asyncHandler(listFiles),
);
fileRouter.get('/:fileId/content', validate(getFileSchema), asyncHandler(getFileContent));
fileRouter.get('/:fileId', validate(getFileSchema), asyncHandler(getFile));
fileRouter.delete('/:fileId', validate(getFileSchema), asyncHandler(deleteFile));
