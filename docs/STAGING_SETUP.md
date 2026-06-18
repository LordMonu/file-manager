# Staging Setup

Use staging as the last stop before production.

The goal is simple:

- test real uploads
- test real permissions
- test real deployment flow
- keep production data untouched

## 1. Keep Staging Separate

Use separate resources for staging:

- separate backend service
- separate database
- separate Spaces bucket
- separate frontend deployment
- separate API keys

Recommended naming pattern:

```text
Backend service: manage-files-api-staging
Database: manage-files-db-staging
Bucket: manage-files-staging
Frontend domain: staging-your-app.vercel.app
```

## 2. Environment Files

Use these templates:

- [backend/.env.staging.example](/Users/vidhipalnesto/Documents/projects/palnesto/manage-files/backend/.env.staging.example)
- [frontend/.env.staging.example](/Users/vidhipalnesto/Documents/projects/palnesto/manage-files/frontend/.env.staging.example)

Production should continue using:

- [backend/.env.production.example](/Users/vidhipalnesto/Documents/projects/palnesto/manage-files/backend/.env.production.example)
- [frontend/.env.production.example](/Users/vidhipalnesto/Documents/projects/palnesto/manage-files/frontend/.env.production.example)

## 3. Staging Backend Rules

Recommended backend values:

```env
NODE_ENV=production
BACKEND_PUBLIC_URL=https://staging-api.your-domain.com
CORS_ORIGIN=https://staging-your-app.vercel.app
STORAGE_DRIVER=spaces
DATABASE_URL=postgresql://.../manage_files_staging
DO_SPACES_BUCKET=manage-files-staging
AUTH_MODE=api-key
```

Even for staging, use `NODE_ENV=production` so the runtime behaves like a real deploy.

## 4. Staging Frontend Rules

Recommended frontend values:

```env
VITE_APP_ENV=staging
VITE_API_URL=https://staging-api.your-domain.com
```

This makes the dashboard runtime card clearly show `staging env`.

## 5. Staging Client Naming

Use clearly marked test clients:

```text
Staging Demo Client
Staging Internal QA
Staging Client A
```

Avoid mixing production-like client names into staging if it can confuse your team.

## 6. What To Test In Staging

Before promoting anything to production, verify:

- backend `/health` works
- backend `/api/v1/system` shows `spaces` and `postgres`
- frontend loads with `staging env`
- client creation works
- image upload works
- PDF upload works
- open works
- download works
- audit logs work
- client isolation works

## 7. Promotion Rule

Only move to production after staging passes the full flow with:

- one admin test
- one restricted client test
- at least one image upload
- at least one PDF upload

## 8. What Must Stay Different From Production

Never share these between staging and production:

- database
- Spaces bucket
- admin API key
- client API key
- frontend domain

You can share the same codebase and deployment process. You should not share the data plane.
