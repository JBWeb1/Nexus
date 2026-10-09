// Fast checks that need no database or server. Run: npm run test:unit
delete process.env.DISABLE_RATE_LIMIT; (process.env as any).NODE_ENV = 'development';
import { accountLock, rateLimit } from '../src/server/middleware/rateLimit';
import { Router, dispatch } from '../src/server/http';
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${cond ? '' : '  ' + extra}`); };
const throws = (f: () => void) => { try { f(); return false; } catch (e: any) { return e.status === 429; } };
(async () => {
  console.log('Account lockout');
  const k = 'victim@test.co.za';
  for (let i = 0; i < 9; i++) accountLock.fail(k);
  ok('nine failures still allowed', !throws(() => accountLock.check(k)));
  accountLock.fail(k);
  ok('tenth failure locks the account', throws(() => accountLock.check(k)));
  ok('other accounts unaffected', !throws(() => accountLock.check('someone-else@test.co.za')));
  accountLock.clear(k);
  ok('a successful sign-in clears the count', !throws(() => accountLock.check(k)));

  console.log('Client IP for rate limiting');
  const r = new Router(); let seen = '';
  r.use(rateLimit({ limit: 2, windowMs: 60_000, name: 'unit' }));
  r.get('/ip', (req, res) => { seen = (req as any).ip; res.json({ ok: true }); });
  const hit = (xff: string) => dispatch(r, new Request('http://x/api/ip', { headers: { 'x-forwarded-for': xff } }), '/api');
  await hit('1.1.1.1, 203.0.113.9');
  ok('uses the address added by our own proxy, not the client-supplied one', seen === '203.0.113.9', seen);
  await hit('2.2.2.2, 203.0.113.9');
  const third = await hit('3.3.3.3, 203.0.113.9');
  ok('changing the spoofable part does not reset the limit', third.status === 429, String(third.status));

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
