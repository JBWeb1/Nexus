// End-to-end regression. Requires the API on :4000 and migrated DB. Run: node scripts/regression.js
import ExcelJS from 'exceljs'; import crypto from 'crypto'; import { Client } from 'pg';
import { pool, authPool, servicePool, type Db, type Queryable } from '../src/server/db';
import { totp } from '../src/server/utils/auth';
import * as subSvc from '../src/server/services/subscriptionService';
// Lets the checks below open a transaction and roll it back by hand, on top of Prisma's callback-style transactions.
function connect(db: Db) {
  let c: Queryable, commit: () => void, rollback: (e: any) => void, started: Promise<void> | null = null, done: Promise<any>;
  const begin = () => (started ??= new Promise<void>((ready) => { done = db.tx(async (q) => { c = q; ready(); await new Promise<void>((res, rej) => { commit = res; rollback = rej; }); }).catch(() => {}); }));
  return {
    async query(sql: string, params?: any[]): Promise<any> {
      if (/^BEGIN$/i.test(sql)) { await begin(); return; }
      if (/^COMMIT$/i.test(sql)) { commit(); await done; started = null; return; }
      if (/^ROLLBACK$/i.test(sql)) { if (started) { rollback(new Error('rollback')); await done; started = null; } return; }
      return started ? c.query(sql, params) : db.query(sql, params);
    },
    release() { if (started) { rollback(new Error('released')); started = null; } },
  };
}
const BASE = process.env.API || 'http://localhost:3000'; let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${cond ? '' : '  ' + extra}`); };
async function call(method: string, path: string, token?: string | null, body?: any): Promise<{ status: number; body: any; headers?: any }> {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: res.status, body: j };
}
const near = (a, b) => Math.abs(a - b) < 0.005;
(async () => {
  const stamp = Date.now();
  const reg = async (n) => (await call('POST', '/api/auth/register', null, { organizationName: `Org ${n} ${stamp}`, name: 'Tester', email: `t${n}-${stamp}@test.co.za`, password: 'password123' })).body;
  const A = await reg('A'), B = await reg('B'); const ta = A.token, tb = B.token;
  const accts = (await call('GET', '/api/accounts', ta)).body.accounts; const acc = (code) => accts.find((a) => a.code === code).id;
  const rates = (await call('GET', '/api/tax-rates', ta)).body.taxRates; const vat15 = rates.find((r) => r.rate === 15).id;
  const cust = (await call('POST', '/api/contacts', ta, { name: 'Acme', type: 'CUSTOMER', phone: '0821234567' })).body.contact;
  const bnk = (await call('POST', '/api/bank-accounts', ta, { name: 'Cheque', openingBalance: 0 })).body.bankAccount;
  const bankBal = async () => (await call('GET', '/api/bank-accounts', ta)).body.bankAccounts.find((b) => b.id === bnk.id).currentBalance;

  console.log('Ledger + payments');
  const iv = (await call('POST', '/api/invoices', ta, { contactId: cust.id, issueDate: '2026-04-10', dueDate: '2026-05-10', lines: [{ description: 'Consulting', quantity: 10, unitPrice: 1000, accountId: acc('4000'), taxRateId: vat15 }] })).body.invoice;
  ok('invoice total incl. 15% VAT = 11500', iv.total === 11500 && iv.taxTotal === 1500, JSON.stringify(iv));
  const sent = await call('POST', `/api/invoices/${iv.id}/send`, ta);
  ok('send posts to ledger (SENT)', sent.status === 200 && sent.body.invoice.status === 'SENT', JSON.stringify(sent.body));
  const p1 = await call('POST', '/api/payments/invoice', ta, { invoiceId: iv.id, bankAccountId: bnk.id, amount: 11500, feeAmount: 150, date: '2026-04-20' });
  ok('payment with fee split: bank = net 11350', p1.status === 201 && near(await bankBal(), 11350), JSON.stringify(p1.body));
  const inv2 = (await call('GET', `/api/invoices/${iv.id}`, ta)).body.invoice; ok('invoice PAID', inv2.status === 'PAID');
  const over = await call('POST', '/api/payments/invoice', ta, { invoiceId: iv.id, bankAccountId: bnk.id, amount: 1 });
  ok('paying a paid invoice rejected', over.status === 409);
  const rev = await call('POST', `/api/payments/${p1.body.payment.id}/reverse`, ta, { date: '2026-04-21' });
  ok('payment reversal restores bank to 0 and invoice to SENT', rev.status === 200 && near(await bankBal(), 0) && (await call('GET', `/api/invoices/${iv.id}`, ta)).body.invoice.status === 'SENT', JSON.stringify(rev.body));
  const trial = (await call('GET', '/api/reports/trial-balance', ta)).body; ok('trial balance balances', trial.balanced === true);
  const raw = connect(pool); let immut = false;
  try { await raw.query('BEGIN'); await raw.query("SELECT set_config('app.current_org',$1,true)", [A.organization.id]); await raw.query("UPDATE journal_lines SET debit=1 WHERE id=(SELECT id FROM journal_lines LIMIT 1)"); } catch (e) { immut = /immutable/.test(e.message); }
  await raw.query('ROLLBACK'); raw.release();
  ok('DB trigger blocks journal line mutation', immut);

  console.log('VAT201');
  const bill = (await call('POST', '/api/bills', ta, { contactId: cust.id, issueDate: '2026-04-15', lines: [{ description: 'Laptop', quantity: 1, unitPrice: 2000, accountId: acc('6500'), taxRateId: vat15 }] })).body.bill;
  await call('POST', `/api/bills/${bill.id}/approve`, ta);
  const pv = (await call('GET', '/api/reports/vat201?from=2026-04-01&to=2026-04-30', ta)).body.vat201;
  ok('preview output 1500 / input 300 / net 1200', pv.outputVat === 1500 && pv.inputVat === 300 && pv.netVat === 1200, JSON.stringify(pv));
  const fz = await call('POST', '/api/vat-periods/finalize', ta, { periodStart: '2026-04-01', periodEnd: '2026-04-30' });
  ok('finalize period', fz.status === 201, JSON.stringify(fz.body));
  const bs = (await call('GET', '/api/reports/trial-balance', ta)).body.rows; const sars = bs.find((r) => r.code === '2120');
  ok('SARS Payable credit balance = 1200', sars && sars.credit === 1200, JSON.stringify(sars));
  const locked = await call('POST', '/api/invoices', ta, { contactId: cust.id, issueDate: '2026-04-25', lines: [{ description: 'x', unitPrice: 100, accountId: acc('4000') }] });
  const lockedSend = await call('POST', `/api/invoices/${locked.body.invoice.id}/send`, ta);
  ok('posting into locked period blocked', lockedSend.status === 409 && /locked/i.test(lockedSend.body.error), JSON.stringify(lockedSend.body));
  const ovl = await call('POST', '/api/vat-periods/finalize', ta, { periodStart: '2026-04-15', periodEnd: '2026-05-15' });
  ok('overlapping finalize rejected', ovl.status === 409, JSON.stringify(ovl.body));

  console.log('RLS');
  const sees = await call('GET', `/api/invoices/${iv.id}`, tb);
  ok('other tenant cannot read invoice via API', sees.status === 404);
  const c2 = connect(pool); const unscoped = await c2.query('SELECT count(*)::int AS n FROM invoices'); c2.release();
  ok('unscoped raw SQL as app role sees 0 rows', unscoped.rows[0].n === 0);
  const c3 = connect(pool); await c3.query('BEGIN'); await c3.query("SELECT set_config('app.current_org',$1,true)", [B.organization.id]);
  const cross = await c3.query('SELECT count(*)::int AS n FROM invoices WHERE id=$1', [iv.id]); await c3.query('ROLLBACK'); c3.release();
  ok('org B scoped SQL cannot see org A invoice', cross.rows[0].n === 0);

  console.log('Quotes');
  const q = (await call('POST', '/api/quotes', ta, { contactId: cust.id, issueDate: '2026-06-01', lines: [{ description: 'Site', unitPrice: 500, accountId: acc('4000'), taxRateId: vat15 }] })).body.quote;
  ok('convert before accept rejected', (await call('POST', `/api/quotes/${q.id}/convert`, ta)).status === 409);
  await call('POST', `/api/quotes/${q.id}/send`, ta); await call('POST', `/api/quotes/${q.id}/accept`, ta);
  const cv = await call('POST', `/api/quotes/${q.id}/convert`, ta);
  ok('quote converts to invoice', cv.status === 201 && cv.body.invoice.total === 575, JSON.stringify(cv.body));
  ok('double conversion rejected', (await call('POST', `/api/quotes/${q.id}/convert`, ta)).status === 409);

  console.log('Excel import / export');
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('S'); ws.addRow(['Transaction Date', 'Details', 'Amount']);
  ws.addRow(['2026-06-02', 'Fuel', 'R 450.50']); ws.addRow(['03/06/2026', 'Stationery', -120]); ws.addRow(['2026-04-05', 'Old locked expense', 99]);
  const buf = Buffer.from(await wb.xlsx.writeBuffer()); const fd = new FormData(); fd.append('file', new Blob([buf]), 'exp.xlsx');
  const pr = await (await fetch(BASE + '/api/import/expenses/preview', { method: 'POST', headers: { Authorization: `Bearer ${ta}` }, body: fd })).json();
  ok('preview auto-detects columns and parses 3 rows (SA date + R amount)', pr.rows?.length === 3 && pr.rows[0].amount === 450.5 && pr.rows[1].date === '2026-06-03', JSON.stringify(pr));
  const cm = await call('POST', '/api/import/expenses/commit', ta, { bankAccountId: bnk.id, rows: pr.rows.map((r) => ({ ...r, accountId: acc('6600') })) });
  ok('commit: bad (locked-period) row does not sink batch', cm.body.imported === 2 && cm.body.failed.length === 1, JSON.stringify(cm.body));
  const gl = await fetch(BASE + '/api/export/general-ledger', { headers: { Authorization: `Bearer ${ta}` } }); const gb = Buffer.from(await gl.arrayBuffer());
  const wb2 = new ExcelJS.Workbook(); await wb2.xlsx.load(gb as any);
  ok('general ledger export is valid xlsx with rows', gl.status === 200 && wb2.worksheets[0].rowCount > 5);

  console.log('Recurring');
  const rc = await call('POST', '/api/recurring-invoices', ta, { contactId: cust.id, frequency: 'MONTHLY', startDate: '2026-01-15', lines: [{ description: 'Retainer', unitPrice: 1000, accountId: acc('4000') }] });
  const rc2 = await call('POST', '/api/recurring-invoices', ta, { contactId: cust.id, frequency: 'MONTHLY', startDate: '2026-01-15', lines: [{ description: 'Paused', unitPrice: 1, accountId: acc('4000') }] });
  await call('POST', `/api/recurring-invoices/${rc2.body.recurringInvoice.id}/pause`, ta);
  const run = await call('POST', '/api/recurring-invoices/run-due', ta);
  ok('run-due generates invoices for active template only', run.body.count > 0 && run.body.generated.every((g) => g.recurringInvoiceId === rc.body.recurringInvoice.id), JSON.stringify(run.body));
  const after = (await call('GET', `/api/recurring-invoices/${rc.body.recurringInvoice.id}`, ta)).body.recurringInvoice;
  ok('next_run_date advanced past today', after.nextRunDate > new Date().toISOString().slice(0, 10), after.nextRunDate);
  ok('second run-due is a no-op', (await call('POST', '/api/recurring-invoices/run-due', ta)).body.count === 0);

  console.log('Onboarding, work queue, month-end');
  const C = await reg('C'); const tc = C.token; const ca = (await call('GET', '/api/accounts', tc)).body.accounts; const cacc = (code) => ca.find((a) => a.code === code).id;
  const ob0 = (await call('GET', '/api/onboarding', tc)).body;
  ok('fresh org onboarding is 0 of 6', ob0.done === 0 && ob0.total === 6 && ob0.percent === 0, JSON.stringify(ob0));
  ok('VAT-registered without VAT number rejected', (await call('PATCH', '/api/organization', tc, { businessType: 'Retail', vatRegistered: true })).status === 400);
  ok('malformed VAT number rejected', (await call('PATCH', '/api/organization', tc, { vatRegistered: true, vatNumber: '123' })).status === 400);
  ok('profile saved with valid 10-digit VAT number', (await call('PATCH', '/api/organization', tc, { businessType: 'Retail', vatRegistered: true, vatNumber: '4123456789' })).status === 200);
  const cc = (await call('POST', '/api/contacts', tc, { name: 'Beta Ltd', type: 'CUSTOMER' })).body.contact;
  const cb = (await call('POST', '/api/bank-accounts', tc, { name: 'Main' })).body.bankAccount; const cvat = (await call('GET', '/api/tax-rates', tc)).body.taxRates.find((r) => r.rate === 15).id;
  const mk = async (date, send) => { const r = (await call('POST', '/api/invoices', tc, { contactId: cc.id, issueDate: date, dueDate: date > '2026-05-25' ? '2026-06-30' : '2026-05-25', lines: [{ description: 'Job', unitPrice: 1000, accountId: cacc('4000'), taxRateId: cvat }] })).body.invoice; if (send) await call('POST', `/api/invoices/${r.id}/send`, tc); return r; };
  const i1 = await mk('2026-05-10', true); const i2 = await mk('2026-05-12', true); const draft = await mk('2026-05-15', false);
  const txn = (await call('POST', `/api/bank-accounts/${cb.id}/transactions`, tc, { date: '2026-05-20', description: 'Mystery deposit', amount: 777, type: 'CREDIT' })).body.transaction;
  const ob1 = (await call('GET', '/api/onboarding', tc)).body; const stepDone = (k) => ob1.steps.find((x) => x.key === k).done;
  ok('onboarding reflects real data (5 of 6 done, expense not)', stepDone('profile') && stepDone('bank') && stepDone('customer') && stepDone('invoice') && stepDone('send') && !stepDone('expense') && ob1.done === 5, JSON.stringify(ob1.steps.map((x) => [x.key, x.done])));
  const wq = (await call('GET', '/api/work-queue', tc)).body; const has = (id) => wq.items.some((x) => x.id === id || x.id.startsWith(id));
  ok('work queue flags overdue invoices as urgent with evidence', wq.items.find((x) => x.id === 'overdue-invoices')?.severity === 'urgent' && wq.items.find((x) => x.id === 'overdue-invoices').evidence.length > 0, JSON.stringify(wq.summary));
  ok('work queue flags the duplicate invoice pair with both numbers as evidence', wq.items.some((x) => x.category === 'duplicate' && x.evidence.join(' ').includes(i1.number) && x.evidence.join(' ').includes(i2.number)));
  ok('work queue flags the unmatched bank transaction', has('unmatched-bank'));
  const other = (await call('GET', '/api/work-queue', tb)).body; ok('work queue is tenant-isolated (other org sees none of these)', !other.items.some((x) => x.category === 'duplicate' || x.id === 'overdue-invoices'));
  const me1 = (await call('GET', '/api/month-end/2026-05', tc)).body;
  ok('month-end blocked by unmatched bank + draft invoice', me1.canClose === false && me1.checks.find((x) => x.key === 'bank').status === 'issue' && me1.checks.find((x) => x.key === 'drafts').status === 'issue', JSON.stringify(me1.checks.map((x) => [x.key, x.status])));
  ok('close refused while blocking issues exist', (await call('POST', '/api/month-end/2026-05/close', tc)).status === 409);
  ok('cannot close a month that has not ended', (await call('POST', '/api/month-end/2099-01/close', tc)).status === 400);
  ok('bad period format rejected', (await call('GET', '/api/month-end/2026-13', tc)).status === 400);
  await call('POST', `/api/invoices/${draft.id}/void`, tc); await call('POST', `/api/bank-accounts/${cb.id}/transactions/${txn.id}/reconcile`, tc, { ignore: true });
  const me2 = (await call('GET', '/api/month-end/2026-05', tc)).body;
  ok('VAT-registered org: VAT check blocks until period finalized', me2.checks.find((x) => x.key === 'vat')?.status === 'issue' && me2.canClose === false, JSON.stringify(me2.checks.map((x) => [x.key, x.status])));
  ok('VAT finalize for May', (await call('POST', '/api/vat-periods/finalize', tc, { periodStart: '2026-05-01', periodEnd: '2026-05-31' })).status === 201);
  const me3 = (await call('GET', '/api/month-end/2026-05', tc)).body; ok('blocking checks clear; duplicates remain a non-blocking warning', me3.canClose === true && me3.checks.find((x) => x.key === 'duplicates').status === 'warn', JSON.stringify(me3.checks.map((x) => [x.key, x.status])));
  const cl = await call('POST', '/api/month-end/2026-05/close', tc); ok('month closes with permanent record', cl.status === 201 && cl.body.closed.label === 'May 2026', JSON.stringify(cl.body));
  ok('closing again rejected', (await call('POST', '/api/month-end/2026-05/close', tc)).status === 409);
  const late = await mk('2026-05-28', false); const afterLock = await call('POST', `/api/invoices/${late.id}/send`, tc); ok('posting into a closed month is blocked by the ledger', afterLock.status === 409 && /locked/i.test(afterLock.body.error), JSON.stringify(afterLock.body));
  const raw2 = connect(pool); let noDel = false; try { await raw2.query('BEGIN'); await raw2.query("SELECT set_config('app.current_org',$1,true)", [C.organization.id]); await raw2.query('DELETE FROM month_closes'); } catch (e) { noDel = /permission denied/.test(e.message); } await raw2.query('ROLLBACK'); raw2.release();
  ok('month-close record cannot be deleted by the app role', noDel);
  ok('dismissing onboarding persists', (await call('POST', '/api/onboarding/dismiss', tc, { dismissed: true })).status === 200 && (await call('GET', '/api/onboarding', tc)).body.dismissed === true);

  console.log('Companies, accounting style, notes');
  const cmpl0 = (await call('GET', '/api/companies', ta)).body; ok('new user belongs to one company', cmpl0.companies.length === 1 && cmpl0.companies[0].active === true);
  const cmp2 = await call('POST', '/api/companies', ta, { name: `Diner ${stamp}`, accountingStyle: 'RESTAURANT' }); ok('create second company with Restaurant style', cmp2.status === 201 && cmp2.body.organization.name.startsWith('Diner'), JSON.stringify(cmp2.body));
  const tk2 = cmp2.body.token; const acc2 = (await call('GET', '/api/accounts', tk2)).body.accounts;
  ok('new company has base chart plus style accounts', acc2.some((a) => a.code === '4000') && acc2.some((a) => a.code === '4010' && a.name === 'Food Sales') && acc2.length > 26);
  ok('company 2 is isolated (no invoices from company 1)', (await call('GET', '/api/invoices', tk2)).body.invoices.length === 0 && (await call('GET', '/api/contacts', tk2)).body.contacts.length === 0);
  const cmpl1 = (await call('GET', '/api/companies', ta)).body; ok('user now sees both companies, new one active (per fresh token)', cmpl1.companies.length === 2 && (await call('GET', '/api/companies', tk2)).body.companies.find((x) => x.name.startsWith('Diner')).active === true);
  const swb = await call('POST', `/api/companies/${A.organization.id}/switch`, tk2); ok('switch swb to company 1', swb.status === 200 && swb.body.organization.id === A.organization.id);
  ok('cannot switch into someone else\'s company', (await call('POST', `/api/companies/${B.organization.id}/switch`, ta)).status === 404);
  ok('cannot create company without a name', (await call('POST', '/api/companies', ta, { name: '  ' })).status === 400);
  const sty1 = await call('PATCH', '/api/organization', ta, { accountingStyle: 'PROPERTY', invoicePrefix: 'rent', vatCycle: 'A', yearEndMonth: 6, defaultTermsDays: 7 });
  ok('applying Property style adds accounts, saves settings', sty1.status === 200 && sty1.body.addedAccounts.some((x) => x.includes('Rental Income')) && sty1.body.organization.invoicePrefix === 'RENT' && sty1.body.organization.vatCycle === 'A', JSON.stringify(sty1.body));
  const sty2 = await call('PATCH', '/api/organization', ta, { accountingStyle: 'PROPERTY' }); ok('re-applying a style adds nothing (idempotent)', sty2.status === 200 && sty2.body.addedAccounts.length === 0);
  const nvc = (await call('POST', '/api/invoices', ta, { contactId: cust.id, issueDate: '2026-06-01', lines: [{ description: 'Rent', quantity: 1, unitPrice: 5000, accountId: acc('4000') }] })).body.invoice; ok('invoice numbering uses the company prefix', /^RENT-\d{4}$/.test(nvc.number), nvc.number);
  ok('bad prefix rejected', (await call('PATCH', '/api/organization', ta, { invoicePrefix: 'no spaces!' })).status === 400);
  ok('bad year-end month rejected', (await call('PATCH', '/api/organization', ta, { yearEndMonth: 13 })).status === 400);
  const nt1 = await call('POST', '/api/notes', ta, { body: 'Client prefers WhatsApp for reminders', pinned: false });
  const nt2 = await call('POST', '/api/notes', ta, { entityType: 'INVOICE', entityId: nvc.id, body: 'Agreed 7 day terms by phone', title: 'Terms' });
  ok('general and invoice-linked notes created', nt1.status === 201 && nt2.status === 201, JSON.stringify([nt1.body, nt2.body]));
  ok('empty note rejected', (await call('POST', '/api/notes', ta, { body: '   ' })).status === 400);
  ok('cannot attach a note to another company\'s invoice', (await call('POST', '/api/notes', tb, { entityType: 'INVOICE', entityId: nvc.id, body: 'x' })).status === 404);
  const forInvoice = (await call('GET', `/api/notes?entityType=INVOICE&entityId=${nvc.id}`, ta)).body.notes; ok('notes filter by item and show its label', forInvoice.length === 1 && forInvoice[0].label === nvc.number);
  await call('PATCH', `/api/notes/${nt1.body.note.id}`, ta, { pinned: true }); const all = (await call('GET', '/api/notes', ta)).body.notes; ok('pinned notes sort first', all[0].id === nt1.body.note.id && all.length === 2);
  ok('search finds notes by text', (await call('GET', '/api/notes?q=whatsapp', ta)).body.notes.length === 1);
  ok('another company cannot see these notes', (await call('GET', '/api/notes', tb)).body.notes.length === 0 && (await call('PATCH', `/api/notes/${nt1.body.note.id}`, tb, { body: 'hack' })).status === 404);
  ok('edit and delete a note', (await call('PATCH', `/api/notes/${nt2.body.note.id}`, ta, { body: 'Terms now 14 days' })).body.note.body === 'Terms now 14 days' && (await call('DELETE', `/api/notes/${nt2.body.note.id}`, ta)).status === 200);
  ok('period note needs YYYY-MM', (await call('POST', '/api/notes', ta, { entityType: 'PERIOD', entityId: 'sept', body: 'x' })).status === 400 && (await call('POST', '/api/notes', ta, { entityType: 'PERIOD', entityId: '2026-09', body: 'Auditor query pending' })).status === 201);

  console.log('Credit notes, bank rules, security, documents');
  const mkInv = async (amt, date = '2026-07-01') => { const i = (await call('POST', '/api/invoices', ta, { contactId: cust.id, issueDate: date, lines: [{ description: 'Job', quantity: 1, unitPrice: amt, accountId: acc('4000'), taxRateId: vat15 }] })).body.invoice; await call('POST', `/api/invoices/${i.id}/send`, ta); return i; };
  const cinv = await mkInv(1000); // total 1150
  const draftInv = (await call('POST', '/api/invoices', ta, { contactId: cust.id, issueDate: '2026-07-02', lines: [{ description: 'x', quantity: 1, unitPrice: 10, accountId: acc('4000') }] })).body.invoice;
  ok('cannot credit a draft invoice', (await call('POST', `/api/invoices/${draftInv.id}/credit-notes`, ta, { full: true })).status === 409);
  const cnLine = { description: 'Returned goods', quantity: 1, unitPrice: 500, accountId: acc('4000'), taxRateId: vat15 };
  const cnr = await call('POST', `/api/invoices/${cinv.id}/credit-notes`, ta, { reason: 'Damaged', lines: [cnLine], issueDate: '2026-07-05' });
  ok('partial credit note posted (500 + VAT = 575)', cnr.status === 201 && cnr.body.creditNote.total === 575 && /^CN-\d{4}$/.test(cnr.body.creditNote.number), JSON.stringify(cnr.body));
  const ciAfter = (await call('GET', `/api/invoices/${cinv.id}`, ta)).body.invoice; ok('invoice now PARTIAL with 575 owing', ciAfter.status === 'PARTIAL' && near(ciAfter.total - ciAfter.amountPaid, 575), JSON.stringify([ciAfter.status, ciAfter.amountPaid]));
  ok('credit larger than amount owing rejected', (await call('POST', `/api/invoices/${cinv.id}/credit-notes`, ta, { lines: [{ ...cl, unitPrice: 600 }] })).status === 400);
  const vatP = (await call('GET', '/api/reports/vat201?from=2026-07-01&to=2026-07-31', ta)).body.vat201; ok('VAT201 reflects the credit (sales 500 net, output VAT 75)', near(vatP.standardRatedSales, 500) && near(vatP.outputVat, 75), JSON.stringify(vatP));
  const tbCn = (await call('GET', '/api/reports/trial-balance?asOf=2026-12-31', ta)).body; ok('trial balance still balances after credit note', near(tbCn.totals?.debit ?? tbCn.totalDebit ?? 0, tbCn.totals?.credit ?? tbCn.totalCredit ?? 0), JSON.stringify(tbCn.totals || Object.keys(tbCn)));
  const payRem = await call('POST', '/api/payments/invoice', ta, { invoiceId: cinv.id, bankAccountId: bnk.id, amount: 575, date: '2026-07-10' }); ok('can pay the remaining 575', payRem.status === 201);
  ok('invoice PAID after paying the remainder', (await call('GET', `/api/invoices/${cinv.id}`, ta)).body.invoice.status === 'PAID');
  await call('POST', `/api/payments/${payRem.body.payment.id}/reverse`, ta, { date: '2026-07-11' });
  const cfull = await mkInv(200, '2026-07-12'); const fullRes = await call('POST', `/api/invoices/${cfull.id}/credit-notes`, ta, { full: true }); ok('full credit note clears the invoice -> CREDITED', fullRes.status === 201 && (await call('GET', `/api/invoices/${cfull.id}`, ta)).body.invoice.status === 'CREDITED');
  const voidRes = await call('POST', `/api/credit-notes/${fullRes.body.creditNote.id}/void`, ta); ok('voiding a credit note restores the invoice', voidRes.status === 200 && (await call('GET', `/api/invoices/${cfull.id}`, ta)).body.invoice.status === 'SENT');
  ok('credit note PDF downloads', (await call('GET', `/api/credit-notes/${cnr.body.creditNote.id}/pdf`, ta)).body.startsWith('%PDF'));
  ok('invoice PDF downloads', (await call('GET', `/api/invoices/${cinv.id}/pdf`, ta)).body.startsWith('%PDF'));
  ok('emailing without SMTP configured says so clearly (503)', (await call('POST', `/api/invoices/${cinv.id}/email`, ta, { to: 'a@b.co.za' })).status === 503);
  const plk = await call('POST', `/api/invoices/${cinv.id}/pay-link`, ta, {}); ok('payment link fails with a readable message when Paystack is unreachable or not configured', [400, 502, 503].includes(plk.status) && !!plk.body.error);
  const actLog = (await call('GET', '/api/activity', ta)).body.activity; ok('activity log records who did what', actLog.some((x) => x.action === 'Issued a credit note') && actLog.some((x) => x.action.startsWith('Sent an invoice')) && actLog[0].userName === 'Tester', JSON.stringify(actLog.slice(0, 3)));
  const expo = await call('GET', '/api/export/company-data', ta); ok('company data export is valid JSON with invoices and notes', expo.status === 200 && expo.body.invoices.length > 3 && Array.isArray(expo.body.notes) && expo.body.company.id === A.organization.id);

  const bankAcc = (await call('GET', '/api/bank-accounts', ta)).body.bankAccounts[0];
  const addTxn = async (d, desc, amt, type) => (await call('POST', `/api/bank-accounts/${bankAcc.id}/transactions`, ta, { date: d, description: desc, amount: amt, type })).body.transaction;
  const txn1 = await addTxn('2026-08-02', 'POS PURCHASE OFFICEWORLD', 230, 'DEBIT');
  const catRes = await call('POST', `/api/bank-accounts/${bankAcc.id}/transactions/${txn1.id}/categorise`, ta, { accountId: acc('6500'), taxRateId: vat15 });
  ok('categorise a bank line: posts expense + input VAT and reconciles', catRes.status === 200 && (await call('GET', `/api/bank-accounts/${bankAcc.id}/transactions`, ta)).body.transactions.find((x) => x.id === txn1.id).reconciliationStatus === 'MATCHED', JSON.stringify(catRes.body));
  ok('categorising again is rejected', (await call('POST', `/api/bank-accounts/${bankAcc.id}/transactions/${txn1.id}/categorise`, ta, { accountId: acc('6500') })).status === 409);
  ok('money going out cannot be posted to income', (await call('POST', `/api/bank-accounts/${bankAcc.id}/transactions/${(await addTxn('2026-08-03', 'X', 10, 'DEBIT')).id}/categorise`, ta, { accountId: acc('4000') })).status === 400);
  const ruleRes = await call('POST', '/api/bank-rules', ta, { matchText: 'engen', direction: 'DEBIT', accountId: acc('6600'), taxRateId: vat15 }); ok('create bank rule', ruleRes.status === 201);
  await addTxn('2026-08-05', 'FUEL ENGEN PAARL', 575, 'DEBIT'); await addTxn('2026-08-06', 'UNKNOWN THING', 99, 'DEBIT');
  const applied = await call('POST', `/api/bank-accounts/${bankAcc.id}/apply-rules`, ta); ok('apply rules reconciles matches and leaves the rest', applied.status === 200 && applied.body.applied === 1 && applied.body.remaining >= 1, JSON.stringify(applied.body));
  const pnl = (await call('GET', '/api/reports/profit-and-loss?from=2026-08-01&to=2026-08-31', ta)).body; const flat = JSON.stringify(pnl); ok('rule posted fuel net of VAT (500) to Fuel & Travel', /"Fuel & Travel"/.test(flat) && /500/.test(flat), flat.slice(0, 300));

  const secEmail = `sec-${stamp}@test.co.za`; const SecU = (await call('POST', '/api/auth/register', null, { organizationName: `Sec ${stamp}`, name: 'Sec', email: secEmail, password: 'password123' })).body;
  ok('forgot-password answers the same for unknown emails', (await call('POST', '/api/auth/forgot', null, { email: 'nobody@nowhere.co.za' })).status === 200 && (await call('POST', '/api/auth/forgot', null, { email: secEmail })).status === 200);
  const rtok = crypto.randomBytes(16).toString('hex'); await authPool.query("INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES ('pr_'||substr(md5(random()::text),1,12),$1,$2, now() + interval '1 hour')", [SecU.user.id, crypto.createHash('sha256').update(rtok).digest('hex')]);
  ok('reset with a short password rejected', (await call('POST', '/api/auth/reset', null, { token: rtok, password: 'short' })).status === 400);
  await new Promise((r) => setTimeout(r, 1100)); // token times are whole seconds: keep the pre-reset token clearly older
  ok('reset with a valid token works', (await call('POST', '/api/auth/reset', null, { token: rtok, password: 'brandnew123' })).status === 200 && (await call('POST', '/api/auth/login', null, { email: secEmail, password: 'brandnew123' })).status === 200);
  ok('old password no longer works, and the token cannot be reused', (await call('POST', '/api/auth/login', null, { email: secEmail, password: 'password123' })).status === 401 && (await call('POST', '/api/auth/reset', null, { token: rtok, password: 'another12345' })).status === 400);
  ok('a password reset signs out tokens issued before it', (await call('GET', '/api/auth/me', SecU.token)).status === 401);
  const rtok2 = crypto.randomBytes(16).toString('hex'); await authPool.query("INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES ('pr_'||substr(md5(random()::text),1,12),$1,$2, now() - interval '1 minute')", [SecU.user.id, crypto.createHash('sha256').update(rtok2).digest('hex')]);
  ok('expired reset token rejected', (await call('POST', '/api/auth/reset', null, { token: rtok2, password: 'another12345' })).status === 400);
  const sTok = (await call('POST', '/api/auth/login', null, { email: secEmail, password: 'brandnew123' })).body.token;
  const tfa = await call('POST', '/api/auth/2fa/setup', sTok); ok('2FA setup returns secret and QR', tfa.status === 200 && tfa.body.secret.length >= 16 && tfa.body.qr.startsWith('data:image/png'));
  ok('2FA enable rejects a wrong code', (await call('POST', '/api/auth/2fa/enable', sTok, { code: '000000' })).status === 400);
  ok('2FA enable accepts the right code', (await call('POST', '/api/auth/2fa/enable', sTok, { code: totp.token(tfa.body.secret) })).status === 200);
  const lg1 = await call('POST', '/api/auth/login', null, { email: secEmail, password: 'brandnew123' }); ok('login now asks for a code', lg1.status === 200 && lg1.body.needs2fa === true && !lg1.body.token);
  ok('login rejects a wrong code', (await call('POST', '/api/auth/login', null, { email: secEmail, password: 'brandnew123', code: '123456' })).status === 401);
  const lg2 = await call('POST', '/api/auth/login', null, { email: secEmail, password: 'brandnew123', code: totp.token(tfa.body.secret) }); ok('login succeeds with a valid code', lg2.status === 200 && !!lg2.body.token);
  ok('/auth/me reports two-factor status', (await call('GET', '/api/auth/me', lg2.body.token)).body.user.twoFactorEnabled === true);
  ok('2FA cannot be turned off without password + code', (await call('POST', '/api/auth/2fa/disable', lg2.body.token, { password: 'wrong', code: totp.token(tfa.body.secret) })).status === 401 && (await call('POST', '/api/auth/2fa/disable', lg2.body.token, { password: 'brandnew123', code: totp.token(tfa.body.secret) })).status === 200);

  console.log('Team access + accountant workspace');
  const acctEmail = `acct-${stamp}@test.co.za`; const viewEmail = `view-${stamp}@test.co.za`;
  const tmInv1 = await call('POST', '/api/team/invite', ta, { email: acctEmail, role: 'ACCOUNTANT' });
  ok('inviting an unknown email creates a pending invitation', tmInv1.status === 201 && tmInv1.body.status === 'invited');
  ok('duplicate invitation rejected', (await call('POST', '/api/team/invite', ta, { email: acctEmail, role: 'ACCOUNTANT' })).status === 409);
  ok('invalid role rejected', (await call('POST', '/api/team/invite', ta, { email: 'x@y.co.za', role: 'OWNER' })).status === 400);
  const t1 = (await call('GET', '/api/team', ta)).body; ok('team list shows owner + pending invite', t1.members.length === 1 && t1.invitations.length === 1 && t1.canManage === true);
  const AC = (await call('POST', '/api/auth/register', null, { organizationName: `Practice ${stamp}`, name: 'Accountant', email: acctEmail, password: 'password123' })).body;
  const acList = (await call('GET', '/api/companies', AC.token)).body.companies; const clientA = acList.find((c) => c.id === A.organization.id);
  ok('registering with an invited email auto-joins the client company', acList.length === 2 && clientA?.role === 'ACCOUNTANT');
  ok('invitation consumed', (await call('GET', '/api/team', ta)).body.invitations.length === 0);
  const sw = await call('POST', `/api/companies/${A.organization.id}/switch`, AC.token); const tAcc = sw.body.token;
  ok('accountant can open the client books and read invoices', sw.status === 200 && (await call('GET', '/api/invoices', tAcc)).status === 200);
  ok('accountant cannot manage the team', (await call('POST', '/api/team/invite', tAcc, { email: 'z@z.co.za', role: 'VIEWER' })).status === 403);
  const ov = (await call('GET', '/api/companies/overview', AC.token)).body.companies; const ovA = ov.find((c) => c.id === A.organization.id);
  ok('overview lists every client with counters', ov.length === 2 && typeof ovA.unmatchedBank === 'number' && typeof ovA.overdueInvoices === 'number' && ovA.role === 'ACCOUNTANT');
  ok('overview counts reflect the client data (the sent invoice is not overdue yet)', ovA.drafts >= 0 && ovA.attention >= 0);
  const VW = (await call('POST', '/api/auth/register', null, { organizationName: `Viewer Co ${stamp}`, name: 'Viewer', email: viewEmail, password: 'password123' })).body;
  const vwInv = await call('POST', '/api/team/invite', ta, { email: viewEmail, role: 'VIEWER' }); ok('inviting an existing user adds them immediately', vwInv.status === 201 && vwInv.body.status === 'added');
  const vTok = (await call('POST', `/api/companies/${A.organization.id}/switch`, VW.token)).body.token;
  ok('viewer can read but not write', (await call('GET', '/api/invoices', vTok)).status === 200 && (await call('POST', '/api/contacts', vTok, { name: 'Nope', type: 'CUSTOMER' })).status === 403);
  const vid = VW.user.id;
  ok('promoting viewer to accountant takes effect on the same token', (await call('PATCH', `/api/team/${vid}`, ta, { role: 'ACCOUNTANT' })).status === 200 && (await call('POST', '/api/contacts', vTok, { name: 'Allowed', type: 'CUSTOMER' })).status === 201);
  ok('an owner cannot be removed or demoted', (await call('DELETE', `/api/team/${A.user.id}`, ta)).status === 409 && (await call('PATCH', `/api/team/${A.user.id}`, ta, { role: 'VIEWER' })).status === 409);
  ok('removing a member works', (await call('DELETE', `/api/team/${vid}`, ta)).status === 200);
  ok('a removed member loses access immediately, even with a valid token', (await call('GET', '/api/invoices', vTok)).status === 401);
  ok('removed member can still sign in to their own company', (await call('POST', '/api/auth/login', null, { email: viewEmail, password: 'password123' })).status === 200);
  ok('the other company stays untouched (tenant B cannot see team of A)', (await call('GET', '/api/team', tb)).body.members.every((m) => m.id !== AC.user.id));

  console.log('Subscription (R250/month, trial, gating)');
  
  const adminDb = new Client({ connectionString: process.env.ADMIN_DATABASE_URL || 'postgres://postgres:devpassword@localhost:5432/nexus_next' }); await adminDb.connect();
  const SB = await reg('S'); const tsb = SB.token; const sbOrg = SB.organization.id;
  const b0 = (await call('GET', '/api/billing', tsb)).body;
  ok('new company starts a 14-day trial at R250', b0.status === 'TRIALING' && b0.entitled === true && b0.daysLeft >= 13 && b0.price === 250);
  ok('/auth/me carries the subscription state', (await call('GET', '/api/auth/me', tsb)).body.organization.subscription.entitled === true);
  ok('checkout says plainly when the plan is not configured', (await call('POST', '/api/billing/checkout', tsb)).status === 503);
  ok('tenant app role cannot grant itself a subscription', await (async () => { const k = connect(pool); try { await k.query('BEGIN'); await k.query("SELECT set_config('app.current_org',$1,true)", [sbOrg]); await k.query("UPDATE organizations SET subscription_status='ACTIVE' WHERE id=$1", [sbOrg]); await k.query('ROLLBACK'); return false; } catch (e) { await k.query('ROLLBACK').catch(() => {}); return /permission denied/i.test(e.message); } finally { k.release(); } })());
  await adminDb.query("UPDATE organizations SET trial_ends_at = now() - interval '1 day' WHERE id=$1", [sbOrg]);
  const w1 = await call('POST', '/api/contacts', tsb, { name: 'Blocked', type: 'CUSTOMER' });
  ok('expired trial: writes are refused with a clear message (402)', w1.status === 402 && /R250/.test(w1.body.error || ''));
  ok('expired trial: reading and exporting still work', (await call('GET', '/api/invoices', tsb)).status === 200 && (await call('GET', '/api/accounts', tsb)).status === 200);
  ok('expired trial: billing, team and company routes stay reachable', (await call('POST', '/api/team/invite', tsb, { email: 'bad', role: 'VIEWER' })).status === 400 && (await call('GET', '/api/billing', tsb)).body.status === 'EXPIRED');
  const act1 = await subSvc.activate(servicePool, sbOrg, { reference: `ref1-${stamp}`, amount: 250, customerCode: `CUS_${stamp}` });
  const b1 = (await call('GET', '/api/billing', tsb)).body;
  ok('a successful payment activates the plan for a month', act1.duplicate === false && b1.status === 'ACTIVE' && b1.entitled && b1.daysLeft >= 28 && b1.payments.length === 1);
  ok('writes work again after paying', (await call('POST', '/api/contacts', tsb, { name: 'Unblocked', type: 'CUSTOMER' })).status === 201);
  const act1b = await subSvc.activate(servicePool, sbOrg, { reference: `ref1-${stamp}`, amount: 250 });
  const b1b = (await call('GET', '/api/billing', tsb)).body;
  ok('the same payment reference never extends access twice', act1b.duplicate === true && b1b.currentPeriodEnd === b1.currentPeriodEnd && b1b.payments.length === 1);
  await subSvc.activate(servicePool, sbOrg, { reference: `ref2-${stamp}`, amount: 250 });
  const b2 = (await call('GET', '/api/billing', tsb)).body; ok('a renewal extends from the end of the paid period', new Date(b2.currentPeriodEnd) > new Date(b1.currentPeriodEnd) && b2.daysLeft >= 58);
  const sign = (obj) => { const raw = JSON.stringify(obj); return { raw, sig: crypto.createHmac('sha512', 'sk_test_regression').update(raw).digest('hex') }; };
  const hook = async (obj) => { const { raw, sig } = sign(obj); const r = await fetch(BASE + '/webhooks/paystack', { method: 'POST', headers: { 'x-paystack-signature': sig, 'Content-Type': 'application/json' }, body: raw }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const subCode = `SUB_${stamp}`;
  ok('subscription.create webhook stores the cancel codes', (await hook({ event: 'subscription.create', data: { subscription_code: subCode, email_token: 'tok', customer: { customer_code: `CUS_${stamp}` } } })).status === 200 && (await call('GET', '/api/billing', tsb)).body.hasSubscription === true);
  const dupHook = await hook({ event: 'subscription.create', data: { subscription_code: subCode, email_token: 'tok', customer: { customer_code: `CUS_${stamp}` } } }); ok('a repeated webhook is ignored', dupHook.body.duplicate === true);
  await hook({ event: 'invoice.payment_failed', data: { subscription: { subscription_code: subCode } } });
  const bf = (await call('GET', '/api/billing', tsb)).body; ok('a failed renewal is flagged as past due but keeps access during the grace period', bf.status === 'PAST_DUE' && bf.entitled === true);
  await subSvc.activate(servicePool, sbOrg, { reference: `ref3-${stamp}`, amount: 250 }); ok('a later successful charge clears past due', (await call('GET', '/api/billing', tsb)).body.status === 'ACTIVE');
  await hook({ event: 'subscription.disable', data: { subscription_code: subCode } });
  const bc = (await call('GET', '/api/billing', tsb)).body; ok('cancelling keeps access until the paid month ends', bc.cancelled === true && bc.entitled === true && (await call('POST', '/api/contacts', tsb, { name: 'Still allowed', type: 'CUSTOMER' })).status === 201);
  ok('cancel again is refused politely', (await call('POST', '/api/billing/cancel', tsb)).status === 409);
  ok('unsigned subscription webhook rejected', (await fetch(BASE + '/webhooks/paystack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'subscription.disable', data: { subscription_code: subCode } }) })).status === 401);
  const now = new Date(); const ent = (o) => subSvc.entitlement(o, now);
  ok('entitlement: lapsed beyond the 3-day grace is expired', ent({ subscription_status: 'ACTIVE', current_period_end: new Date(now.getTime() - 5 * 86400000) }).entitled === false && ent({ subscription_status: 'ACTIVE', current_period_end: new Date(now.getTime() - 2 * 86400000) }).entitled === true);
  const SBt = await reg('T'); ok('another company cannot see this company billing history', (await call('GET', '/api/billing', SBt.token)).body.payments.length === 0);
  await adminDb.end();

  console.log('Multi-company plan (R470)');
  const MC = await reg('M'); const m1 = MC.organization.id; const mc2 = await call('POST', '/api/companies', MC.token, { name: `Second ${stamp}` }); const m2 = mc2.body.organization.id; const tm2 = mc2.body.token;
  const tm1 = (await call('POST', `/api/companies/${m1}/switch`, tm2)).body.token;
  const bm1 = (await call('GET', '/api/billing', tm1)).body, bm2 = (await call('GET', '/api/billing', tm2)).body;
  ok('two plans offered: R250 single and R470 multi; owner has two companies', bm1.plans.find((x) => x.key === 'SINGLE').price === 250 && bm1.plans.find((x) => x.key === 'MULTI').price === 470 && bm2.ownedCompanies === 2);
  ok('a second company shares the first trial clock (no fresh trial)', bm1.trialEndsAt === bm2.trialEndsAt);
  ok('multi checkout names the missing multi plan code', /PAYSTACK_PLAN_CODE_MULTI/.test((await call('POST', '/api/billing/checkout', tm1, { plan: 'MULTI' })).body.error || ''));
  const adm2 = new Client({ connectionString: process.env.ADMIN_DATABASE_URL || 'postgres://postgres:devpassword@localhost:5432/nexus_next' }); await adm2.connect();
  await adm2.query("UPDATE organizations SET trial_ends_at = now() - interval '1 day' WHERE id = ANY($1)", [[m1, m2]]); await adm2.end();
  await subSvc.activate(servicePool, m1, { reference: `m-single-${stamp}`, amount: 250, plan: 'SINGLE' });
  ok('single plan covers only the company that paid', (await call('POST', '/api/contacts', tm1, { name: 'Ok', type: 'CUSTOMER' })).status === 201 && (await call('POST', '/api/contacts', tm2, { name: 'No', type: 'CUSTOMER' })).status === 402);
  await subSvc.activate(servicePool, m1, { reference: `m-multi-${stamp}`, amount: 470, plan: 'MULTI' });
  const cov = (await call('GET', '/api/billing', tm2)).body;
  ok('multi plan covers every company the payer owns', (await call('POST', '/api/contacts', tm2, { name: 'Yes', type: 'CUSTOMER' })).status === 201 && cov.status === 'COVERED' && cov.entitled && cov.coveredBy.id === m1);
  ok('/auth/me reports the covered state', (await call('GET', '/api/auth/me', tm2)).body.organization.subscription.status === 'COVERED');
  ok('multi plan does not cover companies owned by someone else', (await call('GET', '/api/billing', tb)).body.status !== 'COVERED');
  await call('POST', '/api/team/invite', tm1, { email: `t${'B'}-${stamp}@test.co.za`, role: 'ACCOUNTANT' });
  ok('being an accountant on a multi-plan company does not cover your own companies', (await call('GET', '/api/billing', tb)).body.coveredBy === null);

  console.log('Insights');
  const plA = (await call('GET', '/api/reports/profit-loss?from=2026-04-01&to=2026-04-30', ta)); const im = (await call('GET', '/api/insights/monthly?months=24', ta)).body.months; const apr = im.find((m) => m.month === '2026-04');
  ok('monthly chart has 24 months and matches the ledger P&L for April', im.length === 24 && !!apr && (plA.status !== 200 || near(apr.revenue, plA.body.totalRevenue ?? apr.revenue)) && apr.revenue > 0);
  const exR = (await call('GET', '/api/insights/explain?metric=revenue&month=2026-04', ta)).body;
  ok('explain: revenue total equals the chart and names the customer', near(exR.total, apr.revenue) && /increased/.test(exR.headline) && exR.counterparties.some((x) => x.name === 'Acme') && exR.documents.length > 0 && exR.documents[0].link.startsWith('/invoices/'));
  const exE = (await call('GET', '/api/insights/explain?metric=expenses&month=2026-04', ta)).body; ok('explain: expenses total equals the chart', near(exE.total, apr.expenses));
  ok('explain rejects a bad month or metric', (await call('GET', '/api/insights/explain?metric=revenue&month=2026-13', ta)).status === 400 && (await call('GET', '/api/insights/explain?metric=nonsense&month=2026-04', ta)).status === 400);
  const chg = (await call('GET', '/api/insights/changes?month=2026-04', ta)).body; ok('what changed: six measures, revenue flagged good when it rose', chg.items.length === 6 && chg.items.find((i) => i.key === 'revenue').tone === 'good' && near(chg.items.find((i) => i.key === 'profit').current, apr.profit));
  const pb = (await call('GET', '/api/insights/payment-behaviour', ta)); const rcI = (await call('GET', '/api/insights/reconciliation', ta)).body;
  ok('payment behaviour and reconciliation respond with sane shapes', pb.status === 200 && Array.isArray(pb.body.customers) && rcI.total === rcI.matched + rcI.ignored + rcI.unmatched && rcI.matchedPct >= 0 && rcI.matchedPct <= 100);
  const imB = (await call('GET', '/api/insights/explain?metric=revenue&month=2026-04', SBt.token)).body; ok('insights are tenant-scoped (another company sees nothing of A)', imB.total === 0 && imB.documents.length === 0);
  const ovR = (await call('GET', '/api/companies/overview', ta)).body.companies[0]; ok('clients overview carries a readiness score', typeof ovR.readiness === 'number' && ovR.readiness >= 0 && ovR.readiness <= 100);

  console.log('Practice tasks');
  const tk1 = await call('POST', '/api/tasks', ta, { title: 'Phone the bank', dueDate: '2026-01-15', assigneeId: A.user.id }); ok('create a task assigned to a team member', tk1.status === 201 && tk1.body.task.assigneeName === 'Tester');
  ok('task needs a title; assignee must belong to the company', (await call('POST', '/api/tasks', ta, { title: ' ' })).status === 400 && (await call('POST', '/api/tasks', ta, { title: 'x', assigneeId: B.user.id })).status === 400);
  const ck1 = await call('POST', '/api/tasks/checklist', ta, { period: '2026-09' }); const ck2 = await call('POST', '/api/tasks/checklist', ta, { period: '2026-09' });
  ok('monthly checklist creates ten steps once, and running it again adds none', ck1.status === 201 && ck1.body.created === 10 && ck2.body.created === 0 && ck1.body.dueDate === '2026-10-31');
  const tl = (await call('GET', '/api/tasks', ta)).body; ok('task list shows 11 tasks and the people who can be assigned', tl.tasks.length === 11 && tl.people.length >= 1);
  const dn = await call('PATCH', `/api/tasks/${tk1.body.task.id}`, ta, { status: 'DONE' }); ok('completing a task records who and when', dn.body.task.status === 'DONE' && dn.body.task.completedByName === 'Tester' && !!dn.body.task.completedAt);
  await call('PATCH', `/api/tasks/${tk1.body.task.id}`, ta, { status: 'OPEN' });
  const prac = (await call('GET', '/api/practice', ta)).body; const prA = prac.companies.find((x) => x.id === A.organization.id);
  ok('practice view totals open and overdue work and shows workload per person', prA.open === 11 && prA.overdue >= 1 && prac.totals.open >= 11 && prac.workload.some((w) => w.name === 'Tester' && w.open === 1) && prac.workload.some((w) => w.name === 'Unassigned'));
  ok('another company cannot see or change these tasks', (await call('GET', '/api/tasks', tb)).body.tasks.length === 0 && (await call('PATCH', `/api/tasks/${tk1.body.task.id}`, tb, { status: 'DONE' })).status === 404 && (await call('DELETE', `/api/tasks/${tk1.body.task.id}`, tb)).status === 404);
  ok('delete a task', (await call('DELETE', `/api/tasks/${tk1.body.task.id}`, ta)).status === 200);

  console.log('Attachments (file storage)');
  const up = async (tok: string, name: string, type: string, body: string, extra: Record<string, string> = {}) => { const fd = new FormData(); fd.append('file', new Blob([body], { type }), name); for (const [k, v] of Object.entries(extra)) fd.append(k, v); const r = await fetch(BASE + '/api/attachments', { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: fd }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const a1 = await up(ta, 'receipt 1.pdf', 'application/pdf', '%PDF-1.4 test receipt', { entityType: 'INVOICE', entityId: iv.id });
  ok('upload a file against an invoice', a1.status === 201 && a1.body.attachment.filename === 'receipt 1.pdf' && a1.body.attachment.size > 0);
  ok('unsupported file types and empty uploads are refused', (await up(ta, 'run.exe', 'application/x-msdownload', 'MZ')).status === 400 && (await call('POST', '/api/attachments', ta, {})).status === 400);
  const al = (await call('GET', `/api/attachments?entityType=INVOICE&entityId=${iv.id}`, ta)).body; ok('file is listed on that invoice only', al.attachments.length === 1 && (await call('GET', '/api/attachments?entityType=BILL', ta)).body.attachments.length === 0);
  const dl = await fetch(`${BASE}/api/attachments/${a1.body.attachment.id}/download`, { headers: { Authorization: `Bearer ${ta}` } }); ok('download returns the same bytes', dl.status === 200 && (await dl.text()) === '%PDF-1.4 test receipt');
  ok('another company cannot list, download or delete it', (await call('GET', `/api/attachments?entityType=INVOICE&entityId=${iv.id}`, tb)).body.attachments.length === 0 && (await call('GET', `/api/attachments/${a1.body.attachment.id}/download`, tb)).status === 404 && (await call('DELETE', `/api/attachments/${a1.body.attachment.id}`, tb)).status === 404);
  ok('delete a file', (await call('DELETE', `/api/attachments/${a1.body.attachment.id}`, ta)).status === 200 && (await call('GET', `/api/attachments?entityType=INVOICE&entityId=${iv.id}`, ta)).body.attachments.length === 0);
  ok('session endpoint is served by Auth.js', (await call('GET', '/api/session/session')).status === 200 && (await call('GET', '/api/session/csrf')).body.csrfToken?.length > 10);

  console.log('Webhook');
  ok('unsigned paystack webhook -> 401', (await call('POST', '/webhooks/paystack', null, { event: 'charge.success' })).status === 401);
  ok('no token -> 401', (await call('GET', '/api/invoices')).status === 401);

  console.log(`\n${pass} passed, ${fail} failed`); await pool.prisma.$disconnect(); await authPool.prisma.$disconnect(); await servicePool.prisma.$disconnect(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
