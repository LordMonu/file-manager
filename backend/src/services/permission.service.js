import { ApiError } from '../utils/ApiError.js';

export function assertAdmin(user) {
  if (user?.role !== 'admin') {
    throw new ApiError(403, 'Admin access required');
  }
}

export function assertCanAccessClient(user, clientId) {
  if (!clientId) {
    throw new ApiError(400, 'clientId is required');
  }

  if (user?.role === 'admin') {
    return;
  }

  if (user?.role === 'client' && user.clientIds?.includes(clientId)) {
    return;
  }

  throw new ApiError(403, 'You do not have access to this client');
}

export function assertCanUploadToClient(user, clientId) {
  if (user?.role === 'admin') {
    return;
  }

  const membershipRole = user?.clientAccess?.[clientId];
  if (membershipRole === 'uploader' || membershipRole === 'manager') {
    return;
  }

  throw new ApiError(403, 'Upload access required');
}

export function assertCanManageClientFiles(user, clientId) {
  if (user?.role === 'admin') {
    return;
  }

  if (user?.clientAccess?.[clientId] === 'manager') {
    return;
  }

  throw new ApiError(403, 'Manager access required');
}
