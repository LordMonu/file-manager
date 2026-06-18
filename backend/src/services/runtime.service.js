import { env } from '../config/env.js';
import { hasDatabase } from '../config/database.js';

export function getRuntimeSystemInfo() {
  return {
    authMode: env.AUTH_MODE,
    storageDriver: env.STORAGE_DRIVER,
    databaseMode: hasDatabase() ? 'postgres' : 'memory',
    maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB,
    folders: ['images', 'videos', 'pdfs', 'docs'],
  };
}

