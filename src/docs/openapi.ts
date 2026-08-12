import { config } from '../config';
import { mobilePathsA } from './mobilePathsA';
import { mobilePathsB } from './mobilePathsB';
import { adminPaths } from './adminPaths';

/**
 * Full OpenAPI 3.0 spec covering BOTH API surfaces:
 *  - Mobile API (envelope contract, form-urlencoded) used by the Flutter app.
 *  - Admin dashboard API (REST JSON + JWT/RBAC).
 * Served via swagger-ui-express at /swagger.
 */
export function buildOpenApiSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Thabayehkom API',
      version: '1.0.0',
      description:
        'Backend for the Thabayehkom Flutter app plus the admin dashboard.\n\n' +
        '### Two surfaces\n' +
        '- **Mobile API** (`/api/...`): every response is HTTP 200 with an envelope ' +
        '`{ status, code, message, ... }`. POST bodies are `application/x-www-form-urlencoded`. ' +
        '`code:222` means a social account must finish sign-up. Custom headers: `fcmToken`, ' +
        '`countryId`, `Accept-Language`, `Authorization: Bearer <jwt>`.\n' +
        '- **Admin API** (`/api/admin/...`): conventional REST `{ success, data, meta }` with real HTTP ' +
        'status codes, JWT bearer auth and role/permission checks.\n\n' +
        'To authorize: call `/login` (mobile) or `/admin/auth/login` (admin), copy the returned token, ' +
        'click **Authorize** and paste it.',
    },
    servers: [{ url: config.apiBasePath, description: 'API base path' }],
    tags: [
      { name: 'App' }, { name: 'Catalog' }, { name: 'Authentication' }, { name: 'Account' },
      { name: 'Addresses' }, { name: 'Cart' }, { name: 'Checkout' }, { name: 'Orders' },
      { name: 'Notifications' }, { name: 'Uploads' }, { name: 'Admin - Auth' }, { name: 'Admin - Dashboard' },
      { name: 'Admin - Resources' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Envelope: {
          type: 'object',
          properties: {
            status: { type: 'boolean', example: true },
            code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'success' },
          },
          additionalProperties: true,
        },
        AdminResult: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {},
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' }, pageSize: { type: 'integer' },
                total: { type: 'integer' }, totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    paths: { ...mobilePathsA(), ...mobilePathsB(), ...adminPaths() },
  };
}
