import { hasDatabase, query } from '../config/database.js';
import { spacesConfig } from '../config/spaces.js';

const files = new Map();

export async function createFileRecord(file) {
  if (hasDatabase()) {
    const result = await query(
      `
        insert into files (
          id,
          client_id,
          uploaded_by,
          original_name,
          stored_name,
          mime_type,
          folder,
          object_key,
          bucket,
          public_url,
          size_bytes,
          status,
          visibility,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
        returning *
      `,
      [
        file.id,
        file.clientId,
        file.uploadedBy,
        file.originalName,
        file.storedName,
        file.mimeType,
        file.folder,
        file.objectKey,
        spacesConfig.bucket || null,
        file.publicUrl,
        file.sizeBytes,
        file.status,
        file.visibility || 'private',
        file.createdAt,
      ],
    );

    return toFile(result.rows[0]);
  }

  files.set(file.id, file);
  return file;
}

export async function updateFileRecord(fileId, updates) {
  if (hasDatabase()) {
    const existing = await findFileById(fileId);
    if (!existing) return null;

    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const result = await query(
      `
        update files
        set
          status = $2,
          etag = $3,
          uploaded_at = $4,
          deleted_at = $5,
          updated_at = $6
        where id = $1
        returning *
      `,
      [
        fileId,
        merged.status,
        merged.etag || null,
        merged.uploadedAt || null,
        merged.deletedAt || null,
        merged.updatedAt,
      ],
    );

    return result.rows[0] ? toFile(result.rows[0]) : null;
  }

  const existing = files.get(fileId);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  files.set(fileId, updated);
  return updated;
}

export async function findFileById(fileId) {
  if (hasDatabase()) {
    const result = await query('select * from files where id = $1 limit 1', [fileId]);
    return result.rows[0] ? toFile(result.rows[0]) : null;
  }

  return files.get(fileId) || null;
}

export async function listFileRecords({ clientId, folder }) {
  if (hasDatabase()) {
    const params = [clientId];
    const folderFilter = folder ? 'and folder = $2' : '';
    if (folder) params.push(folder);

    const result = await query(
      `
        select *
        from files
        where client_id = $1
          ${folderFilter}
          and status != 'deleted'
        order by created_at desc
      `,
      params,
    );

    return result.rows.map(toFile);
  }

  return Array.from(files.values())
    .filter((file) => file.clientId === clientId)
    .filter((file) => !folder || file.folder === folder)
    .filter((file) => file.status !== 'deleted')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function searchFileRecords({ clientId, folder, q = '', page = 1, limit = 40 }) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const offset = (safePage - 1) * safeLimit;
  const search = q.trim();

  if (hasDatabase()) {
    const params = [clientId];
    const filters = ['client_id = $1', "status != 'deleted'"];

    if (folder) {
      params.push(folder);
      filters.push(`folder = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      filters.push(`(original_name ilike $${params.length} or mime_type ilike $${params.length})`);
    }

    const where = filters.join(' and ');
    const countResult = await query(`select count(*)::int as total from files where ${where}`, params);
    const total = countResult.rows[0]?.total || 0;

    params.push(safeLimit, offset);
    const result = await query(
      `
        select *
        from files
        where ${where}
        order by created_at desc
        limit $${params.length - 1}
        offset $${params.length}
      `,
      params,
    );

    return {
      records: result.rows.map(toFile),
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: offset + result.rows.length < total,
    };
  }

  const normalizedSearch = search.toLowerCase();
  const filtered = Array.from(files.values())
    .filter((file) => file.clientId === clientId)
    .filter((file) => !folder || file.folder === folder)
    .filter((file) => file.status !== 'deleted')
    .filter((file) => {
      if (!normalizedSearch) return true;
      return (
        file.originalName.toLowerCase().includes(normalizedSearch) ||
        file.mimeType.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    records: filtered.slice(offset, offset + safeLimit),
    total: filtered.length,
    page: safePage,
    limit: safeLimit,
    hasMore: offset + safeLimit < filtered.length,
  };
}

function toFile(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    uploadedBy: row.uploaded_by,
    originalName: row.original_name,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    folder: row.folder,
    objectKey: row.object_key,
    bucket: row.bucket,
    publicUrl: row.public_url,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    etag: row.etag,
    status: row.status,
    visibility: row.visibility,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    uploadedAt: row.uploaded_at?.toISOString?.() || row.uploaded_at,
    deletedAt: row.deleted_at?.toISOString?.() || row.deleted_at,
  };
}
