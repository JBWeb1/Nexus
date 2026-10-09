import { ApiError } from './utils/helpers';

/** Minimal request/response objects so the same handlers run inside a Next.js route handler. */
export interface Req { method: string; path: string; originalUrl: string; query: Record<string, string>; params: Record<string, string>; headers: Record<string, string>; body: any; file?: { buffer: Buffer; originalname: string; mimetype: string; size: number }; ip: string; user?: any; subscription?: any; raw?: Buffer }
export class Res {
  statusCode = 200; headers: Record<string, string> = {}; body: any = undefined; kind: 'json' | 'raw' | 'none' = 'none'; headersSent = false;
  status(n: number) { this.statusCode = n; return this; }
  setHeader(k: string, v: string) { this.headers[k] = v; return this; }
  json(b: any) { this.body = b; this.kind = 'json'; this.headersSent = true; return this; }
  send(b: any) { this.body = b; this.kind = typeof b === 'object' && !Buffer.isBuffer(b) ? 'json' : 'raw'; this.headersSent = true; return this; }
  sendStatus(n: number) { this.statusCode = n; this.body = ''; this.kind = 'raw'; this.headersSent = true; return this; }
  end() { this.headersSent = true; return this; }
  /** Throw away anything a handler wrote before its transaction rolled back. */
  reset() { this.statusCode = 200; this.headers = {}; this.body = undefined; this.kind = 'none'; this.headersSent = false; }
  toResponse(): Response {
    if (this.kind === 'json') return Response.json(this.body ?? null, { status: this.statusCode, headers: this.headers });
    if (this.kind === 'raw') return new Response(Buffer.isBuffer(this.body) ? new Uint8Array(this.body) : String(this.body ?? ''), { status: this.statusCode, headers: this.headers });
    return new Response(null, { status: this.statusCode === 200 ? 204 : this.statusCode, headers: this.headers });
  }
}
export type Next = (err?: any) => void;
export type Handler = (req: Req, res: Res, next: Next) => any;
type Entry = { use: boolean; handler?: Handler; method?: string; pattern?: RegExp; keys?: string[]; handlers?: Handler[] };

export class Router {
  entries: Entry[] = [];
  use(handler: Handler) { this.entries.push({ use: true, handler }); return this; }
  private add(method: string, path: string, handlers: Handler[]) {
    const keys: string[] = []; const pattern = new RegExp('^' + path.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    this.entries.push({ use: false, method, pattern, keys, handlers }); return this;
  }
  get(p: string, ...h: Handler[]) { return this.add('GET', p, h); }
  post(p: string, ...h: Handler[]) { return this.add('POST', p, h); }
  put(p: string, ...h: Handler[]) { return this.add('PUT', p, h); }
  patch(p: string, ...h: Handler[]) { return this.add('PATCH', p, h); }
  delete(p: string, ...h: Handler[]) { return this.add('DELETE', p, h); }
}

export function errorResponse(err: any, req?: Req): Response {
  const j = (status: number, error: string, details?: any) => Response.json({ error, details }, { status });
  if (err instanceof ApiError) return j(err.status, err.message, err.details);
  // Typed Prisma queries report constraint problems with their own codes.
  if (err?.code === 'P2002') return j(409, 'Already exists (duplicate value)');
  if (err?.code === 'P2003') return j(409, 'Cannot complete: record is referenced by other data');
  if (err?.code === 'P2025') return j(404, 'Not found');
  if (err?.code === '23P01') return j(409, 'Overlaps an existing finalized period');
  if (err?.code === '23505') return j(409, 'Already exists (duplicate value)');
  if (err?.code === '23503') return j(409, 'Cannot complete: record is referenced by other data');
  if (err?.code === 'P0001' && /locked/i.test(err.message)) return j(409, err.message.replace(/^.*?Period/, 'Period'));
  if (['22P02', '22007', '22008'].includes(err?.code)) return j(400, 'Invalid input value');
  if (err?.type === 'entity.parse.failed') return j(400, 'Invalid JSON body');
  console.error('[api]', req?.method, req?.originalUrl, err);
  return j(500, 'Internal server error');
}

async function readBody(request: Request, req: Req) {
  if (['GET', 'HEAD'].includes(req.method)) return;
  const type = request.headers.get('content-type') || '';
  if (type.includes('multipart/form-data')) {
    const form = await request.formData(); const body: Record<string, any> = {};
    for (const [k, v] of form.entries()) {
      if (typeof v === 'string') body[k] = v;
      else if (!req.file) { const buf = Buffer.from(await v.arrayBuffer()); if (buf.length > 10 * 1024 * 1024) throw new ApiError(413, 'That file is larger than 10 MB'); req.file = { buffer: buf, originalname: v.name, mimetype: v.type, size: buf.length }; }
    }
    req.body = body; return;
  }
  const text = await request.text(); if (!text) { req.body = {}; return; }
  if (text.length > 2 * 1024 * 1024) throw new ApiError(413, 'Request is too large');
  try { req.body = JSON.parse(text); } catch { throw Object.assign(new Error('bad json'), { type: 'entity.parse.failed' }); }
}

/** Runs a request through the router and returns a web Response. `prefix` is the mount point, for example "/api". */
export async function dispatch(router: Router, request: Request, prefix: string): Promise<Response> {
  const url = new URL(request.url); const path = url.pathname.slice(prefix.length) || '/';
  const headers: Record<string, string> = {}; request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const req: Req = { method: request.method, path, originalUrl: url.pathname + url.search, query: Object.fromEntries(url.searchParams), params: {}, headers, body: {}, ip: (headers['x-forwarded-for'] || '').split(',')[0].trim() || headers['x-real-ip'] || 'local' };
  const res = new Res();
  try {
    await readBody(request, req);
    const step = async (h: Handler) => { let nexted = false, error: any; await h(req, res, (e?: any) => { nexted = true; error = e; }); if (error) throw error; return nexted; };
    for (const e of router.entries) {
      if (e.use) { if (!(await step(e.handler))) return res.toResponse(); continue; }
      if (e.method !== req.method) continue; const m = e.pattern.exec(path); if (!m) continue;
      req.params = Object.fromEntries(e.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      for (const h of e.handlers) if (!(await step(h))) return res.toResponse();
      return res.toResponse();
    }
    return Response.json({ error: `Not found: ${req.method} ${req.originalUrl}` }, { status: 404 });
  } catch (err) { return errorResponse(err, req); }
}
