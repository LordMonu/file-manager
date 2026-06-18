import { Router } from 'express';
import { listFolders } from '../controllers/folder.controller.js';
import { requireClientAccess } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listFoldersSchema } from '../validators/folder.validator.js';

export const folderRouter = Router();

folderRouter.get(
  '/',
  validate(listFoldersSchema),
  requireClientAccess('query'),
  asyncHandler(listFolders),
);
