export function notFound(_req, res) {
  res.status(404).json({
    ok: false,
    error: 'Not Found',
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || err.status || 500;

  res.status(status).json({
    ok: false,
    error: err.message || 'Internal Server Error',
  });
}
