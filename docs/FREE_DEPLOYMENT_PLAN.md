# Free Deployment Plan

This plan is for a no-card deployment using:

- Frontend: Vercel Free
- Backend runtime: Cloudflare Workers or Pages Functions
- Database: Neon Free

Important:

- The current backend is Express/Node.
- Cloudflare Workers does not run Express unchanged.
- So the backend must be adapted before deployment.

## Phase 1: Prepare accounts

1. Create a Vercel account.
2. Create a Cloudflare account.
3. Create a Neon account.
4. Keep the GitHub repo as one monorepo with:
   - `frontend/`
   - `backend/`

## Phase 2: Deploy frontend on Vercel

1. Import the GitHub repo into Vercel.
2. Set the root directory to `frontend`.
3. Use the default Vite build.
4. Set the build output to `dist`.
5. Add environment variables:

```env
VITE_API_URL=https://your-backend-url
VITE_APP_ENV=production
```

6. Deploy.

## Phase 3: Create Neon database

1. Create a new Neon project.
2. Create a PostgreSQL database.
3. Copy the connection string.
4. Save it for backend deployment.

Use it as:

```env
DATABASE_URL=...
```

## Phase 4: Adapt backend for Cloudflare

The backend must be moved from Express startup to a worker-style entry point.

Minimum routes to support first:

- `/health`
- `/api/v1/system`
- `/api/v1/auth/bootstrap`
- `/api/v1/auth/login`
- `/api/v1/me`
- `/api/v1/clients`
- `/api/v1/folders`
- `/api/v1/files`

Recommended order:

1. Keep business logic in `services/`.
2. Replace Express routing with worker routing.
3. Replace middleware chaining with request helpers.
4. Keep JWT auth.
5. Keep PostgreSQL access through Neon.

## Phase 5: Add backend environment variables

Use:

```env
NODE_ENV=production
AUTH_MODE=jwt
JWT_SECRET=replace-with-long-random-secret
JWT_EXPIRES_SECONDS=3600
DATABASE_URL=your-neon-connection-string
BACKEND_PUBLIC_URL=https://your-cloudflare-backend-url
CORS_ORIGIN=https://your-vercel-frontend-url
```

If you later add file storage:

```env
STORAGE_DRIVER=spaces
DO_SPACES_ENDPOINT=...
DO_SPACES_REGION=...
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=...
DO_SPACES_PUBLIC_BASE_URL=...
```

## Phase 6: Deploy the backend

1. Create a Cloudflare Worker project.
2. Connect the repo.
3. Point it at the worker entry file.
4. Add the environment variables.
5. Deploy.
6. Verify `/health`.
7. Verify `/api/v1/system`.
8. Verify auth bootstrap and login.

## Phase 7: First-time admin setup

1. Call `POST /api/v1/auth/bootstrap`.
2. Create the first admin.
3. Call `POST /api/v1/auth/login`.
4. Save the JWT token.
5. Confirm `/api/v1/me` works.

## Phase 8: Connect frontend to backend

1. Copy the backend URL from Cloudflare.
2. Set `VITE_API_URL` in Vercel.
3. Redeploy the frontend.
4. Open the frontend and confirm login works.

## Phase 9: Validate core flows

1. Create a client.
2. Create a client user.
3. Confirm client isolation.
4. Confirm folder browsing.
5. Confirm file list access.

## Phase 10: Add file storage

If you want the no-card stack to manage real file uploads, choose one of:

- Cloudflare storage path
- temporary backend file storage for MVP only

Do this after auth and database flow are working.

## Phase 11: Production checklist

1. Confirm CORS is correct.
2. Confirm auth works.
3. Confirm uploads work.
4. Confirm downloads work.
5. Confirm audit logs work.
6. Confirm no secrets are exposed in the frontend.

