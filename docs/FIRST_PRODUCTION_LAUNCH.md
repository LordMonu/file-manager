# First Production Launch

Use this runbook for the first real deployment of the file management system.

It is written in the safest order:

1. Create infrastructure
2. Configure backend
3. Verify backend
4. Configure frontend
5. Verify frontend
6. Create first client
7. Test upload and access

## 1. Before You Start

Keep these values ready:

```text
GitHub repository URL
Backend production domain
Frontend Vercel domain
DigitalOcean Spaces bucket name
DigitalOcean Spaces region
DigitalOcean Spaces access key
DigitalOcean Spaces secret key
Admin API key
Client API key
One test client id or test client name
```

## 2. Create Backend Infrastructure

Recommended first launch path:

```text
Backend host: Render
Database: Render PostgreSQL
Object storage: DigitalOcean Spaces
Frontend: Vercel
```

If using Render:

1. Import the GitHub repo.
2. Choose Blueprint deploy.
3. Let Render read [render.yaml](/Users/vidhipalnesto/Documents/projects/palnesto/manage-files/render.yaml).
4. Confirm the web service and PostgreSQL database are created.

## 3. Create DigitalOcean Spaces

Create one Space for all clients.

Recommended choices:

- Storage type: standard
- CDN: off for now
- Access: private through backend-controlled signed URLs

Collect these values:

```env
DO_SPACES_ENDPOINT=https://your-region.digitaloceanspaces.com
DO_SPACES_REGION=your-region
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=your-bucket
DO_SPACES_PUBLIC_BASE_URL=https://your-bucket.your-region.digitaloceanspaces.com
```

## 4. Set Backend Environment Variables

Use [backend/.env.production.example](/Users/vidhipalnesto/Documents/projects/palnesto/manage-files/backend/.env.production.example) as the source of truth.

Minimum required production values:

```env
NODE_ENV=production
BACKEND_PUBLIC_URL=https://your-backend-domain.com
CORS_ORIGIN=https://your-frontend.vercel.app
STORAGE_DRIVER=spaces
AUTH_MODE=api-key
DATABASE_URL=postgresql://...
DO_SPACES_ENDPOINT=...
DO_SPACES_REGION=...
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=...
DO_SPACES_PUBLIC_BASE_URL=...
ADMIN_API_KEY=...
CLIENT_API_KEY=...
CLIENT_API_KEY_CLIENT_IDS=clt_123
```

Important:

- `CLIENT_API_KEY_CLIENT_IDS` must contain only the client ids that this client token may access.
- The backend will fail at startup if the Spaces or API key config is incomplete.

## 5. Verify Backend First

Do this before touching Vercel.

Check health:

```text
GET https://your-backend-domain.com/health
GET https://your-backend-domain.com/api/v1/system
GET https://your-backend-domain.com/docs
```

Expected `GET /api/v1/system` shape:

```json
{
  "system": {
    "authMode": "api-key",
    "storageDriver": "spaces",
    "databaseMode": "postgres",
    "maxUploadSizeMb": 200,
    "folders": ["images", "videos", "pdfs", "docs"]
  }
}
```

Do not continue until all three backend checks succeed.

## 6. Deploy Frontend On Vercel

Import the same GitHub repo in Vercel.

Use:

```text
Root Directory: frontend
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

Set these environment variables:

```env
VITE_APP_ENV=production
VITE_API_URL=https://your-backend-domain.com
```

Use [frontend/.env.production.example](/Users/vidhipalnesto/Documents/projects/palnesto/manage-files/frontend/.env.production.example) as reference.

## 7. Update Backend CORS

After Vercel gives you the final production URL, make sure backend `CORS_ORIGIN` includes it exactly.

Example:

```env
CORS_ORIGIN=https://your-frontend.vercel.app
```

If you still want local testing against production backend for a short time:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
```

## 8. Create First Client

Use admin access first.

You can create the first client from the frontend UI, or directly through the API.

Example request:

```http
POST /api/v1/clients
Authorization: Bearer <ADMIN_API_KEY>
Content-Type: application/json
```

```json
{
  "clientName": "Launch Test Client"
}
```

Save the returned client id. You may need it inside `CLIENT_API_KEY_CLIENT_IDS`.

## 9. Test The Full Flow

Run this sequence with the deployed frontend:

1. Open the Vercel app.
2. Confirm the runtime card shows:
   - `production env`
   - `spaces storage`
   - `postgres data`
3. Create or select the test client.
4. Upload one image.
5. Upload one PDF.
6. Open each file.
7. Download each file.
8. Confirm audit events appear.

Expected outcomes:

- files land in the correct logical folders
- other clients cannot access those files
- uploads succeed without exposing Spaces secrets in the browser

## 10. Production Go-Live Checklist

Mark each item only after verifying it:

- backend health endpoint works
- backend `/api/v1/system` shows `spaces` and `postgres`
- backend docs page loads
- Vercel frontend loads
- frontend points to the production backend URL
- CORS allows the production frontend domain
- admin API key works
- client API key works only for allowed clients
- one image upload succeeds
- one PDF upload succeeds
- open and download both succeed
- audit logs record the actions

## 11. Rollback Plan

If the frontend deploy is bad:

- revert the Vercel deployment to the previous release
- do not change backend or database yet

If the backend deploy is bad:

- roll back the backend service to the last healthy deploy
- keep the same database
- keep the same Spaces bucket
- re-check `/health` and `/api/v1/system`

If Spaces config is wrong:

- fix the Spaces variables
- redeploy the backend
- confirm startup validation passes

## 12. After Launch

Once the first launch is stable, the next practical upgrades are:

- finer-grained permissions beyond the current admin/client model
- Redis or provider-native rate limiting for multi-instance deployments
- delete workflow with object removal in Spaces
- staging environment with separate bucket and database
