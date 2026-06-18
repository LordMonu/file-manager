import { z } from 'zod';

export const generateUploadUrlSchema = z.object({
  body: z.object({
    clientId: z.string().min(1, 'clientId is required'),
    fileName: z.string().trim().min(1, 'fileName is required').max(255),
    fileType: z.string().trim().max(120).optional().default(''),
    fileSize: z.coerce.number().int().positive().optional(),
  }),
});

export const confirmUploadSchema = z.object({
  params: z.object({
    fileId: z.string().min(1, 'fileId is required'),
  }),
});
