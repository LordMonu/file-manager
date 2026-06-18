import { requireClient } from '../services/client.service.js';
import { listFolders as listFolderService } from '../services/folder.service.js';

export async function listFolders(req, res) {
  const { clientId } = req.query;

  await requireClient(clientId);

  res.json({
    folders: await listFolderService({ clientId }),
  });
}
