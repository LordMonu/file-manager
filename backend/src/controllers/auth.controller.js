import { bootstrapAdmin, createUser, listUsers, login } from '../services/auth.service.js';

export async function bootstrap(req, res) {
  const user = await bootstrapAdmin(req.body || {});
  res.status(201).json({ user });
}

export async function loginController(req, res) {
  const result = await login(req.body || {});
  res.json(result);
}

export async function createUserController(req, res) {
  const user = await createUser(req.body || {});
  res.status(201).json({ user });
}

export async function listUsersController(_req, res) {
  res.json({ users: await listUsers() });
}
