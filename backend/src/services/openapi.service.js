import { env } from '../config/env.js';

export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Manage Files API',
      version: '1.0.0',
      description:
        'Multi-client file management API for client creation, upload URL generation, folder browsing, protected file access, and audit logging.',
    },
    servers: [
      {
        url: env.BACKEND_PUBLIC_URL,
        description: 'Configured backend base URL',
      },
    ],
    tags: [
      { name: 'Health' },
      { name: 'System' },
      { name: 'Auth' },
      { name: 'Clients' },
      { name: 'Uploads' },
      { name: 'Folders' },
      { name: 'Files' },
      { name: 'Audit Logs' },
    ],
    components: {
      parameters: {
        ClientId: {
          name: 'clientId',
          in: 'query',
          required: true,
          schema: { type: 'string' },
        },
        FileId: {
          name: 'fileId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        Page: {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        Limit40: {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 40 },
        },
        Limit50: {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
      headers: {
        DevRole: {
          description: 'Temporary development auth role. In production this should be replaced by real auth.',
          schema: { type: 'string', enum: ['admin', 'client'] },
        },
        DevClientIds: {
          description: 'Comma-separated client ids allowed for a temporary client user.',
          schema: { type: 'string' },
        },
      },
      schemas: {
        Health: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: true },
            service: { type: 'string', example: 'manage-files-backend' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['ok', 'service', 'timestamp'],
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clt_123abc' },
            name: { type: 'string', example: 'Client A' },
            slug: { type: 'string', example: 'client-a' },
            status: { type: 'string', example: 'active' },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'name', 'slug', 'status', 'createdAt'],
        },
        Folder: {
          type: 'object',
          properties: {
            name: { type: 'string', enum: ['images', 'videos', 'pdfs', 'docs'] },
            label: { type: 'string' },
            fileCount: { type: 'integer', minimum: 0 },
          },
          required: ['name', 'label', 'fileCount'],
        },
        File: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'fil_123abc' },
            clientId: { type: 'string', example: 'clt_123abc' },
            name: { type: 'string', example: 'proposal.pdf' },
            mimeType: { type: 'string', example: 'application/pdf' },
            folder: { type: 'string', enum: ['images', 'videos', 'pdfs', 'docs'] },
            sizeBytes: { type: ['integer', 'null'], example: 124000 },
            status: { type: 'string', example: 'uploaded' },
            objectKey: { type: 'string', example: 'clients/clt_123abc/pdfs/fil_123abc-proposal.pdf' },
            viewUrl: { type: 'string', format: 'uri' },
            downloadUrl: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' },
            uploadedAt: { type: ['string', 'null'], format: 'date-time' },
          },
          required: [
            'id',
            'clientId',
            'name',
            'mimeType',
            'folder',
            'status',
            'objectKey',
            'viewUrl',
            'downloadUrl',
            'createdAt',
          ],
        },
        PendingUploadFile: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'fil_123abc' },
            clientId: { type: 'string', example: 'clt_123abc' },
            originalName: { type: 'string', example: 'proposal.pdf' },
            storedName: { type: 'string', example: 'fil_123abc-proposal.pdf' },
            folder: { type: 'string', enum: ['images', 'videos', 'pdfs', 'docs'] },
            objectKey: { type: 'string', example: 'clients/clt_123abc/pdfs/fil_123abc-proposal.pdf' },
            status: { type: 'string', example: 'pending' },
          },
          required: ['id', 'clientId', 'originalName', 'storedName', 'folder', 'objectKey', 'status'],
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1 },
            total: { type: 'integer', minimum: 0 },
            hasMore: { type: 'boolean' },
          },
          required: ['page', 'limit', 'total', 'hasMore'],
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'aud_123abc' },
            actorUserId: { type: ['string', 'null'] },
            clientId: { type: ['string', 'null'] },
            action: { type: 'string', example: 'file.upload.confirmed' },
            entityType: { type: 'string', example: 'file' },
            entityId: { type: ['string', 'null'] },
            metadata: { type: 'object', additionalProperties: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'action', 'entityType', 'metadata', 'createdAt'],
        },
        UserMembership: {
          type: 'object',
          properties: {
            clientId: { type: 'string', example: 'clt_123abc' },
            role: { type: 'string', enum: ['viewer', 'uploader', 'manager'] },
          },
          required: ['clientId', 'role'],
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'usr_123abc' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'client'] },
            status: { type: 'string', enum: ['active', 'disabled'] },
            clientIds: {
              type: 'array',
              items: { type: 'string' },
            },
            clientAccess: {
              type: 'array',
              items: { $ref: '#/components/schemas/UserMembership' },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'email', 'name', 'role', 'status', 'clientIds', 'clientAccess', 'createdAt'],
        },
        Error: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Not Found' },
          },
          required: ['ok', 'error'],
        },
      },
      responses: {
        BadRequest: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Backend health check',
          responses: {
            200: {
              description: 'Service status',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Health' },
                },
              },
            },
          },
        },
      },
      '/api/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'API health check',
          responses: {
            200: {
              description: 'Service status',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Health' },
                },
              },
            },
          },
        },
      },
      '/api/v1/system': {
        get: {
          tags: ['System'],
          summary: 'Read non-secret runtime settings for the frontend',
          responses: {
            200: {
              description: 'Runtime system info',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      system: {
                        type: 'object',
                        properties: {
                          authMode: { type: 'string', enum: ['dev', 'api-key', 'jwt'] },
                          storageDriver: { type: 'string', enum: ['mock', 'spaces'] },
                          databaseMode: { type: 'string', enum: ['memory', 'postgres'] },
                          maxUploadSizeMb: { type: 'integer' },
                          folders: {
                            type: 'array',
                            items: { type: 'string' },
                          },
                        },
                        required: ['authMode', 'storageDriver', 'databaseMode', 'maxUploadSizeMb', 'folders'],
                      },
                    },
                    required: ['system'],
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/clients': {
        get: {
          tags: ['Clients'],
          summary: 'List clients visible to the current user',
          parameters: [headerParameter('x-user-role'), headerParameter('x-client-ids')],
          responses: {
            200: {
              description: 'Clients list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      clients: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Client' },
                      },
                    },
                    required: ['clients'],
                  },
                },
              },
            },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          tags: ['Clients'],
          summary: 'Create a new client',
          parameters: [headerParameter('x-user-role'), headerParameter('x-client-ids')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    clientName: { type: 'string', minLength: 2, maxLength: 120 },
                  },
                  required: ['clientName'],
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Created client',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      client: { $ref: '#/components/schemas/Client' },
                    },
                    required: ['client'],
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
            403: { $ref: '#/components/responses/Forbidden' },
            429: { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/api/v1/me': {
        get: {
          tags: ['Auth'],
          summary: 'Inspect the active authenticated user',
          parameters: [headerParameter('x-user-role'), headerParameter('x-client-ids')],
          responses: {
            200: {
              description: 'Current user',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: ['string', 'null'] },
                          name: { type: ['string', 'null'] },
                          role: { type: 'string', enum: ['admin', 'client'] },
                          clientIds: {
                            type: 'array',
                            items: { type: 'string' },
                          },
                          clientAccess: {
                            type: 'object',
                            additionalProperties: { type: 'string', enum: ['viewer', 'uploader', 'manager'] },
                          },
                          authMode: { type: 'string', enum: ['dev', 'api-key', 'jwt'] },
                        },
                        required: ['id', 'role', 'clientIds', 'clientAccess', 'authMode'],
                      },
                    },
                    required: ['user'],
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/uploads/generate-upload-url': {
        post: {
          tags: ['Uploads'],
          summary: 'Generate a signed upload URL and file metadata record',
          parameters: [headerParameter('x-user-role'), headerParameter('x-client-ids')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    clientId: { type: 'string' },
                    fileName: { type: 'string', maxLength: 255 },
                    fileType: { type: 'string', maxLength: 120 },
                    fileSize: { type: 'integer', minimum: 1 },
                  },
                  required: ['clientId', 'fileName'],
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Upload URL generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      file: { $ref: '#/components/schemas/PendingUploadFile' },
                      upload: {
                        type: 'object',
                        properties: {
                          uploadUrl: { type: 'string', format: 'uri' },
                          expiresIn: { type: 'integer' },
                          publicUrl: { type: 'string', format: 'uri' },
                        },
                        required: ['uploadUrl', 'expiresIn', 'publicUrl'],
                      },
                    },
                    required: ['file', 'upload'],
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
            403: { $ref: '#/components/responses/Forbidden' },
            413: {
              description: 'Upload size too large',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            429: { $ref: '#/components/responses/TooManyRequests' },
          },
        },
      },
      '/api/v1/auth/bootstrap': {
        post: {
          tags: ['Auth'],
          summary: 'Create the first admin user when no users exist yet',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                    password: { type: 'string', minLength: 8 },
                  },
                  required: ['email', 'name', 'password'],
                },
              },
            },
          },
          responses: {
            201: { description: 'Bootstrap admin created' },
            409: { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Authenticate with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            200: { description: 'JWT token issued' },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/auth/users': {
        get: {
          tags: ['Auth'],
          summary: 'List users visible to the current admin',
          parameters: [headerParameter('x-user-role'), headerParameter('x-client-ids')],
          responses: {
            200: {
              description: 'User list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' },
                      },
                    },
                    required: ['users'],
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          tags: ['Auth'],
          summary: 'Create a new admin or client user',
          parameters: [headerParameter('x-user-role'), headerParameter('x-client-ids')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string', minLength: 1, maxLength: 120 },
                    password: { type: 'string', minLength: 8, maxLength: 200 },
                    role: { type: 'string', enum: ['admin', 'client'] },
                    clientAccess: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/UserMembership' },
                    },
                  },
                  required: ['email', 'name', 'password', 'role'],
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                    },
                    required: ['user'],
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
            401: { $ref: '#/components/responses/Unauthorized' },
            403: { $ref: '#/components/responses/Forbidden' },
            409: { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/api/v1/uploads/{fileId}/confirm': {
        post: {
          tags: ['Uploads'],
          summary: 'Mark a generated file as uploaded',
          parameters: [
            headerParameter('x-user-role'),
            headerParameter('x-client-ids'),
            { $ref: '#/components/parameters/FileId' },
          ],
          responses: {
            200: {
              description: 'Upload confirmed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      file: { $ref: '#/components/schemas/PendingUploadFile' },
                    },
                    required: ['file'],
                  },
                },
              },
            },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/folders': {
        get: {
          tags: ['Folders'],
          summary: 'List folders and file counts for a client',
          parameters: [
            headerParameter('x-user-role'),
            headerParameter('x-client-ids'),
            { $ref: '#/components/parameters/ClientId' },
          ],
          responses: {
            200: {
              description: 'Folder list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      folders: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Folder' },
                      },
                    },
                    required: ['folders'],
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/api/v1/files': {
        get: {
          tags: ['Files'],
          summary: 'List files for a client and optional folder/search filter',
          parameters: [
            headerParameter('x-user-role'),
            headerParameter('x-client-ids'),
            { $ref: '#/components/parameters/ClientId' },
            {
              name: 'folder',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['images', 'videos', 'pdfs', 'docs'] },
            },
            {
              name: 'q',
              in: 'query',
              required: false,
              schema: { type: 'string', maxLength: 120 },
            },
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit40' },
          ],
          responses: {
            200: {
              description: 'Files list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      files: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/File' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                    required: ['files', 'pagination'],
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/api/v1/files/{fileId}': {
        get: {
          tags: ['Files'],
          summary: 'Get file metadata',
          parameters: [
            headerParameter('x-user-role'),
            headerParameter('x-client-ids'),
            { $ref: '#/components/parameters/FileId' },
          ],
          responses: {
            200: {
              description: 'File metadata',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      file: { $ref: '#/components/schemas/File' },
                    },
                    required: ['file'],
                  },
                },
              },
            },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Files'],
          summary: 'Delete a file and remove its stored object',
          parameters: [
            headerParameter('x-user-role'),
            headerParameter('x-client-ids'),
            { $ref: '#/components/parameters/FileId' },
          ],
          responses: {
            200: {
              description: 'Deleted file metadata',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      file: { $ref: '#/components/schemas/File' },
                    },
                    required: ['file'],
                  },
                },
              },
            },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/files/{fileId}/content': {
        get: {
          tags: ['Files'],
          summary: 'View or download file content',
          parameters: [
            headerParameter('x-user-role'),
            headerParameter('x-client-ids'),
            { $ref: '#/components/parameters/FileId' },
            {
              name: 'download',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['1'] },
              description: 'Set to 1 to force download behavior',
            },
          ],
          responses: {
            200: {
              description: 'Binary content streamed by the backend after access checks',
              content: {
                'application/octet-stream': {
                  schema: {
                    type: 'string',
                    format: 'binary',
                  },
                },
              },
            },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/audit-logs': {
        get: {
          tags: ['Audit Logs'],
          summary: 'List audit logs',
          parameters: [
            headerParameter('x-user-role'),
            headerParameter('x-client-ids'),
            {
              name: 'clientId',
              in: 'query',
              required: false,
              schema: { type: 'string' },
            },
            {
              name: 'action',
              in: 'query',
              required: false,
              schema: { type: 'string', maxLength: 120 },
            },
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit50' },
          ],
          responses: {
            200: {
              description: 'Audit log list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      auditLogs: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/AuditLog' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                    required: ['auditLogs', 'pagination'],
                  },
                },
              },
            },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
    },
  };
}

function headerParameter(name) {
  return {
    name,
    in: 'header',
    required: false,
    schema:
      name === 'x-user-role'
        ? { type: 'string', enum: ['admin', 'client'] }
        : { type: 'string' },
  };
}
