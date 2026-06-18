import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const objects = new Map();

export function createMockUploadUrl({ fileId }) {
  return {
    uploadUrl: `${env.BACKEND_PUBLIC_URL}/api/v1/uploads/mock/${fileId}`,
    publicUrl: `${env.BACKEND_PUBLIC_URL}/api/v1/uploads/mock/${fileId}`,
  };
}

export function putMockObject({ fileId, buffer, contentType }) {
  objects.set(fileId, {
    buffer,
    contentType: contentType || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
  });
}

export function getMockObject(fileId) {
  const object = objects.get(fileId);

  if (!object) {
    throw new ApiError(404, 'Mock object not found');
  }

  return object;
}

export function deleteMockObject(fileId) {
  objects.delete(fileId);
}
