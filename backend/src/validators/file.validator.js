import { z } from 'zod';

const folderSchema = z.enum(['images', 'videos', 'pdfs', 'docs']);

export const listFilesSchema = z.object({
  query: z.object({
    clientId: z.string().min(1, 'clientId is required'),
    folder: folderSchema.optional(),
    q: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(40),
  }),
});

export const getFileSchema = z.object({
  params: z.object({
    fileId: z.string().min(1, 'fileId is required'),
  }),
});
