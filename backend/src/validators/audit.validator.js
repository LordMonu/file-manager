import { z } from 'zod';

export const listAuditLogsSchema = z.object({
  query: z.object({
    clientId: z.string().min(1).optional(),
    action: z.string().min(1).max(120).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});

