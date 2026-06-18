import dotenv from 'dotenv';
import { z } from 'zod';

const runtimeEnv = getRuntimeEnv();

if (runtimeEnv.__load_dotenv !== false && typeof process !== 'undefined' && process?.versions?.node) {
  dotenv.config();
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  BACKEND_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  STORAGE_DRIVER: z.enum(['mock', 'spaces']).default('mock'),
  DATABASE_URL: z.string().optional().default(''),
  DO_SPACES_ENDPOINT: z.string().optional().default(''),
  DO_SPACES_REGION: z.string().optional().default(''),
  DO_SPACES_KEY: z.string().optional().default(''),
  DO_SPACES_SECRET: z.string().optional().default(''),
  DO_SPACES_BUCKET: z.string().optional().default(''),
  DO_SPACES_PUBLIC_BASE_URL: z.string().optional().default(''),
  UPLOAD_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().default(900),
  READ_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().default(300),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  UPLOAD_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  ADMIN_API_KEY: z.string().optional().default(''),
  CLIENT_API_KEY: z.string().optional().default(''),
  CLIENT_API_KEY_CLIENT_IDS: z.string().optional().default(''),
  JWT_SECRET: z.string().optional().default(''),
  JWT_EXPIRES_SECONDS: z.coerce.number().int().positive().default(3600),
  AUTH_MODE: z.enum(['dev', 'api-key', 'jwt']).default('dev'),
});

const parsed = schema.parse(runtimeEnv);

validateRuntimeConfig(parsed);

export const env = {
  ...parsed,
  CORS_ORIGINS: parsed.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  CLIENT_API_KEY_CLIENT_IDS: parsed.CLIENT_API_KEY_CLIENT_IDS.split(',')
    .map((clientId) => clientId.trim())
    .filter(Boolean),
};

function validateRuntimeConfig(config) {
  if (config.STORAGE_DRIVER === 'spaces') {
    const missing = [
      'DO_SPACES_ENDPOINT',
      'DO_SPACES_REGION',
      'DO_SPACES_KEY',
      'DO_SPACES_SECRET',
      'DO_SPACES_BUCKET',
      'DO_SPACES_PUBLIC_BASE_URL',
    ].filter((key) => !config[key]);

    if (missing.length > 0) {
      throw new Error(`STORAGE_DRIVER=spaces requires: ${missing.join(', ')}`);
    }
  }

  if (config.AUTH_MODE === 'api-key') {
    const missing = ['ADMIN_API_KEY', 'CLIENT_API_KEY'].filter((key) => !config[key]);

    if (!config.CLIENT_API_KEY_CLIENT_IDS) {
      missing.push('CLIENT_API_KEY_CLIENT_IDS');
    }

    if (missing.length > 0) {
      throw new Error(`AUTH_MODE=api-key requires: ${missing.join(', ')}`);
    }
  }

  if (config.AUTH_MODE === 'jwt' && !config.JWT_SECRET) {
    throw new Error('AUTH_MODE=jwt requires: JWT_SECRET');
  }
}

function getRuntimeEnv() {
  if (typeof process !== 'undefined' && process?.env) {
    return process.env;
  }

  if (typeof globalThis !== 'undefined' && globalThis.__ENV__) {
    return globalThis.__ENV__;
  }

  return {};
}
