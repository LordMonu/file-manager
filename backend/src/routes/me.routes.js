import { Router } from 'express';
import { getMe } from '../controllers/me.controller.js';

export const meRouter = Router();

meRouter.get('/', getMe);
