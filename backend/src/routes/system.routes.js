import { Router } from 'express';
import { getSystemInfo } from '../controllers/system.controller.js';

export const systemRouter = Router();

systemRouter.get('/', getSystemInfo);
