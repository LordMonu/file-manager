const AUTH_STORAGE_KEY = 'manage-files-auth';
const ENVIRONMENT_LABEL = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';
const API_URL = resolveApiUrl();

function resolveApiUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:4000';
  }

  return '';
}

export function getApiUrl() {
  return API_URL;
}

export function getEnvironmentLabel() {
  return ENVIRONMENT_LABEL;
}

export function readAuthState() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function writeAuthState(state) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function buildAuthHeaders(authState) {
  const headers = {};

  if ((authState.authMode === 'api-key' || authState.authMode === 'jwt') && authState.authToken?.trim()) {
    headers.Authorization = `Bearer ${authState.authToken.trim()}`;
    return headers;
  }

  if (authState.authUserId?.trim()) {
    headers['x-user-id'] = authState.authUserId.trim();
  }

  if (authState.authRole?.trim()) {
    headers['x-user-role'] = authState.authRole.trim();
  }

  if (authState.authClientIds?.trim()) {
    headers['x-client-ids'] = authState.authClientIds;
  }

  return headers;
}

export async function apiFetch(path, options = {}, authState = {}) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured for this environment');
  }

  const headers = {
    ...(options.headers || {}),
    ...buildAuthHeaders(authState),
  };

  if (options.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

export async function fetchFileBlob(fileId, authState = {}, download = false) {
  const path = `/api/v1/files/${fileId}/content${download ? '?download=1' : ''}`;
  const response = await apiFetch(path, { method: 'GET' }, authState);

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get('content-type') || '',
  };
}
