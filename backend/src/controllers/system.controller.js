import { getRuntimeSystemInfo } from '../services/runtime.service.js';

export function getSystemInfo(_req, res) {
  res.json({
    system: getRuntimeSystemInfo(),
  });
}
