import { z } from 'zod';

export const createClientSchema = z.object({
  body: z.object({
    clientName: z.string().trim().min(2, 'clientName must be at least 2 characters').max(120),
  }),
});

