const blockedExtensions = new Set([
  'app',
  'bat',
  'cmd',
  'com',
  'cpl',
  'dmg',
  'exe',
  'hta',
  'iso',
  'jar',
  'js',
  'msi',
  'ps1',
  'scr',
  'sh',
  'vbs',
]);

const folderByExtension = {
  gif: 'images',
  jpeg: 'images',
  jpg: 'images',
  png: 'images',
  svg: 'images',
  webp: 'images',
  bmp: 'images',
  mp4: 'videos',
  mov: 'videos',
  avi: 'videos',
  mkv: 'videos',
  webm: 'videos',
  m4v: 'videos',
  pdf: 'pdfs',
  txt: 'docs',
  csv: 'docs',
  doc: 'docs',
  docx: 'docs',
  xls: 'docs',
  xlsx: 'docs',
  ppt: 'docs',
  pptx: 'docs',
  rtf: 'docs',
  odt: 'docs',
  ods: 'docs',
  odp: 'docs',
  zip: 'docs',
};

const mimeByExtension = {
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  m4v: 'video/x-m4v',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  zip: 'application/zip',
};

const genericMimeTypes = new Set(['', 'application/octet-stream', 'binary/octet-stream', 'application/unknown']);

export function detectFolderFromMimeType(mimeType = '') {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  if (normalizedMimeType.startsWith('image/')) return 'images';
  if (normalizedMimeType.startsWith('video/')) return 'videos';
  if (normalizedMimeType === 'application/pdf') return 'pdfs';
  return 'docs';
}

export function detectFolderFromUpload({ fileName = '', mimeType = '' }) {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  if (!genericMimeTypes.has(normalizedMimeType)) {
    return detectFolderFromMimeType(normalizedMimeType);
  }

  return folderByExtension[getFileExtension(fileName)] || 'docs';
}

export function normalizeUploadMimeType({ fileName = '', mimeType = '' }) {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  if (!genericMimeTypes.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  return mimeByExtension[getFileExtension(fileName)] || 'application/octet-stream';
}

export function isBlockedUploadExtension(fileName = '') {
  return blockedExtensions.has(getFileExtension(fileName));
}

function getFileExtension(fileName = '') {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) : '';
}
