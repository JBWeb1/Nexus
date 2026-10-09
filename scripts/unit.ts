// Fast checks that need no database or server. Run: npm run test:unit
delete process.env.DISABLE_RATE_LIMIT; (process.env as any).NODE_ENV = 'development';
import { accountLock, rateLimit } from '../src/server/middleware/rateLimit';
import { Router, dispatch } from '../src/server/http';
import ExcelJS from 'exceljs';
import { parseExpenseSpreadsheet, parseSigned } from '../src/server/services/importService';
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra: any = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${cond ? '' : '  ' + (typeof extra === 'string' ? extra : JSON.stringify(extra))}`); };
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

  console.log('Import: which way did the money go?');
  ok('signed amounts: "(99,00)", "-99", "99-", "R 1 250,00", "1,500.00"', parseSigned('(99,00)') === -99 && parseSigned('-99') === -99 && parseSigned('99-') === -99 && parseSigned('R 1 250,00') === 1250 && parseSigned('1,500.00') === 1500 && parseSigned('TOTAL') === null);
  const sheet = async (head: string[], body: any[][]) => { const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('S'); ws.addRow(head); body.forEach((r) => ws.addRow(r));
    return parseExpenseSpreadsheet({ buffer: Buffer.from(await wb.xlsx.writeBuffer()), originalname: 'x.xlsx', mimetype: '' }); };
  const book = await sheet(['Date', 'Details', 'Amount'], [['01/07/2026', 'Rent', 12000], ['02/07/2026', 'Refund', '(99,00)'], ['03/07/2026', 'Fuel', '450,50']]);
  ok('expense book: positive = expense, brackets = refund', book.convention === 'POSITIVE_IS_EXPENSE' && book.rows.map((r) => r.direction).join() === 'EXPENSE,REFUND,EXPENSE' && book.rows[1].amount === 99, book.rows);
  const bankx = await sheet(['Date', 'Description', 'Amount', 'Balance'], [['01/07/2026', 'Eskom', -1850], ['02/07/2026', 'Telkom', -899], ['03/07/2026', 'Takealot refund', 2299], ['04/07/2026', 'Engen', -400], ['05/07/2026', 'Rent', -12000]]);
  ok('bank export (mostly negative): negative = expense, positive = refund', bankx.convention === 'NEGATIVE_IS_EXPENSE' && bankx.rows.map((r) => r.direction).join() === 'EXPENSE,EXPENSE,REFUND,EXPENSE,EXPENSE' && bankx.rows.every((r) => r.amount! > 0), bankx.rows);
  const small = await sheet(['Date', 'Description', 'Amount', 'Balance'], [['01/07/2026', 'Eskom', -1850], ['02/07/2026', 'Refund', 99]]);
  ok('a Balance column marks a bank export even when half the lines are refunds', small.convention === 'NEGATIVE_IS_EXPENSE' && small.rows.map((r) => r.direction).join() === 'EXPENSE,REFUND', small.rows);
  const inout = await sheet(['Date', 'Description', 'Money out', 'Money in'], [['01/07/2026', 'Eskom', 1850, null], ['02/07/2026', 'Refund', null, 99]]);
  ok('Money in / Money out columns', inout.convention === 'IN_OUT_COLUMNS' && inout.rows.map((r) => r.direction).join() === 'EXPENSE,REFUND' && inout.rows[1].amount === 99, inout.rows);
  const debit = await sheet(['Date', 'Narrative', 'Debit'], [['01/07/2026', 'Eskom', 1850]]);
  ok('a lone Debit column is the amount column', debit.rows[0].amount === 1850 && debit.rows[0].direction === 'EXPENSE', debit.rows);
  const cat = await sheet(['Date', 'Description', 'Category', 'Amount (R)'], [['01/07/2026', 'Rent', 'Rent', 12000]]);
  ok('a Category column is picked up', cat.rows[0].category === 'Rent' && cat.detectedColumns.amount === 4, cat);

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
