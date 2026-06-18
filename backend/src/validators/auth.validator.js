import { z } from 'zod';

const clientAccessSchema = z.object({
  clientId: z.string().trim().min(1, 'clientId is required'),
  role: z.enum(['viewer', 'uploader', 'manager']),
});

export const bootstrapSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(200),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(200),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(200),
    role: z.enum(['admin', 'client']),
    clientAccess: z.array(clientAccessSchema).optional().default([]),
  }),
});
