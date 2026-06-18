import { detectFolderFromUpload } from '../utils/fileType.js';
import { sanitizeFilename } from '../utils/sanitizeFilename.js';

export function buildStorageKey({ clientId, mimeType, fileName, fileId }) {
  const folder = detectFolderFromUpload({ fileName, mimeType });
  const safeName = sanitizeFilename(fileName) || 'file';

  return {
    folder,
    objectKey: `clients/${clientId}/${folder}/${fileId}-${safeName}`,
    storedName: `${fileId}-${safeName}`,
  };
}
