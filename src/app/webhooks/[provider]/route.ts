import * as wh from '@/server/controllers/webhooksController';
import { Res, type Req } from '@/server/http';

// Webhooks are verified by signature, not by session. Paystack signs the exact bytes it sent, so the raw body is kept.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function run(request: Request, provider: string) {
  const url = new URL(request.url); const headers: Record<string, string> = {}; request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const raw = request.method === 'GET' ? Buffer.alloc(0) : Buffer.from(await request.arrayBuffer());
  const req: Req = { method: request.method, path: url.pathname, originalUrl: url.pathname + url.search, query: Object.fromEntries(url.searchParams), params: {}, headers, body: raw, ip: headers['x-forwarded-for'] || 'local' };
  const res = new Res();
  if (provider === 'paystack' && request.method === 'POST') await wh.paystack(req, res);
  else if (provider === 'stitch' && request.method === 'POST') wh.stitch(req, res);
  else if (provider === 'whatsapp' && request.method === 'GET') wh.whatsappVerify(req, res);
  else if (provider === 'whatsapp' && request.method === 'POST') { try { req.body = JSON.parse(raw.toString('utf8') || '{}'); } catch { req.body = {}; } await wh.whatsappEvent(req, res); }
  else return Response.json({ error: 'Not found' }, { status: 404 });
  return res.toResponse();
}
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) { return run(request, (await params).provider); }
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) { return run(request, (await params).provider); }
