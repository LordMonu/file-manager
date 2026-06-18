# Backend

This folder is reserved for the Node.js API.

Keep all upload, auth, and Spaces logic here.

## Commands

```bash
npm run dev -w backend
npm run start -w backend
npm run db:migrate -w backend
npm run test:smoke -w backend
```

## Production bootstrap

This repo includes:

- `backend/.env.staging.example` for staging variables
- `backend/.env.production.example` for production variables
- `/render.yaml` for a Render-based backend + Postgres starting point

## Database

Set `DATABASE_URL` to enable PostgreSQL persistence.

If `DATABASE_URL` is empty, repositories use in-memory storage so local development can continue before a database is created.

Migration files live in `src/database/migrations`.

## Storage

The backend supports two storage drivers.

Local mock storage:

```env
STORAGE_DRIVER=mock
BACKEND_PUBLIC_URL=http://localhost:4000
```

DigitalOcean Spaces:

```env
STORAGE_DRIVER=spaces
DO_SPACES_ENDPOINT=https://<region>.digitaloceanspaces.com
DO_SPACES_REGION=<region>
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=...
DO_SPACES_PUBLIC_BASE_URL=https://<bucket>.<region>.digitaloceanspaces.com
READ_URL_EXPIRES_SECONDS=300
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
UPLOAD_RATE_LIMIT_MAX_REQUESTS=20
AUTH_MODE=dev
ADMIN_API_KEY=
CLIENT_API_KEY=
CLIENT_API_KEY_CLIENT_IDS=
```

In Spaces mode, protected file view/download routes generate short-lived signed read URLs after checking client access.

## CORS

Use `CORS_ORIGIN` as a comma-separated list for local and deployed frontend URLs:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
```

## Development auth

In development, requests without headers act as an admin user. To test client isolation, send:

```text
x-user-role: client
x-client-ids: clt_example123
```

JWT auth is available through `/api/v1/auth/bootstrap` and `/api/v1/auth/login`, and admin users can manage team access through `/api/v1/auth/users`.

## Auth modes

- `AUTH_MODE=dev` keeps the temporary header-based flow for local work.
- `AUTH_MODE=api-key` switches the API to backend-only bearer-token auth.
- `AUTH_MODE=jwt` enables email/password login with signed bearer tokens.

Use separate admin and client secrets, and keep client keys scoped with `CLIENT_API_KEY_CLIENT_IDS`.

## Rate limiting

The API currently uses in-memory rate limiting for:

- all `/api/v1` traffic
- upload URL generation

This is a good first production guard for a single backend instance. Move this to Redis or platform edge controls once the app runs across multiple instances.

## Audit logs

The API records successful workflow events for:

```text
client.created
file.upload_url.generated
file.upload.confirmed
file.deleted
file.viewed
file.downloaded
```

Admins can read logs from `GET /api/v1/audit-logs`.
