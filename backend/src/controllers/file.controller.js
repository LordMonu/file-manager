import {
  deleteFile as deleteFileService,
  getFileDownload as getFileDownloadService,
  getFileContent as getFileContentService,
  getFile as getFileService,
  listFiles as listFilesService,
} from '../services/file.service.js';
import { requireClient } from '../services/client.service.js';
import { recordAuditLog } from '../services/audit.service.js';
import { ApiError } from '../utils/ApiError.js';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export async function listFiles(req, res) {
  const { clientId, folder, q, page, limit } = req.query;

  await requireClient(clientId);

  const result = await listFilesService({ clientId, folder, q, page, limit });
  res.json(result);
}

export async function getFile(req, res) {
  res.json({ file: await getFileService(req.params.fileId, req.user) });
}

export async function getFileContent(req, res) {
  const shouldDownload = req.query.download === '1';
  const content = shouldDownload
    ? await getFileDownloadService(req.params.fileId, req.user)
    : await getFileContentService(req.params.fileId, req.user);

  await recordAuditLog({
    user: req.user,
    clientId: content.file.clientId,
    action: shouldDownload ? 'file.downloaded' : 'file.viewed',
    entityType: 'file',
    entityId: content.file.id,
    metadata: {
      folder: content.file.folder,
      originalName: content.file.originalName,
      objectKey: content.file.objectKey,
    },
  });

  if (content.type === 'buffer') {
    res.setHeader('Content-Type', content.contentType);
    res.setHeader(
      'Content-Disposition',
      `${shouldDownload ? 'attachment' : 'inline'}; filename="${escapeHeaderFilename(content.file.originalName)}"`,
    );
    res.send(content.buffer);
    return;
  }

  if (content.type !== 'response') {
    throw new ApiError(502, 'Unsupported file response type');
  }

  if (!content.response.ok) {
    throw new ApiError(502, 'Failed to load file content');
  }

  res.status(content.response.status);
  res.setHeader('Content-Type', content.response.headers.get('content-type') || content.contentType);
  res.setHeader('Content-Disposition', content.response.headers.get('content-disposition') || content.contentDisposition);
  const length = content.response.headers.get('content-length');
  if (length) {
    res.setHeader('Content-Length', length);
  }

  if (!content.response.body) {
    throw new ApiError(502, 'File content stream unavailable');
  }

  await pipeline(Readable.fromWeb(content.response.body), res);
}

export async function deleteFile(req, res) {
  const file = await deleteFileService(req.params.fileId, req.user);
  await recordAuditLog({
    user: req.user,
    clientId: file.clientId,
    action: 'file.deleted',
    entityType: 'file',
    entityId: file.id,
    metadata: {
      folder: file.folder,
      originalName: file.originalName,
      objectKey: file.objectKey,
    },
  });

  res.json({ file });
}

function escapeHeaderFilename(fileName) {
  return fileName.replace(/["\\]/g, '');
}
