import {
  confirmUpload,
  generateUploadUrl as generateUploadUrlService,
  getMockUpload,
  putMockUpload,
} from '../services/upload.service.js';
import { recordAuditLog } from '../services/audit.service.js';

export async function generateUploadUrl(req, res) {
  const { file, upload } = await generateUploadUrlService(req.body || {}, req.user);
  await recordAuditLog({
    user: req.user,
    clientId: file.clientId,
    action: 'file.upload_url.generated',
    entityType: 'file',
    entityId: file.id,
    metadata: {
      folder: file.folder,
      originalName: file.originalName,
      objectKey: file.objectKey,
    },
  });

  res.status(201).json({
    file: {
      id: file.id,
      clientId: file.clientId,
      originalName: file.originalName,
      storedName: file.storedName,
      folder: file.folder,
      objectKey: file.objectKey,
      status: file.status,
    },
    upload,
  });
}

export async function confirmUploadController(req, res) {
  const file = await confirmUpload(req.params.fileId, req.user);
  await recordAuditLog({
    user: req.user,
    clientId: file.clientId,
    action: 'file.upload.confirmed',
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

export async function putMockUploadController(req, res) {
  const result = putMockUpload({
    fileId: req.params.fileId,
    buffer: req.body,
    contentType: req.header('content-type'),
  });

  res.json(result);
}

export async function getMockUploadController(req, res) {
  const object = getMockUpload(req.params.fileId);

  res.setHeader('Content-Type', object.contentType);
  res.send(object.buffer);
}
