export function getMe(req, res) {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email || null,
      name: req.user.name || null,
      role: req.user.role,
      clientIds: req.user.clientIds || [],
      clientAccess: req.user.clientAccess || {},
      authMode: req.user.authMode || 'dev',
    },
  });
}
