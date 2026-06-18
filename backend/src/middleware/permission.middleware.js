import { assertAdmin, assertCanAccessClient } from '../services/permission.service.js';

export function requireAdmin(req, _res, next) {
  try {
    assertAdmin(req.user);
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireClientAccess(source, field = 'clientId') {
  return function clientAccessMiddleware(req, _res, next) {
    try {
      assertCanAccessClient(req.user, req[source]?.[field]);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

