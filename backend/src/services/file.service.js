import {
  createFileRecord,
  findFileById,
  listFileRecords,
  searchFileRecords,
  updateFileRecord,
} from '../repositories/file.repository.js';
import { env } from '../config/env.js';
import { deleteMockObject, getMockObject } from './mockStorage.service.js';
import { assertCanAccessClient, assertCanManageClientFiles, assertCanUploadToClient } from './permission.service.js';
import { createReadUrl, deleteObject } from './spaces.service.js';
import { ApiError } from '../utils/ApiError.js';

export async function createPendingFile(file) {
  return createFileRecord({
    ...file,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function confirmFileUpload(fileId, user) {
  const file = await findFileById(fileId);

  if (!file) {
    throw new ApiError(404, 'File not found');
  }

  assertCanUploadToClient(user, file.clientId);

  return updateFileRecord(fileId, {
    status: 'uploaded',
    uploadedAt: new Date().toISOString(),
  });
}

export async function listFiles({ clientId, folder, q, page, limit }) {
  const result = await searchFileRecords({ clientId, folder, q, page, limit });

  return {
    files: result.records.map(toFileResponse),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasMore: result.hasMore,
    },
  };
}

export async function getFile(fileId, user) {
  const file = await findFileById(fileId);

  if (!file || file.status === 'deleted') {
    throw new ApiError(404, 'File not found');
  }

  assertCanManageClientFiles(user, file.clientId);

  return toFileResponse(file);
}

export async function getFileContent(fileId, user) {
  const file = await findFileById(fileId);

  if (!file || file.status === 'deleted') {
    throw new ApiError(404, 'File not found');
  }

  assertCanAccessClient(user, file.clientId);

  if (env.STORAGE_DRIVER === 'mock') {
    const object = getMockObject(fileId);
    return {
      type: 'buffer',
      file,
      buffer: object.buffer,
      contentType: object.contentType || file.mimeType || 'application/octet-stream',
    };
  }

  return streamFileFromSpaces(file, 'inline');
}

export async function getFileDownload(fileId, user) {
  const file = await findFileById(fileId);

  if (!file || file.status === 'deleted') {
    throw new ApiError(404, 'File not found');
  }

  assertCanAccessClient(user, file.clientId);

  if (env.STORAGE_DRIVER === 'mock') {
    const object = getMockObject(fileId);
    return {
      type: 'buffer',
      file,
      buffer: object.buffer,
      contentType: object.contentType || file.mimeType || 'application/octet-stream',
    };
  }

  return streamFileFromSpaces(file, `attachment; filename="${escapeSpacesFilename(file.originalName)}"`);
}

async function streamFileFromSpaces(file, responseContentDisposition) {
  const readUrl = await createReadUrl({
    objectKey: file.objectKey,
    responseContentDisposition,
  });

  return {
    type: 'response',
    file,
    response: await fetch(readUrl),
    contentType: file.mimeType || 'application/octet-stream',
    contentDisposition: responseContentDisposition,
  };
}

export async function deleteFile(fileId, user) {
  const file = await findFileById(fileId);

  if (!file || file.status === 'deleted') {
    throw new ApiError(404, 'File not found');
  }

  assertCanAccessClient(user, file.clientId);

  if (env.STORAGE_DRIVER === 'mock') {
    deleteMockObject(fileId);
  } else if (file.objectKey) {
    await deleteObject(file.objectKey);
  }

  return updateFileRecord(fileId, {
    status: 'deleted',
    deletedAt: new Date().toISOString(),
  });
}

function toFileResponse(file) {
  const contentUrl = `${env.BACKEND_PUBLIC_URL}/api/v1/files/${file.id}/content`;

  return {
    id: file.id,
    clientId: file.clientId,
    name: file.originalName,
    mimeType: file.mimeType,
    folder: file.folder,
    sizeBytes: file.sizeBytes,
    status: file.status,
    objectKey: file.objectKey,
    viewUrl: contentUrl,
    downloadUrl: `${contentUrl}?download=1`,
    createdAt: file.createdAt,
    uploadedAt: file.uploadedAt,
  };
}

function escapeSpacesFilename(fileName) {
  return fileName.replace(/["\\]/g, '');
}
