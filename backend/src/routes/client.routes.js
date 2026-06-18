import { Router } from 'express';
import { createClient, listClients } from '../controllers/client.controller.js';
import { requireAdmin } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createClientSchema } from '../validators/client.validator.js';

export const clientRouter = Router();

clientRouter.get('/', asyncHandler(listClients));
clientRouter.post('/', requireAdmin, validate(createClientSchema), asyncHandler(createClient));
