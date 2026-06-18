import { z } from 'zod';

export const listFoldersSchema = z.object({
  query: z.object({
    clientId: z.string().min(1, 'clientId is required'),
  }),
});

