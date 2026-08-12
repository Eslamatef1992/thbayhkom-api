const S = { type: 'string' };
const I = { type: 'integer' };

/** Envelope 200 response, optionally with a concrete example payload merged onto the base envelope. */
export function ok200(example?: Record<string, any>) {
  const exampleValue = { status: true, code: 200, message: 'success', ...(example || {}) };
  return {
    '200': {
      description: 'API envelope (HTTP is always 200; check `status`/`code`)',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Envelope' },
          example: exampleValue,
        },
      },
    },
  };
}

/** REST result for admin routes, with a concrete `data` (and optional `meta`) example. */
export function adminOkResp(dataExample?: any, meta?: Record<string, any>) {
  const example: Record<string, any> = { success: true, data: dataExample ?? null };
  if (meta) example.meta = meta;
  return {
    '200': {
      description: 'REST result',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AdminResult' },
          example,
        },
      },
    },
  };
}

/** Paginated list meta example. */
export function listMeta() {
  return { page: 1, pageSize: 20, total: 1, totalPages: 1 };
}

/** form-urlencoded body with a concrete example so "Try it out" is pre-filled. */
export function form(properties: Record<string, any>, required: string[] = [], example?: Record<string, any>) {
  const schema: any = { type: 'object', required, properties };
  const content: any = { 'application/x-www-form-urlencoded': { schema } };
  if (example) content['application/x-www-form-urlencoded'].example = example;
  return { required: true, content };
}

/** JSON body with a concrete example. */
export function jsonBody(example?: Record<string, any>, properties?: Record<string, any>) {
  const schema: any = properties ? { type: 'object', properties } : { type: 'object' };
  const inner: any = { schema };
  if (example) inner.example = example;
  return { required: true, content: { 'application/json': inner } };
}

export function pathId() { return { name: 'id', in: 'path', required: true, schema: I }; }
export function queryPage() { return { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }; }
export function queryFcm() { return { name: 'fcmToken', in: 'query', schema: S }; }

export { S, I };

