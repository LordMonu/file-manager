# Frontend

This is the Vite React app for the file management dashboard.

## Local development

From the repo root:

```bash
npm run dev:frontend
```

Or run both apps together:

```bash
npm run dev
```

The frontend expects:

```env
VITE_API_URL=http://localhost:4000
```

Ready examples are included:

```text
frontend/.env.development.example
frontend/.env.staging.example
frontend/.env.production.example
```

`VITE_APP_ENV` is optional, but helpful for showing the current environment label inside the dashboard.

The auth panel supports:

- `Dev headers`
- `JWT login`
- `Bearer token`

## Vercel deployment from a single GitHub repo

When you import the repo into Vercel:

1. Select the same GitHub repo that contains both `frontend/` and `backend/`.
2. Set `Root Directory` to `frontend`.
3. Keep the detected framework as `Vite`.
4. Use build command `npm run build`.
5. Use output directory `dist`.
6. Add `VITE_API_URL` pointing to your deployed backend URL.

Example:

```env
VITE_API_URL=https://your-backend-domain.com
```

Do not leave `VITE_API_URL` empty in production. The frontend now throws a clear runtime error instead of silently falling back to `localhost`.

Vercel will then deploy only the frontend app from this monorepo.
