import { env } from './env.js';

export const spacesConfig = {
  endpoint: env.DO_SPACES_ENDPOINT,
  region: env.DO_SPACES_REGION,
  bucket: env.DO_SPACES_BUCKET,
  key: env.DO_SPACES_KEY,
  secret: env.DO_SPACES_SECRET,
  publicBaseUrl: env.DO_SPACES_PUBLIC_BASE_URL,
};

