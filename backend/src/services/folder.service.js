import { listFileRecords } from '../repositories/file.repository.js';

const folders = [
  { name: 'images', label: 'Images' },
  { name: 'videos', label: 'Videos' },
  { name: 'pdfs', label: 'PDFs' },
  { name: 'docs', label: 'Docs' },
];

export async function listFolders({ clientId }) {
  const folderCounts = await Promise.all(
    folders.map(async (folder) => {
      const files = await listFileRecords({ clientId, folder: folder.name });
      return {
        ...folder,
        fileCount: files.length,
      };
    }),
  );

  return folderCounts;
}
