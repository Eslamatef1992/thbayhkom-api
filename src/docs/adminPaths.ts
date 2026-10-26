import { S, I, adminOkResp, jsonBody, pathId, queryPage, listMeta } from './helpers';
import {
  adminRequestExamples, adminResponseExamples, productRequestExample, productResponseExample,
  settingsRequestExample, orderResponseExample, dashboardStatsExample,
  adminLoginRequestExample, adminLoginResponseExample, adminMeExample,
} from './examples';

function authAndDashboard(paths: Record<string, any>) {
  paths['/admin/auth/login'] = {
    post: {
      tags: ['Admin - Auth'], summary: 'Admin login → { token, user }',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['email', 'password'], properties: { email: S, password: S } },
            example: adminLoginRequestExample,
          },
        },
      },
      responses: adminOkResp(adminLoginResponseExample),
    },
  };
  paths['/admin/auth/me'] = { get: { tags: ['Admin - Auth'], summary: 'Current admin + permissions', security: [{ bearerAuth: [] }], responses: adminOkResp(adminMeExample) } };
  paths['/admin/auth/roles'] = { get: { tags: ['Admin - Auth'], summary: 'List roles + permissions', security: [{ bearerAuth: [] }], responses: adminOkResp([{ id: 1, name: 'admin', description: 'Full access', permissions: ['*'] }, { id: 2, name: 'manager', description: 'Operational access', permissions: ['orders.view', 'orders.manage', 'products.manage'] }]) } };
  paths['/admin/auth/permissions'] = { get: { tags: ['Admin - Auth'], summary: 'List permissions', security: [{ bearerAuth: [] }], responses: adminOkResp([{ id: 1, name: 'orders.view', description: 'View orders' }, { id: 2, name: 'products.manage', description: 'Create/update/delete products' }]) } };

  paths['/admin/dashboard/stats'] = { get: { tags: ['Admin - Dashboard'], summary: 'KPI totals + recent orders', security: [{ bearerAuth: [] }], responses: adminOkResp(dashboardStatsExample) } };
  paths['/admin/orders'] = { get: { tags: ['Admin - Dashboard'], summary: 'List orders (filters: status, payment_status, q)', security: [{ bearerAuth: [] }], parameters: [queryPage(), { name: 'pageSize', in: 'query', schema: I }, { name: 'status', in: 'query', schema: I }, { name: 'payment_status', in: 'query', schema: I }, { name: 'q', in: 'query', schema: S }], responses: adminOkResp([orderResponseExample], listMeta()) } };
  paths['/admin/orders/{id}'] = { get: { tags: ['Admin - Dashboard'], summary: 'Order details (products + address)', security: [{ bearerAuth: [] }], parameters: [pathId()], responses: adminOkResp({ ...orderResponseExample, products: [{ id: 1, product_id: 1, quantity: 2, price: 8.5, product: productResponseExample }], address: { id: 1, address_name: 'Home', block: '5', street: '10' } }) } };
  paths['/admin/orders/{id}/status'] = {
    put: {
      tags: ['Admin - Dashboard'], summary: 'Update order/payment status', security: [{ bearerAuth: [] }], parameters: [pathId()],
      requestBody: jsonBody({ status: 1, status_name: 'Processing', payment_status: 1 }, { status: I, status_name: S, payment_status: I }),
      responses: adminOkResp({ ...orderResponseExample, status: 1, status_name: 'Processing', payment_status: 1 }),
    },
  };
}

function productsAndSettings(paths: Record<string, any>) {
  paths['/admin/products'] = {
    post: { tags: ['Admin - Resources'], summary: 'Create product (with images, cut_type_ids, service_type_ids)', security: [{ bearerAuth: [] }], requestBody: jsonBody(productRequestExample), responses: adminOkResp(productResponseExample) },
    get: { tags: ['Admin - Resources'], summary: 'List products', security: [{ bearerAuth: [] }], parameters: [queryPage(), { name: 'q', in: 'query', schema: S }], responses: adminOkResp([productResponseExample], listMeta()) },
  };
  paths['/admin/products/{id}'] = {
    put: { tags: ['Admin - Resources'], summary: 'Update product (with relations)', security: [{ bearerAuth: [] }], parameters: [pathId()], requestBody: jsonBody(productRequestExample), responses: adminOkResp(productResponseExample) },
    get: { tags: ['Admin - Resources'], summary: 'Get product', security: [{ bearerAuth: [] }], parameters: [pathId()], responses: adminOkResp(productResponseExample) },
    delete: { tags: ['Admin - Resources'], summary: 'Delete product', security: [{ bearerAuth: [] }], parameters: [pathId()], responses: adminOkResp({ deleted: true }) },
  };
  paths['/admin/settings'] = {
    get: { tags: ['Admin - Resources'], summary: 'Get settings', security: [{ bearerAuth: [] }], responses: adminOkResp({ id: 1, ...settingsRequestExample }) },
    put: { tags: ['Admin - Resources'], summary: 'Update settings', security: [{ bearerAuth: [] }], requestBody: jsonBody(settingsRequestExample), responses: adminOkResp({ id: 1, ...settingsRequestExample }) },
  };
  paths['/admin/contact-messages'] = { get: { tags: ['Admin - Resources'], summary: 'Contact inbox', security: [{ bearerAuth: [] }], parameters: [queryPage()], responses: adminOkResp([{ id: 1, name: 'Jane', email: 'jane@example.com', mobile: '96599999999', message: 'Do you deliver to Salmiya?', is_read: false, created_at: '2024-01-01T00:00:00.000Z' }], listMeta()) } };
}

function genericResources(paths: Record<string, any>) {
  const resources = ['categories', 'banners', 'advertisements', 'countries', 'cities', 'cut-types', 'service-types', 'promotion-codes', 'pages', 'customers', 'notifications'];
  for (const r of resources) {
    const reqEx = adminRequestExamples[r];
    const resEx = adminResponseExamples[r];
    paths[`/admin/${r}`] = {
      get: { tags: ['Admin - Resources'], summary: `List ${r}`, security: [{ bearerAuth: [] }], parameters: [queryPage(), { name: 'pageSize', in: 'query', schema: I }, { name: 'q', in: 'query', schema: S }], responses: adminOkResp([resEx], listMeta()) },
      post: { tags: ['Admin - Resources'], summary: `Create ${r}`, security: [{ bearerAuth: [] }], requestBody: jsonBody(reqEx), responses: adminOkResp(resEx) },
    };
    paths[`/admin/${r}/{id}`] = {
      get: { tags: ['Admin - Resources'], summary: `Get ${r}`, security: [{ bearerAuth: [] }], parameters: [pathId()], responses: adminOkResp(resEx) },
      put: { tags: ['Admin - Resources'], summary: `Update ${r}`, security: [{ bearerAuth: [] }], parameters: [pathId()], requestBody: jsonBody(reqEx), responses: adminOkResp(resEx) },
      delete: { tags: ['Admin - Resources'], summary: `Delete ${r}`, security: [{ bearerAuth: [] }], parameters: [pathId()], responses: adminOkResp({ deleted: true }) },
    };
  }
}

export function adminPaths(): Record<string, any> {
  const paths: Record<string, any> = {};
  authAndDashboard(paths);
  productsAndSettings(paths);
  genericResources(paths);
  return paths;
}

