import { Router } from 'express';
import { getApiDocsPage, getOpenApiDocument } from '../controllers/openapi.controller.js';

export const openApiRouter = Router();

openApiRouter.get('/openapi.json', getOpenApiDocument);
openApiRouter.get('/docs', getApiDocsPage);
