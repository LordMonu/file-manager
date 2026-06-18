# File Management System

Monorepo scaffold for a multi-client file management system.

## Structure

```text
root/
  frontend/
  backend/
```

## Deployment model

- `frontend/` deploys to Vercel as a standalone frontend app.
- `backend/` deploys separately as an API service.
- One GitHub repo keeps development simple.
- Two deploy targets keep production clean.

## Local development

Use the frontend and backend as independent apps, but keep them in one repo so API contracts and UI can evolve together.

Run both apps together:

```bash
npm run dev
```

Run only the backend:

```bash
npm run dev:backend
```

Run only the frontend:

```bash
npm run dev:frontend
```

Run database migrations when `DATABASE_URL` is configured:

```bash
npm run db:migrate
```

Run the backend smoke test:

```bash
npm run test:smoke
```

## CI

GitHub Actions runs the same core checks used locally:

```text
npm ci
npm audit
backend syntax check
npm run test:smoke
npm run build:frontend
```

## Detailed docs

- [Deployment Guide](docs/DEPLOYMENT.md)
- [First Production Launch](docs/FIRST_PRODUCTION_LAUNCH.md)
- [Staging Setup](docs/STAGING_SETUP.md)
- [API Design](docs/API.md)
- [Render Blueprint](render.yaml)

Live backend docs endpoints:

- `/openapi.json`
- `/docs`

## Recommended environment variables

Backend:

```env
PORT=4000
NODE_ENV=development
BACKEND_PUBLIC_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
STORAGE_DRIVER=mock
DATABASE_URL=
DO_SPACES_ENDPOINT=
DO_SPACES_REGION=
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_BUCKET=
DO_SPACES_PUBLIC_BASE_URL=
UPLOAD_URL_EXPIRES_SECONDS=900
READ_URL_EXPIRES_SECONDS=300
MAX_UPLOAD_SIZE_MB=200
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
UPLOAD_RATE_LIMIT_MAX_REQUESTS=20
JWT_SECRET=
JWT_EXPIRES_SECONDS=3600
AUTH_MODE=dev
ADMIN_API_KEY=
CLIENT_API_KEY=
CLIENT_API_KEY_CLIENT_IDS=
```

Frontend:

```env
VITE_API_URL=http://localhost:4000
VITE_APP_ENV=development
```

## CORS

Use `CORS_ORIGIN` as a comma-separated list when both local and deployed frontend URLs should call the backend:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
```

## Persistence

The backend uses PostgreSQL when `DATABASE_URL` is configured.

For early local development, if `DATABASE_URL` is empty, the app falls back to in-memory repositories. That makes health checks, client creation, and UI testing possible before a hosted database is ready. In-memory data resets every time the backend restarts.

## Storage modes

Use mock storage while DigitalOcean setup is paused:

```env
STORAGE_DRIVER=mock
BACKEND_PUBLIC_URL=http://localhost:4000
```

Mock storage keeps uploaded files in backend memory. This is useful for testing the full frontend upload flow locally, but files reset when the backend restarts.

Use DigitalOcean Spaces later:

```env
STORAGE_DRIVER=spaces
DO_SPACES_ENDPOINT=https://<region>.digitaloceanspaces.com
DO_SPACES_REGION=<region>
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=...
DO_SPACES_PUBLIC_BASE_URL=https://<bucket>.<region>.digitaloceanspaces.com
READ_URL_EXPIRES_SECONDS=300
```

In `spaces` mode, upload URLs and read/download URLs are both signed by the backend. File content URLs are only issued after the backend checks client access.

## Authentication

The backend supports three auth modes:

- `AUTH_MODE=dev`
- `AUTH_MODE=api-key`
- `AUTH_MODE=jwt`

JWT mode adds app login with email/password plus signed bearer tokens.
Admin users can also manage team access through `/api/v1/auth/users`.

Core auth endpoints:

```text
POST /api/v1/auth/bootstrap
POST /api/v1/auth/login
GET /api/v1/auth/users
POST /api/v1/auth/users
```

Use `bootstrap` once to create the first admin when the user store is still empty.

## Development auth

For fast local work, the backend can still use request headers to simulate roles.

In development, requests default to an admin user when no auth headers are sent.

Client-scoped testing can use:

```text
x-user-role: client
x-client-ids: clt_example123
```

Production uses JWT login for interactive users or backend-only bearer tokens for service access. The temporary `x-user-role` headers stay local to development.

## Auth modes

Three auth paths are supported:

- `AUTH_MODE=dev` keeps the temporary header-based flow for local work.
- `AUTH_MODE=api-key` enables bearer-token auth using backend-only secrets:
- `AUTH_MODE=jwt` enables email/password login and signed JWT sessions:

```env
ADMIN_API_KEY=...
CLIENT_API_KEY=...
CLIENT_API_KEY_CLIENT_IDS=clt_123,clt_456
JWT_SECRET=replace-with-long-random-secret
JWT_EXPIRES_SECONDS=3600
```

JWT mode also supports client membership roles:

- `viewer`
- `uploader`
- `manager`

The client API key is restricted to the listed client ids. JWT mode is the better path for real product auth.

## Startup validation

The backend now fails fast for incomplete production-style configuration:

- `STORAGE_DRIVER=spaces` requires all DigitalOcean Spaces variables.
- `AUTH_MODE=api-key` requires both API keys and scoped client ids.
- `AUTH_MODE=jwt` requires `JWT_SECRET`.

That makes deployment mistakes visible at startup instead of surfacing later during uploads or access checks.

## Rate limiting

The backend applies a lightweight in-memory rate limiter:

- All `/api/v1` requests use `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.
- Upload URL generation also uses `UPLOAD_RATE_LIMIT_MAX_REQUESTS`.

This is enough for a single-instance deployment. For multi-instance production later, move rate limiting to Redis or your edge provider.

## Audit logs

Successful client, upload, and delete workflows write audit events.
File view and download requests are also audited when they pass through the backend-controlled file content endpoint.

Admins can read them with:

```text
GET /api/v1/audit-logs
GET /api/v1/audit-logs?clientId=clt_example&page=1&limit=50
```
