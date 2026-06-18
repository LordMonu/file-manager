import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  File,
  FileImage,
  FileText,
  Film,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  KeyRound,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { apiFetch, fetchFileBlob, getApiUrl, getEnvironmentLabel, readAuthState, writeAuthState } from './lib/apiClient.js';

const defaultFolders = [
  { name: 'images', label: 'Images', fileCount: 0, icon: FileImage },
  { name: 'videos', label: 'Videos', fileCount: 0, icon: Film },
  { name: 'pdfs', label: 'PDFs', fileCount: 0, icon: FileText },
  { name: 'docs', label: 'Docs', fileCount: 0, icon: Archive },
];

const folderIcons = {
  images: FileImage,
  videos: Film,
  pdfs: FileText,
  docs: Archive,
};

const blockedUploadExtensions = new Set([
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

const environmentLabel = getEnvironmentLabel();
const apiUrl = getApiUrl();

export default function App() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [folders, setFolders] = useState(defaultFolders);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('images');
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, hasMore: false });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('Ready');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'client',
    clientIds: '',
    clientRole: 'manager',
  });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [authMode, setAuthMode] = useState(() => readAuthState().authMode || 'dev');
  const [authToken, setAuthToken] = useState(() => readAuthState().authToken || '');
  const [authEmail, setAuthEmail] = useState(() => readAuthState().authEmail || '');
  const [authPassword, setAuthPassword] = useState('');
  const [bootstrapName, setBootstrapName] = useState('');
  const [authRole, setAuthRole] = useState(() => readAuthState().authRole || 'admin');
  const [authUserId, setAuthUserId] = useState(() => readAuthState().authUserId || 'dev_admin');
  const [authClientIds, setAuthClientIds] = useState(() => readAuthState().authClientIds || '');
  const [me, setMe] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [filePreview, setFilePreview] = useState({ url: '', loading: false, error: '' });
  const [appIssue, setAppIssue] = useState(() => (!apiUrl ? buildAppIssue(new Error('VITE_API_URL is not configured for this environment')) : null));
  const authState = {
    authMode,
    authToken,
    authRole,
    authUserId,
    authClientIds,
  };

  useEffect(() => {
    loadClients();
    loadSystemInfo();
  }, []);

  useEffect(() => {
    if (authMode === 'jwt' && !authToken) {
      setMe(null);
      return;
    }

    syncAuthPreview();
  }, [authMode, authToken, authRole, authUserId, authClientIds]);

  useEffect(() => {
    if (me?.role === 'admin') {
      loadUsers();
      return;
    }

    setUsers([]);
  }, [me?.role, authMode, authToken, authRole, authUserId, authClientIds]);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    async function loadPreview() {
      if (!selectedFile || !isPreviewableMimeType(selectedFile.mimeType)) {
        setFilePreview({ url: '', loading: false, error: '' });
        return;
      }

      setFilePreview({ url: '', loading: true, error: '' });

      try {
        const { blob } = await fetchFileBlob(selectedFile.id, authState, false);
        if (!active) return;

        objectUrl = URL.createObjectURL(blob);
        setFilePreview({ url: objectUrl, loading: false, error: '' });
      } catch (error) {
        if (!active) return;
        setFilePreview({ url: '', loading: false, error: error.message || 'Preview unavailable' });
      }
    }

    loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedFile, authMode, authToken, authRole, authUserId, authClientIds]);

  useEffect(() => {
    writeAuthState({
      authMode,
      authToken,
      authEmail,
      authRole,
      authUserId,
      authClientIds,
    });
  }, [authMode, authToken, authEmail, authRole, authUserId, authClientIds]);

  async function loadClients(authOverride = authState) {
    try {
      const res = await apiFetch('/api/v1/clients', {}, authOverride);
      const data = await readJson(res);
      setClients(data.clients || []);
      clearAppIssue('backend');
      if (!selectedClientId && data.clients?.[0]?.id) {
        setSelectedClientId(data.clients[0].id);
      }
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Backend not connected');
    }
  }

  async function loadSystemInfo() {
    try {
      const res = await apiFetch('/api/v1/system');
      const data = await readJson(res);
      setSystemInfo(data.system || null);
      clearAppIssue('backend');
    } catch {
      setSystemInfo(null);
    }
  }

  async function loadFolders(clientId = selectedClientId) {
    if (!clientId) return;
    const res = await apiFetch(`/api/v1/folders?clientId=${clientId}`, {}, authState);
    const data = await readJson(res);
    setFolders(withFolderIcons(data.folders || defaultFolders));
  }

  async function loadFiles(
    clientId = selectedClientId,
    folder = selectedFolder,
    nextPage = page,
    q = deferredSearchTerm,
  ) {
    if (!clientId) return;
    const params = new URLSearchParams({
      clientId,
      folder,
      page: String(nextPage),
      limit: '20',
    });

    if (q.trim()) {
      params.set('q', q.trim());
    }

    const res = await apiFetch(`/api/v1/files?${params.toString()}`, {}, authState);
    const data = await readJson(res);
    setFiles(data.files || []);
    setPagination(data.pagination || { page: nextPage, limit: 20, total: 0, hasMore: false });
  }

  async function loadAuditLogs(clientId = selectedClientId) {
    if (!clientId) {
      setAuditLogs([]);
      return;
    }

    const params = new URLSearchParams({
      clientId,
      limit: '8',
    });

    const res = await apiFetch(`/api/v1/audit-logs?${params.toString()}`, {}, authState);
    const data = await readJson(res);
    setAuditLogs(data.auditLogs || []);
  }

  async function loadUsers() {
    setUsersLoading(true);

    try {
      const res = await apiFetch('/api/v1/auth/users', {}, authState);
      const data = await readJson(res);
      setUsers(data.users || []);
      clearAppIssue('auth');
    } catch (error) {
      setUsers([]);
      setAppIssue(buildAppIssue(error));
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleRefresh() {
    if (!selectedClientId) return;

    setRefreshing(true);
    try {
      await Promise.all([loadFolders(), loadFiles(), loadAuditLogs()]);
      clearAppIssue();
      setMessage('Workspace refreshed');
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  async function syncAuthPreview() {
    try {
      const res = await apiFetch('/api/v1/me', {}, authState);
      const data = await readJson(res);
      setMe(data.user || null);
      clearAppIssue('auth');
    } catch (error) {
      setMe(null);
      setAppIssue(buildAppIssue(error));
    }
  }

  async function handleCreateClient(event) {
    event.preventDefault();

    if (!clientName.trim()) return;

    setLoading(true);
    setMessage('Creating client...');

    try {
      const res = await apiFetch('/api/v1/clients', {
        method: 'POST',
        body: JSON.stringify({ clientName }),
      }, authState);
      const data = await readJson(res);

      setClientName('');
      setClients((current) => [...current, data.client]);
      setSelectedClientId(data.client.id);
      setPage(1);
      setMessage(`${data.client.name} created`);
      clearAppIssue();
      await loadFolders(data.client.id);
      await loadFiles(data.client.id, selectedFolder, 1);
      await loadAuditLogs(data.client.id);
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Client creation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleJwtLogin() {
    if (!authEmail.trim() || !authPassword.trim()) {
      setMessage('Email and password are required');
      return;
    }

    setLoading(true);
    setMessage('Signing in...');

    try {
      await performJwtLogin(authEmail.trim(), authPassword);
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleBootstrapAdmin() {
    if (!authEmail.trim() || !bootstrapName.trim() || !authPassword.trim()) {
      setMessage('Name, email, and password are required');
      return;
    }

    setLoading(true);
    setMessage('Creating first admin...');

    try {
      const response = await apiFetch('/api/v1/auth/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          email: authEmail.trim(),
          name: bootstrapName.trim(),
          password: authPassword,
        }),
      });
      await readJson(response);
      await performJwtLogin(authEmail.trim(), authPassword);
      setBootstrapName('');
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Bootstrap failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();

    const email = userForm.email.trim();
    const name = userForm.name.trim();
    const password = userForm.password.trim();

    if (!email || !name || !password) {
      setMessage('Email, name, and password are required');
      return;
    }

    const clientIds = normalizeClientIds(userForm.clientIds);

    if (userForm.role === 'client' && clientIds.length === 0) {
      setMessage('Assign at least one client for client users');
      return;
    }

    setUsersLoading(true);
    setMessage('Creating user...');

    try {
      const payload = {
        email,
        name,
        password,
        role: userForm.role,
        clientAccess:
          userForm.role === 'client'
            ? clientIds.map((clientId) => ({
                clientId,
                role: userForm.clientRole,
              }))
            : [],
      };

      const res = await apiFetch('/api/v1/auth/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, authState);
      const data = await readJson(res);

      setUsers((current) => [data.user, ...current.filter((item) => item.email !== data.user.email)]);
      setUserForm({
        email: '',
        name: '',
        password: '',
        role: 'client',
        clientIds: '',
        clientRole: 'manager',
      });
      clearAppIssue('auth');
      setMessage(`Created ${data.user.name || data.user.email}`);
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'User creation failed');
    } finally {
      setUsersLoading(false);
    }
  }

  async function performJwtLogin(email, password) {
    const nextAuthState = {
      authMode: 'jwt',
      authToken: '',
      authRole,
      authUserId,
      authClientIds,
    };
    const response = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    });
    const data = await readJson(response);

    setAuthToken(data.token);
    setAuthPassword('');
    setMe(data.user || null);
    clearAppIssue();
    setMessage(`Signed in as ${data.user?.name || data.user?.email || 'user'}`);
    nextAuthState.authToken = data.token;
    await Promise.all([loadSystemInfo(), loadClients(nextAuthState)]);
    return data;
  }

  function handleLogout() {
    setAuthToken('');
    setAuthPassword('');
    setMe(null);
    setClients([]);
    setSelectedClientId('');
    setFolders(defaultFolders);
    setFiles([]);
    setAuditLogs([]);
    setSelectedFile(null);
    setSelectedFileIds([]);
    setFilePreview({ url: '', loading: false, error: '' });
    setMessage('Signed out');
  }

  useEffect(() => {
    async function syncFolders() {
      try {
        await loadFolders();
        clearAppIssue('backend');
      } catch {
        setFolders(defaultFolders);
      }
    }
    syncFolders();
  }, [selectedClientId]);

  useEffect(() => {
    async function syncFiles() {
      try {
        await loadFiles();
        clearAppIssue('backend');
      } catch {
        setFiles([]);
        setPagination({ page: 1, limit: 20, total: 0, hasMore: false });
      }
    }
    syncFiles();
    setSelectedFileIds([]);
  }, [selectedClientId, selectedFolder, deferredSearchTerm, page]);

  useEffect(() => {
    async function syncAuditLogs() {
      try {
        await loadAuditLogs();
        clearAppIssue('backend');
      } catch {
        setAuditLogs([]);
      }
    }
    syncAuditLogs();
  }, [selectedClientId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId],
  );

  const selectedFolderMeta = useMemo(
    () => folders.find((folder) => folder.name === selectedFolder) || defaultFolders[0],
    [folders, selectedFolder],
  );

  const totalFiles = useMemo(
    () => folders.reduce((sum, folder) => sum + (folder.fileCount || 0), 0),
    [folders],
  );

  async function handleUpload() {
    if (!selectedClientId || selectedFiles.length === 0) return;

    setLoading(true);
    setUploadProgress(0);
    setMessage(`Preparing ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}...`);

    try {
      const uploadedFolders = [];

      for (let index = 0; index < selectedFiles.length; index += 1) {
        const currentFile = selectedFiles[index];
        setMessage(`Uploading ${index + 1} of ${selectedFiles.length}: ${currentFile.name}`);

        const uploaded = await uploadSingleFile({
          clientId: selectedClientId,
          file: currentFile,
          authState,
          onProgress: (fileProgress) => {
            const completed = index / selectedFiles.length;
            const current = fileProgress / 100 / selectedFiles.length;
            setUploadProgress(Math.round((completed + current) * 100));
          },
        });

        uploadedFolders.push(uploaded.folder);
      }

      const lastFolder = uploadedFolders.at(-1) || selectedFolder;
      setMessage(`Uploaded ${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'}`);
      clearAppIssue();
      setSelectedFiles([]);
      setSelectedFolder(lastFolder);
      setSelectedFile(null);
      setFilePreview({ url: '', loading: false, error: '' });
      setPage(1);
      await loadFolders();
      await loadFiles(selectedClientId, lastFolder, 1);
      await loadAuditLogs();
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFile(item) {
    const shouldDelete = window.confirm(`Delete ${item.name}?`);
    if (!shouldDelete) return;

    setLoading(true);
    setMessage(`Deleting ${item.name}...`);

    try {
      const res = await apiFetch(`/api/v1/files/${item.id}`, {
        method: 'DELETE',
      }, authState);
      await readJson(res);

      setMessage(`${item.name} deleted`);
      clearAppIssue();
      if (selectedFile?.id === item.id) {
        setSelectedFile(null);
        setFilePreview({ url: '', loading: false, error: '' });
      }
      await Promise.all([loadFolders(), loadFiles(), loadAuditLogs()]);
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedFileIds.length === 0) return;

    const targets = files.filter((item) => selectedFileIds.includes(item.id));
    const shouldDelete = window.confirm(`Delete ${targets.length} selected file${targets.length === 1 ? '' : 's'}?`);
    if (!shouldDelete) return;

    setLoading(true);
    setMessage(`Deleting ${targets.length} file${targets.length === 1 ? '' : 's'}...`);

    try {
      for (const item of targets) {
        const res = await apiFetch(`/api/v1/files/${item.id}`, {
          method: 'DELETE',
        }, authState);
        await readJson(res);
      }

      setSelectedFileIds([]);
      if (selectedFile && selectedFileIds.includes(selectedFile.id)) {
        setSelectedFile(null);
        setFilePreview({ url: '', loading: false, error: '' });
      }

      clearAppIssue();
      setMessage(`${targets.length} file${targets.length === 1 ? '' : 's'} deleted`);
      await Promise.all([loadFolders(), loadFiles(), loadAuditLogs()]);
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Bulk delete failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkDownload() {
    if (selectedFileIds.length === 0) return;

    const targets = files.filter((item) => selectedFileIds.includes(item.id));

    setLoading(true);
    setMessage(`Downloading ${targets.length} file${targets.length === 1 ? '' : 's'}...`);

    try {
      for (const item of targets) {
        await handleDownloadFile(item, authState);
      }

      clearAppIssue();
      setMessage(`${targets.length} file${targets.length === 1 ? '' : 's'} downloaded`);
    } catch (error) {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Bulk download failed');
    } finally {
      setLoading(false);
    }
  }

  function handleDropFile(event) {
    event.preventDefault();
    setIsDraggingFile(false);

    const droppedFiles = Array.from(event.dataTransfer.files || []);
    if (droppedFiles.length === 0) return;

    queueSelectedFiles(droppedFiles);
  }

  function handleSelectFiles(fileList) {
    const nextFiles = Array.from(fileList || []);
    queueSelectedFiles(nextFiles);
  }

  function handleRemoveQueuedFile(fileKey) {
    setSelectedFiles((current) => {
      const nextFiles = current.filter((item) => getFileKey(item) !== fileKey);
      if (nextFiles.length === 0) {
        setUploadProgress(0);
        setMessage('Upload queue cleared');
      } else {
        setMessage(`${nextFiles.length} file${nextFiles.length === 1 ? '' : 's'} ready to upload`);
      }
      return nextFiles;
    });
  }

  function handleClearQueue() {
    setSelectedFiles([]);
    setUploadWarnings([]);
    setUploadProgress(0);
    setMessage('Upload queue cleared');
  }

  function queueSelectedFiles(candidateFiles) {
    const maxUploadSizeMb = systemInfo?.maxUploadSizeMb || 200;
    const maxUploadBytes = maxUploadSizeMb * 1024 * 1024;
    const acceptedFiles = [];
    const warnings = [];

    for (const file of candidateFiles) {
      const extension = getFileExtension(file.name);

      if (blockedUploadExtensions.has(extension)) {
        warnings.push(`${file.name}: blocked file type`);
        continue;
      }

      if (file.size > maxUploadBytes) {
        warnings.push(`${file.name}: exceeds ${maxUploadSizeMb}MB limit`);
        continue;
      }

      acceptedFiles.push(file);
    }

    setSelectedFiles(acceptedFiles);
    setUploadWarnings(warnings);
    setUploadProgress(0);

    if (acceptedFiles.length > 0) {
      setMessage(`${acceptedFiles.length} file${acceptedFiles.length === 1 ? '' : 's'} ready to upload`);
      clearAppIssue('general');
    } else if (warnings.length > 0) {
      setMessage('No valid files were added to the upload queue');
      setAppIssue({
        kind: 'general',
        title: 'Some files were skipped',
        detail: warnings[0],
      });
    }
  }

  function handleOpenAction(file) {
    return handleOpenFile(file, authState, (error) => {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Open failed');
    });
  }

  function toggleFileSelection(fileId) {
    setSelectedFileIds((current) =>
      current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId],
    );
  }

  function toggleSelectAllVisibleFiles() {
    setSelectedFileIds((current) => {
      const visibleIds = files.map((item) => item.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.includes(id));

      if (allSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  const allVisibleFilesSelected = files.length > 0 && files.every((item) => selectedFileIds.includes(item.id));

  function handleDownloadAction(file) {
    return handleDownloadFile(file, authState, (error) => {
      setAppIssue(buildAppIssue(error));
      setMessage(error.message || 'Download failed');
    });
  }

  function clearAppIssue(scope) {
    setAppIssue((current) => {
      if (!current) return null;
      if (!scope || current.kind === scope) return null;
      return current;
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <FolderOpen size={22} />
          </div>
          <div>
            <p className="eyebrow">File Management</p>
            <h1>Client Storage</h1>
          </div>
        </div>

        <section className="sidebar-section">
          <div className="section-title">
            <Building2 size={16} />
            <span>Workspace</span>
          </div>

          <label className="field">
            <span>Client</span>
            <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <form className="client-form" onSubmit={handleCreateClient}>
            <label className="field">
              <span>New client</span>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name"
              />
            </label>
            <button className="primary full-width" disabled={loading || !clientName.trim()}>
              <Plus size={16} />
              Create Client
            </button>
          </form>
        </section>

        <section className="sidebar-section">
          <div className="section-title">
            <KeyRound size={16} />
            <span>Auth</span>
          </div>

          <label className="field">
            <span>Mode</span>
            <select value={authMode} onChange={(e) => setAuthMode(e.target.value)}>
              <option value="dev">Dev headers</option>
              <option value="jwt">JWT login</option>
              <option value="api-key">Bearer token</option>
            </select>
          </label>

          {authMode === 'dev' ? (
            <>
              <label className="field">
                <span>Role</span>
                <select value={authRole} onChange={(e) => setAuthRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                </select>
              </label>
              <label className="field">
                <span>User ID</span>
                <input type="text" value={authUserId} onChange={(e) => setAuthUserId(e.target.value)} />
              </label>
              <label className="field">
                <span>Client IDs</span>
                <input
                  type="text"
                  value={authClientIds}
                  onChange={(e) => setAuthClientIds(e.target.value)}
                  placeholder="clt_123,clt_456"
                />
              </label>
            </>
          ) : authMode === 'jwt' ? (
            <>
              <div className="auth-preview">
                <span>First-time setup</span>
                <strong>Create the first admin</strong>
                <small>Use this once on a fresh database, then sign in with the same email and password.</small>
              </div>
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={bootstrapName}
                  onChange={(e) => setBootstrapName(e.target.value)}
                  placeholder="Admin name"
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="text"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@company.com"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </label>
              <div className="auth-actions">
                <button className="ghost-button" type="button" onClick={handleBootstrapAdmin} disabled={loading}>
                  Bootstrap Admin
                </button>
                <button className="primary" type="button" onClick={handleJwtLogin} disabled={loading}>
                  Sign In
                </button>
                <button className="ghost-button" type="button" onClick={handleLogout} disabled={loading || !authToken}>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <label className="field">
              <span>Bearer token</span>
              <input
                type="text"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Paste API token"
              />
            </label>
          )}

          <div className="auth-preview">
            <span>Active</span>
            <strong>{me ? `${me.role} · ${me.authMode}` : 'Unavailable'}</strong>
            <small>
              {me
                ? [me.name || me.email, me.clientIds?.join(', ') || 'All clients / admin scope'].filter(Boolean).join(' · ')
                : 'Update token or headers to refresh'}
            </small>
          </div>

          {systemInfo ? (
            <div className="auth-preview">
              <span>Runtime</span>
              <strong>{systemInfo.storageDriver} storage</strong>
              <small>
                {environmentLabel} env · {systemInfo.authMode} auth · {systemInfo.databaseMode} data · {systemInfo.maxUploadSizeMb}MB max upload
              </small>
            </div>
          ) : null}
        </section>

        <section className="sidebar-section status-card">
          <div className="status-icon">
            {loading ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
          </div>
          <div>
            <span>Status</span>
            <p>{message}</p>
          </div>
        </section>
      </aside>

      <main className="main">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Central Source of Truth</p>
            <h2>{selectedClient?.name || 'No client selected'}</h2>
            <p className="muted">
              {selectedClient
                ? `${totalFiles} files across ${folders.length} folders`
                : 'Create or select a client to begin.'}
            </p>
          </div>
          <button className="ghost-button" onClick={handleRefresh} disabled={!selectedClientId || refreshing}>
            <RefreshCw className={refreshing ? 'spin' : ''} size={16} />
            Refresh
          </button>
        </header>

        {appIssue ? (
          <section className="issue-banner" role="alert">
            <div>
              <p className="eyebrow">Attention</p>
              <strong>{appIssue.title}</strong>
              <p>{appIssue.detail}</p>
            </div>
            <div className="issue-banner-actions">
              <button className="ghost-button" type="button" onClick={() => void retryIssue(appIssue, { handleRefresh, loadClients, loadSystemInfo, syncAuthPreview })}>
                Retry
              </button>
              <button className="text-button" type="button" onClick={() => setAppIssue(null)}>
                Dismiss
              </button>
            </div>
          </section>
        ) : null}

        <section className="folder-grid" aria-label="Folders">
          {folders.map((folder) => {
            const Icon = folder.icon || Folder;
            return (
              <button
                key={folder.name}
                className={`folder-card ${selectedFolder === folder.name ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFolder(folder.name);
                  setPage(1);
                }}
              >
                <span className="folder-icon">
                  <Icon size={18} />
                </span>
                <span className="folder-label">{folder.label}</span>
                <strong>{folder.fileCount ?? 0}</strong>
              </button>
            );
          })}
        </section>

        <section className="work-grid">
          <section className="panel upload-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Upload</p>
                <h3>Route files automatically</h3>
              </div>
              {selectedFiles.length > 0 ? (
                <button className="text-button" onClick={handleClearQueue} disabled={loading}>
                  Clear
                </button>
              ) : (
                <UploadCloud size={22} />
              )}
            </div>

            {systemInfo ? (
              <div className="upload-rules">
                <span>{systemInfo.folders.join(' / ')}</span>
                <strong>{systemInfo.maxUploadSizeMb}MB limit</strong>
              </div>
            ) : null}

            <label
              className={`drop-zone ${isDraggingFile ? 'dragging' : ''}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDraggingFile(false);
              }}
              onDrop={handleDropFile}
            >
              <input multiple type="file" onChange={(e) => handleSelectFiles(e.target.files)} />
              <UploadCloud size={28} />
              <strong>{selectedFiles.length > 0 ? selectedFileSummary(selectedFiles) : 'Choose files'}</strong>
              <span>
                {selectedFiles.length > 0
                  ? `${formatBytes(totalSelectedBytes(selectedFiles))} selected`
                  : 'Click or drop images, videos, PDFs, and documents'}
              </span>
            </label>

            {selectedFiles.length > 0 ? (
              <div className="upload-queue">
                {selectedFiles.slice(0, 4).map((item) => (
                  <div key={getFileKey(item)} className="queue-item">
                    <span>{item.name}</span>
                    <small>{formatBytes(item.size)}</small>
                    <button
                      type="button"
                      onClick={() => handleRemoveQueuedFile(getFileKey(item))}
                      disabled={loading}
                      title={`Remove ${item.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {selectedFiles.length > 4 ? (
                  <div className="queue-item muted-row">
                    <span>{selectedFiles.length - 4} more</span>
                    <small>queued</small>
                  </div>
                ) : null}
              </div>
            ) : null}

            {uploadWarnings.length > 0 ? (
              <div className="upload-warning-list">
                <strong>Skipped files</strong>
                {uploadWarnings.slice(0, 3).map((warning) => (
                  <span key={warning}>{warning}</span>
                ))}
                {uploadWarnings.length > 3 ? <span>{uploadWarnings.length - 3} more skipped</span> : null}
              </div>
            ) : null}

            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
            </div>

            <button className="primary full-width" onClick={handleUpload} disabled={selectedFiles.length === 0 || !selectedClientId || loading}>
              {loading ? <Loader2 className="spin" size={16} /> : <UploadCloud size={16} />}
              {loading ? `Uploading ${uploadProgress}%` : `Upload ${selectedFiles.length || ''} File${selectedFiles.length === 1 ? '' : 's'}`}
            </button>
          </section>

          <section className="panel file-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Files</p>
                <h3>{selectedFolderMeta.label}</h3>
              </div>
              <span className="count-pill">{pagination.total}</span>
            </div>

            <div className="file-toolbar">
              <label className="search-field">
                <Search size={16} />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search files"
                />
              </label>
              <div className="view-switch" role="group" aria-label="File view mode">
                <button
                  type="button"
                  className={viewMode === 'grid' ? 'switch-pill active' : 'switch-pill'}
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </button>
                <button
                  type="button"
                  className={viewMode === 'table' ? 'switch-pill active' : 'switch-pill'}
                  onClick={() => setViewMode('table')}
                >
                  Table
                </button>
              </div>
              <div className="bulk-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={toggleSelectAllVisibleFiles}
                  disabled={files.length === 0}
                >
                  {allVisibleFilesSelected ? 'Clear visible' : 'Select visible'}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={handleBulkDownload}
                  disabled={selectedFileIds.length === 0 || loading}
                >
                  Download {selectedFileIds.length > 0 ? selectedFileIds.length : ''}
                </button>
                <button
                  type="button"
                  className="text-button bulk-delete"
                  onClick={handleBulkDelete}
                  disabled={selectedFileIds.length === 0 || loading}
                >
                  Delete {selectedFileIds.length > 0 ? selectedFileIds.length : ''}
                </button>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="file-card-grid">
                {files.length === 0 ? (
                  <div className="empty-state">
                    <File size={24} />
                    <strong>No files in this folder</strong>
                    <span>Uploads will appear here after confirmation.</span>
                  </div>
                ) : (
                  files.map((item) => (
                    <FileCard
                      key={item.id}
                      item={item}
                      selected={selectedFileIds.includes(item.id)}
                      onToggleSelected={toggleFileSelection}
                      onDelete={handleDeleteFile}
                      onOpen={setSelectedFile}
                      onFileOpen={handleOpenAction}
                      onFileDownload={handleDownloadAction}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="file-table">
                <div className="file-table-head">
                  <span>Select</span>
                  <span>Name</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>

                {files.length === 0 ? (
                  <div className="empty-state">
                    <File size={24} />
                    <strong>No files in this folder</strong>
                    <span>Uploads will appear here after confirmation.</span>
                  </div>
                ) : (
                  files.map((item) => (
                    <FileRow
                      key={item.id}
                      item={item}
                      selected={selectedFileIds.includes(item.id)}
                      onToggleSelected={toggleFileSelection}
                      onDelete={handleDeleteFile}
                      onOpen={setSelectedFile}
                      onFileOpen={handleOpenAction}
                      onFileDownload={handleDownloadAction}
                    />
                  ))
                )}
              </div>
            )}

            <div className="file-detail-panel">
              {selectedFile ? (
                <>
                  <div className="file-preview-shell">
                    {filePreview.loading ? (
                      <div className="empty-state compact">
                        <Loader2 className="spin" size={22} />
                        <strong>Loading preview</strong>
                        <span>Fetching the file through the backend.</span>
                      </div>
                    ) : filePreview.url && isImageMimeType(selectedFile.mimeType) ? (
                      <img className="file-preview-media" src={filePreview.url} alt={selectedFile.name} />
                    ) : filePreview.url && isVideoMimeType(selectedFile.mimeType) ? (
                      <video className="file-preview-media" controls src={filePreview.url} />
                    ) : filePreview.url && selectedFile.mimeType === 'application/pdf' ? (
                      <iframe className="file-preview-media" title={selectedFile.name} src={filePreview.url} />
                    ) : (
                      <div className="empty-state compact">
                        <File size={22} />
                        <strong>{filePreview.error || 'No preview available'}</strong>
                        <span>{selectedFile.mimeType || 'unknown'} · {formatBytes(selectedFile.sizeBytes)}</span>
                      </div>
                    )}
                  </div>
                  <div className="file-detail-head">
                    <div>
                      <p className="eyebrow">Selected file</p>
                      <h3>{selectedFile.name}</h3>
                    </div>
                    <button className="text-button" type="button" onClick={() => setSelectedFile(null)}>
                      Clear
                    </button>
                  </div>
                  <div className="file-detail-grid">
                    <div>
                      <span>Folder</span>
                      <strong>{selectedFile.folder}</strong>
                    </div>
                    <div>
                      <span>Type</span>
                      <strong>{selectedFile.mimeType || 'unknown'}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{selectedFile.status}</strong>
                    </div>
                    <div>
                      <span>Size</span>
                      <strong>{formatBytes(selectedFile.sizeBytes)}</strong>
                    </div>
                  </div>
                  <div className="file-detail-actions">
                    <button type="button" onClick={() => void handleOpenAction(selectedFile)}>
                      <FolderOpen size={16} />
                      Open
                    </button>
                    <button type="button" onClick={() => void handleDownloadAction(selectedFile)}>
                      <Download size={16} />
                      Download
                    </button>
                    <button type="button" onClick={() => handleDeleteFile(selectedFile)}>
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state compact">
                  <File size={22} />
                  <strong>No file selected</strong>
                  <span>Click any file card or row to inspect it here.</span>
                </div>
              )}
            </div>

            <div className="pagination-row">
              <span>
                Page {pagination.page} · {pagination.total} files
              </span>
              <div>
                <button className="ghost-icon" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="ghost-icon"
                  disabled={!pagination.hasMore}
                  onClick={() => setPage((current) => current + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </section>

        <section className="panel activity-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Activity</p>
              <h3>Recent audit events</h3>
            </div>
            <Activity size={22} />
          </div>

          <div className="activity-list">
            {auditLogs.length === 0 ? (
              <div className="empty-state compact">
                <Activity size={22} />
                <strong>No recent activity</strong>
                <span>Client, upload, and delete events will appear here.</span>
              </div>
            ) : (
              auditLogs.map((log) => <AuditLogRow key={log.id} log={log} />)
            )}
          </div>
        </section>

        {me?.role === 'admin' ? (
          <section className="panel admin-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Admin</p>
                <h3>User access</h3>
              </div>
              <Users size={22} />
            </div>

            <form className="user-form" onSubmit={handleCreateUser}>
              <div className="user-form-grid">
                <label className="field">
                  <span>Email</span>
                  <input
                    type="text"
                    value={userForm.email}
                    onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="person@company.com"
                  />
                </label>
                <label className="field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Display name"
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Temporary password"
                  />
                </label>
                <label className="field">
                  <span>Role</span>
                  <select
                    value={userForm.role}
                    onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>

              {userForm.role === 'client' ? (
                <div className="user-form-grid compact">
                  <label className="field">
                    <span>Client IDs</span>
                    <input
                      type="text"
                      value={userForm.clientIds}
                      onChange={(event) => setUserForm((current) => ({ ...current, clientIds: event.target.value }))}
                      placeholder="clt_123, clt_456"
                    />
                  </label>
                  <label className="field">
                    <span>Access</span>
                    <select
                      value={userForm.clientRole}
                      onChange={(event) => setUserForm((current) => ({ ...current, clientRole: event.target.value }))}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="uploader">Uploader</option>
                      <option value="manager">Manager</option>
                    </select>
                  </label>
                </div>
              ) : null}

              <button className="primary" type="submit" disabled={usersLoading}>
                {usersLoading ? <Loader2 className="spin" size={16} /> : <UserPlus size={16} />}
                Create user
              </button>
            </form>

            <div className="user-list">
              {usersLoading && users.length === 0 ? (
                <div className="empty-state compact">
                  <Loader2 className="spin" size={22} />
                  <strong>Loading users</strong>
                  <span>Reading current access records from the backend.</span>
                </div>
              ) : users.length === 0 ? (
                <div className="empty-state compact">
                  <Users size={22} />
                  <strong>No users yet</strong>
                  <span>Create the first team member to begin managing access.</span>
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="user-row">
                    <div>
                      <strong>{user.name || user.email}</strong>
                      <small>{user.email}</small>
                    </div>
                    <span className={`status-pill ${user.role}`}>{user.role}</span>
                    <span className="user-access">
                      {user.role === 'admin'
                        ? 'All clients'
                        : (user.clientAccess || [])
                            .map((membership) => `${membership.clientId} · ${membership.role}`)
                            .join(' | ') || 'No clients'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function AuditLogRow({ log }) {
  return (
    <div className="activity-row">
      <span className="activity-dot" />
      <div>
        <strong>{formatAction(log.action)}</strong>
        <small>{formatAuditDescription(log)}</small>
      </div>
      <time>{formatDate(log.createdAt)}</time>
    </div>
  );
}

function FileRow({ item, selected, onToggleSelected, onDelete, onOpen, onFileOpen, onFileDownload }) {
  const Icon = folderIcons[item.folder] || File;

  return (
    <div
      className="file-row file-row-button"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item);
        }
      }}
    >
      <button
        type="button"
        className={`select-chip ${selected ? 'active' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleSelected(item.id);
        }}
        aria-label={selected ? `Deselect ${item.name}` : `Select ${item.name}`}
      >
        {selected ? 'On' : 'Off'}
      </button>
      <div className="file-name">
        <span className="file-icon">
          <Icon size={17} />
        </span>
        <div>
          <strong>{item.name}</strong>
          <small>{item.createdAt ? formatDate(item.createdAt) : 'New file'}</small>
        </div>
      </div>
      <span>{item.mimeType || 'unknown'}</span>
      <span>{formatBytes(item.sizeBytes)}</span>
      <span className={`status-pill ${item.status}`}>{item.status}</span>
      <div className="file-actions">
        <button type="button" title="Open file" onClick={(e) => { e.stopPropagation(); void onFileOpen(item); }}>
          <FolderOpen size={16} />
        </button>
        <button type="button" title="Download file" onClick={(e) => { e.stopPropagation(); void onFileDownload(item); }}>
          <Download size={16} />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(item); }} title="Delete file">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function FileCard({ item, selected, onToggleSelected, onDelete, onOpen, onFileOpen, onFileDownload }) {
  const Icon = folderIcons[item.folder] || File;

  return (
    <article
      className="file-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item);
        }
      }}
    >
      <div className="file-card-top">
        <button
          type="button"
          className={`select-chip ${selected ? 'active' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelected(item.id);
          }}
          aria-label={selected ? `Deselect ${item.name}` : `Select ${item.name}`}
        >
          {selected ? 'On' : 'Off'}
        </button>
        <span className="file-icon">
          <Icon size={17} />
        </span>
        <span className={`status-pill ${item.status}`}>{item.status}</span>
      </div>
      <div className="file-card-body">
        <strong>{item.name}</strong>
        <small>{item.mimeType || 'unknown'}</small>
        <small>{formatBytes(item.sizeBytes)}</small>
      </div>
      <div className="file-card-links">
        <button type="button" onClick={(e) => { e.stopPropagation(); void onFileOpen(item); }}>
          <FolderOpen size={16} />
          Open
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); void onFileDownload(item); }}>
          <Download size={16} />
          Download
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(item); }}>
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </article>
  );
}

async function readJson(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function uploadFile(uploadUrl, file, fileType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', fileType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(new Error('File upload failed'));
    };

    xhr.onerror = () => reject(new Error('File upload failed'));
    xhr.send(file);
  });
}

async function uploadSingleFile({ clientId, file, authState, onProgress }) {
  const fileType = file.type || 'application/octet-stream';

  const metaRes = await apiFetch('/api/v1/uploads/generate-upload-url', {
    method: 'POST',
    body: JSON.stringify({
      clientId,
      fileName: file.name,
      fileType,
      fileSize: file.size,
    }),
  }, authState);

  const meta = await readJson(metaRes);

  await uploadFile(meta.upload.uploadUrl, file, fileType, onProgress);

  const confirmRes = await apiFetch(`/api/v1/uploads/${meta.file.id}/confirm`, {
    method: 'POST',
  }, authState);
  await readJson(confirmRes);

  return meta.file;
}

async function handleOpenFile(file, authState, onError) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  try {
    const { blob } = await fetchFileBlob(file.id, authState, false);
    const objectUrl = URL.createObjectURL(blob);

    if (popup) {
      popup.location = objectUrl;
    } else {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }

    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    if (popup) {
      popup.close();
    }
    if (typeof onError === 'function') {
      onError(error);
      return;
    }
    throw error;
  }
}

async function handleDownloadFile(file, authState, onError) {
  try {
    const { blob } = await fetchFileBlob(file.id, authState, true);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = file.name || 'download';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    if (typeof onError === 'function') {
      onError(error);
      return;
    }
    throw error;
  }
}

function withFolderIcons(folders) {
  return folders.map((folder) => ({
    ...folder,
    icon: folderIcons[folder.name] || Folder,
  }));
}

function formatBytes(bytes) {
  if (!bytes) return '-';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes);
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function selectedFileSummary(files) {
  if (files.length === 1) {
    return files[0].name;
  }

  return `${files.length} files selected`;
}

function totalSelectedBytes(files) {
  return files.reduce((total, item) => total + item.size, 0);
}

function normalizeClientIds(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getFileExtension(fileName = '') {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) : '';
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatAction(action) {
  return action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatAuditDescription(log) {
  const name = log.metadata?.originalName || log.metadata?.name;
  const actorRole = log.metadata?.actor?.role || 'system';

  if (name) {
    return `${name} · ${actorRole}`;
  }

  return `${log.entityType} · ${actorRole}`;
}

function buildAppIssue(error) {
  const message = error?.message || 'Unexpected error';
  const normalized = message.toLowerCase();

  if (message.includes('VITE_API_URL')) {
    return {
      kind: 'config',
      title: 'Frontend configuration is incomplete',
      detail: 'Set VITE_API_URL for this environment before using the dashboard.',
    };
  }

  if (normalized.includes('failed to fetch') || normalized.includes('networkerror') || normalized.includes('backend not connected')) {
    return {
      kind: 'backend',
      title: 'Backend is unreachable',
      detail: 'Check that the API is running, the URL is correct, and CORS allows this frontend origin.',
    };
  }

  if (normalized.includes('unauthorized') || normalized.includes('forbidden') || normalized.includes('authentication')) {
    return {
      kind: 'auth',
      title: 'Auth settings need attention',
      detail: 'Refresh your token or dev-header settings, then retry the request.',
    };
  }

  return {
    kind: 'general',
    title: 'Action needs attention',
    detail: message,
  };
}

async function retryIssue(issue, actions) {
  if (!issue || issue.kind === 'config') {
    return;
  }

  if (issue.kind === 'auth') {
    await actions.syncAuthPreview();
    return;
  }

  if (issue.kind === 'backend') {
    await Promise.allSettled([actions.loadSystemInfo(), actions.loadClients(), actions.syncAuthPreview()]);
    return;
  }

  await actions.handleRefresh();
}

function isImageMimeType(mimeType) {
  return typeof mimeType === 'string' && mimeType.startsWith('image/');
}

function isVideoMimeType(mimeType) {
  return typeof mimeType === 'string' && mimeType.startsWith('video/');
}

function isPreviewableMimeType(mimeType) {
  return isImageMimeType(mimeType) || isVideoMimeType(mimeType) || mimeType === 'application/pdf';
}
