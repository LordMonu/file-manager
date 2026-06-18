# Deployment Guide

For the exact first go-live order, use the dedicated runbook:

- [First Production Launch](FIRST_PRODUCTION_LAUNCH.md)
- [Staging Setup](STAGING_SETUP.md)

This project is a single GitHub repository with two deployable apps:

```text
manage-files/
  frontend/  -> Vercel
  backend/   -> API host
```

Use one repo for development. Deploy frontend and backend separately.

## Recommended Production Shape

```text
User browser
  -> Vercel frontend
  -> Backend API service
  -> PostgreSQL database
  -> DigitalOcean Spaces
```

## 1. Push To GitHub

Create one GitHub repository for the full project.

```bash
git init
git add .
git commit -m "Initial file management system"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

Keep `frontend/` and `backend/` in the same repo. That makes it easier to update API and UI together.

## 2. Deploy Frontend On Vercel

In Vercel:

1. Click `Add New Project`.
2. Import the same GitHub repository.
3. Set `Root Directory` to:

```text
frontend
```

4. Keep the framework as `Vite`.
5. Set the build command:

```bash
npm run build
```

6. Set the output directory:

```text
dist
```

7. Add the frontend environment variable:

```env
VITE_APP_ENV=production
VITE_API_URL=https://your-backend-domain.com
```

After deployment, copy the Vercel production URL. You will add it to the backend `CORS_ORIGIN`.

This repo also includes:

```text
frontend/.env.production.example
```

Set `VITE_API_URL` explicitly in Vercel. The frontend does not silently use `localhost` outside development mode.

## 3. Deploy Backend

Deploy `backend/` as a separate Node.js service. Good options:

- DigitalOcean App Platform
- Render
- Railway
- Fly.io
- A VPS running Node.js

This repo includes a ready starting point for Render:

```text
render.yaml
backend/.env.production.example
```

If you use Render Blueprint deploys, import the repo and let Render read `render.yaml`.

Backend settings:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm run start
Node Version: 20+
```

Backend environment variables:

```env
PORT=4000
NODE_ENV=production
BACKEND_PUBLIC_URL=https://your-backend-domain.com
CORS_ORIGIN=https://your-frontend.vercel.app
STORAGE_DRIVER=spaces
DATABASE_URL=postgresql://...
DO_SPACES_ENDPOINT=https://<region>.digitaloceanspaces.com
DO_SPACES_REGION=<region>
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=...
DO_SPACES_PUBLIC_BASE_URL=https://<bucket>.<region>.digitaloceanspaces.com
UPLOAD_URL_EXPIRES_SECONDS=900
READ_URL_EXPIRES_SECONDS=300
MAX_UPLOAD_SIZE_MB=200
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120
UPLOAD_RATE_LIMIT_MAX_REQUESTS=20
AUTH_MODE=api-key
ADMIN_API_KEY=...
CLIENT_API_KEY=...
CLIENT_API_KEY_CLIENT_IDS=clt_123,clt_456
```

For local plus production access during testing:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
```

## 4. Database Setup

Use PostgreSQL for production.

After setting `DATABASE_URL`, run migrations from the backend service environment:

```bash
npm run db:migrate
```

If the hosting provider supports a release command, use:

```bash
npm run db:migrate
```

The app can run without PostgreSQL only in development-style mock mode. Production should use a database.

If you use the included `render.yaml`, the backend service is already wired to a managed Render PostgreSQL database through `DATABASE_URL`.

## 5. DigitalOcean Spaces Setup

Create one Space and keep all clients isolated by object key prefix:

```text
clients/{clientId}/images/{fileId}-{filename}
clients/{clientId}/videos/{fileId}-{filename}
clients/{clientId}/pdfs/{fileId}-{filename}
clients/{clientId}/docs/{fileId}-{filename}
```

Recommended Spaces settings:

- Region: choose the closest available region to your users.
- Storage type: standard object storage.
- CDN: optional. Start with CDN off unless you need faster public asset delivery.
- Access: keep uploads controlled by backend-generated signed URLs.

Only these values should change when moving from personal to company DigitalOcean:

```env
DO_SPACES_KEY
DO_SPACES_SECRET
DO_SPACES_BUCKET
DO_SPACES_ENDPOINT
DO_SPACES_REGION
DO_SPACES_PUBLIC_BASE_URL
```

## 6. Production Safety Checklist

Before real company use:

- Use JWT login in production and keep temporary header-based auth only for local work.
- Keep `NODE_ENV=production`.
- Set `STORAGE_DRIVER=spaces`.
- Set a real `DATABASE_URL`.
- Ensure `CORS_ORIGIN` contains only trusted frontend domains.
- Keep all DigitalOcean secrets in backend environment variables only.
- Do not expose Spaces keys in Vercel/frontend environment variables.
- Keep auth keys in backend environment variables only.
- Tune API rate limits for your traffic profile.
- Run `npm audit`.
- Run `npm run test:smoke`.
- Run `npm run build:frontend`.

## 7. Local Testing Before Deploy

From the repo root:

```bash
npm run test:smoke
npm run build:frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend health:

```text
http://localhost:4000/health
```
