import { buildStorageKey } from './fileRouting.service.js';
import { createPendingFile, confirmFileUpload } from './file.service.js';
import { requireClient } from './client.service.js';
import { createUploadUrl, getUploadExpirySeconds } from './spaces.service.js';
import { createMockUploadUrl, getMockObject, putMockObject } from './mockStorage.service.js';
import { assertCanUploadToClient } from './permission.service.js';
import { ApiError } from '../utils/ApiError.js';
import { createId } from '../utils/ids.js';
import { env } from '../config/env.js';
import { isBlockedUploadExtension, normalizeUploadMimeType } from '../utils/fileType.js';

export async function generateUploadUrl({ clientId, fileName, fileType, fileSize }, user) {
  if (!clientId || !fileName) {
    throw new ApiError(400, 'clientId and fileName are required');
  }

  if (isBlockedUploadExtension(fileName)) {
    throw new ApiError(400, 'This file type is not allowed');
  }

  if (fileSize && fileSize > env.MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
    throw new ApiError(413, `File size exceeds ${env.MAX_UPLOAD_SIZE_MB}MB limit`);
  }

  await requireClient(clientId);
  assertCanUploadToClient(user, clientId);

  const fileId = createId('file');
  const normalizedFileType = normalizeUploadMimeType({ fileName, mimeType: fileType || '' });
  const routing = buildStorageKey({ clientId, mimeType: normalizedFileType, fileName, fileId });
  const expiresIn = getUploadExpirySeconds();
  const { uploadUrl, publicUrl } =
    env.STORAGE_DRIVER === 'spaces'
      ? await createUploadUrl({
          objectKey: routing.objectKey,
          contentType: normalizedFileType,
          expiresIn,
        })
      : createMockUploadUrl({ fileId });

  const file = await createPendingFile({
    id: fileId,
    clientId,
    uploadedBy: user?.id || null,
    originalName: fileName,
    storedName: routing.storedName,
    mimeType: normalizedFileType,
    folder: routing.folder,
    objectKey: routing.objectKey,
    publicUrl,
    sizeBytes: fileSize || null,
  });

  return {
    file,
    upload: {
      uploadUrl,
      expiresIn,
      publicUrl,
    },
  };
}

export function confirmUpload(fileId, user) {
  return confirmFileUpload(fileId, user);
}

export function putMockUpload({ fileId, buffer, contentType }) {
  if (env.STORAGE_DRIVER !== 'mock') {
    throw new ApiError(404, 'Mock storage is disabled');
  }

  putMockObject({ fileId, buffer, contentType });

  return {
    ok: true,
  };
}

export function getMockUpload(fileId) {
  if (env.STORAGE_DRIVER !== 'mock') {
    throw new ApiError(404, 'Mock storage is disabled');
  }

  return getMockObject(fileId);
}
