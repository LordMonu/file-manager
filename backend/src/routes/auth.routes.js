import { Router } from 'express';
import {
  bootstrap,
  createUserController,
  listUsersController,
  loginController,
} from '../controllers/auth.controller.js';
import { requireAdmin } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  bootstrapSchema,
  createUserSchema,
  loginSchema,
} from '../validators/auth.validator.js';

export const authPublicRouter = Router();
export const authProtectedRouter = Router();

authPublicRouter.post('/bootstrap', validate(bootstrapSchema), asyncHandler(bootstrap));
authPublicRouter.post('/login', validate(loginSchema), asyncHandler(loginController));

authProtectedRouter.get('/users', requireAdmin, asyncHandler(listUsersController));
authProtectedRouter.post('/users', requireAdmin, validate(createUserSchema), asyncHandler(createUserController));
