# API Design

Base URL:

```text
/api/v1
```

OpenAPI endpoints:

```text
GET /openapi.json
GET /docs
```

Runtime info endpoint:

```text
GET /api/v1/system
```

During development, requests without auth headers act as an admin user. Client isolation can be tested with:

```text
x-user-role: client
x-client-ids: clt_example123
```

JWT auth endpoints:

```http
POST /api/v1/auth/bootstrap
POST /api/v1/auth/login
GET /api/v1/auth/users
POST /api/v1/auth/users
```

## Health

```http
GET /health
```

Response:

```json
{
  "ok": true,
  "service": "manage-files-backend",
  "timestamp": "2026-06-17T00:00:00.000Z"
}
```

## Create Client

```http
POST /api/v1/clients
Content-Type: application/json
```

Body:

```json
{
  "clientName": "Client A"
}
```

Behavior:

- Creates a client record.
- Creates logical folders: `images`, `videos`, `pdfs`, `docs`.
- Writes an audit log event.

## List Clients

```http
GET /api/v1/clients
```

Admins can list all active clients. Client users only receive their allowed clients.

## Auth Bootstrap

```http
POST /api/v1/auth/bootstrap
```

Creates the first admin user when the user store is empty.

## Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@example.com",
  "password": "supersecret1"
}
```

Returns a signed JWT plus the authenticated user profile.

## List Users

```http
GET /api/v1/auth/users
```

Admin only. Returns the user list plus assigned client memberships.

## Create User

```http
POST /api/v1/auth/users
Content-Type: application/json
```

Body:

```json
{
  "email": "manager@example.com",
  "name": "Client Manager",
  "password": "supersecret1",
  "role": "client",
  "clientAccess": [
    {
      "clientId": "clt_123",
      "role": "manager"
    }
  ]
}
```

Use `role: "admin"` for internal users and `role: "client"` for client users. Client users must be assigned to at least one client.

## Generate Upload URL

```http
POST /api/v1/uploads/generate-upload-url
Content-Type: application/json
```

Body:

```json
{
  "clientId": "clt_123",
  "fileName": "proposal.pdf",
  "fileType": "application/pdf",
  "fileSize": 124000
}
```

Response:

```json
{
  "file": {
    "id": "fil_123",
    "clientId": "clt_123",
    "originalName": "proposal.pdf",
    "storedName": "fil_123-proposal.pdf",
    "folder": "pdfs",
    "objectKey": "clients/clt_123/pdfs/fil_123-proposal.pdf",
    "status": "pending"
  },
  "upload": {
    "uploadUrl": "https://...",
    "method": "PUT",
    "headers": {
      "Content-Type": "application/pdf"
    },
    "expiresIn": 900
  }
}
```

Routing:

```text
image/*           -> images
video/*           -> videos
application/pdf   -> pdfs
everything else   -> docs
```

If the browser sends a generic type such as `application/octet-stream`, the backend falls back to the file extension for routing.

Executable and script-style uploads such as `.exe`, `.bat`, `.cmd`, `.sh`, and `.js` are rejected.

Object key format:

```text
clients/{clientId}/{folder}/{fileId}-{safeFileName}
```

## Confirm Upload

```http
POST /api/v1/uploads/{fileId}/confirm
```

Marks a generated file record as uploaded after the browser successfully PUTs the file to the upload URL.

## Runtime System Info

```http
GET /api/v1/system
```

Response:

```json
{
  "system": {
    "authMode": "dev",
    "storageDriver": "mock",
    "databaseMode": "memory",
    "maxUploadSizeMb": 200,
    "folders": ["images", "videos", "pdfs", "docs"]
  }
}
```

The frontend uses this endpoint to show the current auth mode, storage driver, database mode, and upload rules without exposing secrets.

## List Folders

```http
GET /api/v1/folders?clientId=clt_123
```

Response contains the four logical folders and file counts.

## List Files

```http
GET /api/v1/files?clientId=clt_123&folder=images&page=1&limit=20&q=banner
```

Query:

```text
clientId  required
folder    optional: images, videos, pdfs, docs
page      optional, default 1
limit     optional, default 20
q         optional search by filename
```

Client isolation is enforced before files are returned.

## View File

```http
GET /api/v1/files/{fileId}/content
```

Behavior:

- Checks access to the file client.
- Writes `file.viewed` audit log.
- Streams the file bytes through the backend.
- In mock mode, bytes come from backend memory.
- In Spaces mode, the backend fetches the signed read URL and proxies the response.

## Download File

```http
GET /api/v1/files/{fileId}/content?download=1
```

Behavior is the same as view, but writes `file.downloaded` and requests download disposition from the backend.

## Delete File

```http
DELETE /api/v1/files/{fileId}
```

Marks the file metadata as deleted, removes the stored object from the active storage driver, and hides the file from listings.

## Audit Logs

```http
GET /api/v1/audit-logs
GET /api/v1/audit-logs?clientId=clt_123&page=1&limit=50
```

Admin only.

Tracked events:

```text
client.created
file.upload_url.generated
file.upload.confirmed
file.deleted
file.viewed
file.downloaded
```
