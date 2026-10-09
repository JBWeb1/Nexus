// Runs a quarter of real-world bookkeeping through the API from samples/karoo-coffee-books-q3-2026.xlsx,
// then checks every report against figures worked out independently from the workbook.
// Needs a running server (API=http://localhost:3000) with DISABLE_RATE_LIMIT=1. Run: npx tsx scripts/business-sim.ts
import ExcelJS from 'exceljs'; import fs from 'fs';
const BASE = process.env.API || 'http://localhost:3000';
const FILE = process.argv[2] || 'samples/karoo-coffee-books-q3-2026.xlsx';
let pass = 0, fail = 0; const findings: string[] = [];
const ok = (name: string, cond: boolean, extra: any = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${cond ? '' : '  ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)).slice(0, 400)}`); };
const note = (s: string) => { findings.push(s); console.log(`  NOTE  ${s}`); };
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;
const r2 = (n: number) => Math.round(n * 100) / 100;
const R = (n: number) => 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let token = '';
async function call(method: string, path: string, body?: any, raw = false): Promise<any> {
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + '/api' + path, { method, headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  if (raw) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') };
  const t = await res.text(); let j: any; try { j = JSON.parse(t); } catch { j = t; } return { status: res.status, body: j };
}
const iso = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : null);
const val = (v: any) => (v && typeof v === 'object' && 'result' in v ? v.result : v);

(async () => {
  // ---------- Read the workbook ----------
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(FILE);
  const rows = (name: string) => { const out: any[][] = []; wb.getWorksheet(name)!.eachRow((r, n) => { if (n > 1) out.push((r.values as any[]).slice(1).map(val)); }); return out; };
  const notes = Object.fromEntries(rows('Notes').map((r) => [r[0], r[1]]));
  const vatRate = Number(notes['VAT rate']), opening = Number(notes['Opening bank balance 1 Jul 2026 (R)']);
  const catMap = Object.fromEntries(rows('Categories').map((r) => [r[0], String(r[1])]));
  const contacts = rows('Contacts'), sales = rows('Sales'), purchases = rows('Purchases'), bankOther = rows('Bank other');
  console.log(`Workbook: ${FILE} (${wb.worksheets.length} sheets, ${sales.length} sales, ${purchases.length} bills)`);

  // ---------- Set up the company ----------
  console.log('\n1. Company set-up');
  const stamp = Date.now();
  const reg = await call('POST', '/auth/register', { organizationName: String(notes['Business']).replace(/ \(.*\)$/, ''), name: 'Thandi Mokoena', email: `owner-${stamp}@karoo.example`, password: 'Roast3r!2026' });
  ok('owner registers the company', reg.status === 201, reg.body); token = reg.body.token;
  const org = await call('PATCH', '/organization', { vatRegistered: true, vatNumber: String(notes['VAT number']), vatCycle: 'B', defaultTermsDays: Number(notes['Invoice terms (days)']), invoicePrefix: 'KCR' });
  ok('VAT registration and invoice terms saved', org.status === 200, org.body);
  const accounts = (await call('GET', '/accounts')).body.accounts; const acc = (code: string) => accounts.find((a: any) => a.code === code)?.id;
  const vat15 = (await call('GET', '/tax-rates')).body.taxRates.find((t: any) => t.rate === vatRate * 100).id;
  const bankRes = await call('POST', '/bank-accounts', { name: String(notes['Bank']), bankName: 'FNB', openingBalance: opening, openingDate: '2026-07-01' });
  ok(`bank account opened with ${R(opening)}`, bankRes.status === 201, bankRes.body); const bank = bankRes.body.bankAccount;
  const people: Record<string, any> = {};
  for (const [name, type, email, phone] of contacts) { const c = await call('POST', '/contacts', { name, type, email, phone }); people[name] = c.body.contact; }
  ok(`${contacts.length} customers and suppliers added`, Object.values(people).every(Boolean));

  // ---------- Import the old expense sheet ----------
  console.log('\n2. Import the old Excel expense book');
  const form = new FormData(); form.append('file', new Blob([fs.readFileSync(FILE)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'karoo-books.xlsx');
  const pv = await call('POST', '/import/expenses/preview', form);
  ok('preview reads the sheet and finds Date/Description/Amount columns', pv.status === 200 && pv.body.detectedColumns?.date && pv.body.detectedColumns?.amount, pv.body);
  const sheetRows = wb.getWorksheet('Expenses')!; const expected: Record<number, { amount: number; refund: boolean; cat: string }> = {};
  sheetRows.eachRow((r, n) => { if (n === 1) return; const raw = String(val(r.getCell(4).value) ?? ''); const cat = String(r.getCell(3).value ?? ''); if (!cat) return;
    const num = typeof val(r.getCell(4).value) === 'number' ? val(r.getCell(4).value) : parseFloat(raw.replace(/[R\s()]/g, '').replace(/,(\d{2})$/, '.$1').replace(/,/g, ''));
    expected[n] = { amount: num, refund: /^\(.*\)$/.test(raw.trim()), cat }; });
  const prev = pv.body.rows || [];
  const textAmountsRead = prev.filter((p: any) => expected[p.rowNumber] && !expected[p.rowNumber].refund).every((p: any) => near(p.amount, expected[p.rowNumber].amount));
  ok('SA ("1 850,00"), US ("1,500.00") and "R899.00" amounts all read correctly', textAmountsRead, prev);
  ok('dd/mm/yyyy text dates and real Excel dates both read', prev.filter((p: any) => expected[p.rowNumber]).every((p: any) => /^2026-0[789]-\d\d$/.test(p.date)), prev.map((p: any) => p.date));
  const totalRow = prev.find((p: any) => /TOTAL/i.test(p.description)); ok('the TOTAL row is flagged as not importable', !totalRow || !totalRow.valid, totalRow);
  const refundRow = prev.find((p: any) => expected[p.rowNumber]?.refund);
  if (refundRow?.valid) note(`BUG: refund "(99,00)" on row ${refundRow.rowNumber} is previewed as a valid R${refundRow.amount} EXPENSE; importing it would book money received as money spent. Skipped it on commit.`);
  const toImport = prev.filter((p: any) => p.valid && expected[p.rowNumber] && !expected[p.rowNumber].refund).map((p: any) => ({ ...p, accountId: acc(catMap[expected[p.rowNumber].cat]) }));
  const cm = await call('POST', '/import/expenses/commit', { bankAccountId: bank.id, rows: toImport });
  ok(`${toImport.length} expense rows imported, none failed`, cm.status === 200 && cm.body.imported === toImport.length && !cm.body.failed.length, cm.body);
  const importedTotal = r2(toImport.reduce((s: number, p: any) => s + p.amount, 0));
  const importedVat = r2(importedTotal * vatRate / (1 + vatRate) - 0); // what a VAT vendor could have claimed if these were standard-rated
  note(`Imported expenses go to the expense accounts at the full amount: no input VAT is claimed on ${R(importedTotal)} (up to ${R(importedVat)} lost if these were VAT invoices). Real VAT vendors need a VAT option on import.`);

  // ---------- Sales ----------
  console.log('\n3. Sales: invoices, payments, a credit note, a quote');
  const inv: Record<string, any> = {}; let receipts = 0; const dueDate = (d: string) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + Number(notes['Invoice terms (days)'])); return x.toISOString().slice(0, 10); };
  for (const [d, ref, cust, item, qty, price, exVat, vat, total, paidOn, paid, cnQty] of sales.filter((s) => s[1] !== 'Q1')) {
    const c = await call('POST', '/invoices', { contactId: people[cust].id, issueDate: iso(d), dueDate: dueDate(iso(d)!), lines: [{ description: item, quantity: qty, unitPrice: price, accountId: acc('4000'), taxRateId: vat15 }] });
    ok(`${ref}: invoice ${R(total)} for ${cust} (VAT ${R(vat)})`, c.status === 201 && near(c.body.invoice.total, total) && near(c.body.invoice.taxTotal, vat), c.body); inv[ref] = c.body.invoice;
    const s = await call('POST', `/invoices/${inv[ref].id}/send`); ok(`${ref}: invoice sent (posts to the ledger)`, s.status === 200, s.body);
    if (cnQty) {
      const cn = await call('POST', `/invoices/${inv[ref].id}/credit-notes`, { reason: 'Damaged in delivery', issueDate: '2026-08-12', lines: [{ description: `${item} (damaged)`, quantity: cnQty, unitPrice: price, accountId: acc('4000'), taxRateId: vat15 }] });
      ok(`${ref}: credit note for ${cnQty} damaged bags = ${R(r2(cnQty * price * (1 + vatRate)))}`, cn.status === 201 && near(cn.body.creditNote.total, r2(cnQty * price * (1 + vatRate))), cn.body);
    }
    if (paidOn) {
      const p = await call('POST', '/payments/invoice', { invoiceId: inv[ref].id, bankAccountId: bank.id, amount: paid, date: iso(paidOn) });
      ok(`${ref}: customer paid ${R(paid)} on ${iso(paidOn)}`, p.status === 201 || p.status === 200, p.body); receipts += paid;
    }
  }
  const [qd, , qcust, qitem, qqty, qprice, , , qtotal, qpaidOn, qpaid] = sales.find((s) => s[1] === 'Q1')!;
  const q = await call('POST', '/quotes', { contactId: people[qcust].id, issueDate: iso(qd), expiryDate: '2026-09-30', lines: [{ description: qitem, quantity: qqty, unitPrice: qprice, accountId: acc('4000'), taxRateId: vat15 }] });
  ok(`quote for ${qitem} ${R(qtotal)}`, q.status === 201 && near(q.body.quote.total, qtotal), q.body);
  ok('quote sent and accepted', (await call('POST', `/quotes/${q.body.quote.id}/send`)).status === 200 && (await call('POST', `/quotes/${q.body.quote.id}/accept`)).status === 200);
  const conv = await call('POST', `/quotes/${q.body.quote.id}/convert`); ok('accepted quote converted to an invoice', conv.status === 201, conv.body);
  const qInv = conv.body.invoice;
  if (qInv.issueDate !== '2026-09-12') {
    note(`Converting a quote dates the invoice today (${qInv.issueDate}), not the day the work was accepted. Trying to correct it to 2026-09-12.`);
    const fix = await call('PATCH', `/invoices/${qInv.id}`, { issueDate: '2026-09-12', dueDate: '2026-10-12' });
    ok('draft invoice date can be corrected before sending', fix.status === 200 && fix.body.invoice?.issueDate === '2026-09-12', fix.body);
  }
  ok('converted invoice sent', (await call('POST', `/invoices/${qInv.id}/send`)).status === 200);
  const qp = await call('POST', '/payments/invoice', { invoiceId: qInv.id, bankAccountId: bank.id, amount: qpaid, date: iso(qpaidOn) });
  ok(`Q1: customer paid ${R(qpaid)}`, qp.status === 201 || qp.status === 200, qp.body); receipts += qpaid; inv.Q1 = qInv;
  const over = await call('POST', '/payments/invoice', { invoiceId: inv.S2.id, bankAccountId: bank.id, amount: 999999, date: '2026-09-01' });
  ok('over-payment of an invoice is refused', over.status >= 400, over.body);

  // ---------- Purchases ----------
  console.log('\n4. Purchases: supplier bills and payments');
  let payments = 0;
  for (const [d, ref, sup, item, qty, price, exVat, vat, total, paidOn, code] of purchases) {
    const b = await call('POST', '/bills', { contactId: people[sup].id, issueDate: iso(d), dueDate: dueDate(iso(d)!), lines: [{ description: item, quantity: qty, unitPrice: price, accountId: acc(String(code)), taxRateId: vat15 }] });
    ok(`${ref}: bill ${R(total)} from ${sup}`, b.status === 201 && near(b.body.bill.total, total), b.body);
    ok(`${ref}: bill approved`, (await call('POST', `/bills/${b.body.bill.id}/approve`)).status === 200);
    if (paidOn) { const p = await call('POST', '/payments/bill', { billId: b.body.bill.id, bankAccountId: bank.id, amount: total, date: iso(paidOn) }); ok(`${ref}: supplier paid ${R(total)}`, p.status < 300, p.body); payments += total; }
  }

  // ---------- Bank statement and reconciliation ----------
  console.log('\n5. Bank statement: match every line');
  const lines = (await call('GET', `/bank-accounts/${bank.id}/transactions`)).body;
  // Customer receipts and supplier payments appear on the statement; match each to the ledger.
  const statement = [
    ...sales.filter((s) => s[9]).map((s) => ({ date: s[1] === 'Q1' ? iso(s[9]) : iso(s[9]), desc: `MAGTAPE CREDIT ${String(s[2]).toUpperCase()}`, amount: s[10], type: 'CREDIT' })),
    ...purchases.filter((p) => p[9]).map((p) => ({ date: iso(p[9]), desc: `INTERNET PMT TO ${String(p[2]).toUpperCase()}`, amount: p[8], type: 'DEBIT' })),
  ];
  let matched = 0;
  for (const s of statement) {
    const t = (await call('POST', `/bank-accounts/${bank.id}/transactions`, { date: s.date, description: s.desc, amount: s.amount, type: s.type })).body.transaction;
    const sug = (await call('GET', `/bank-accounts/${bank.id}/transactions/${t.id}/suggestions`)).body.suggestions || [];
    if (sug.length) { const m = await call('POST', `/bank-accounts/${bank.id}/transactions/${t.id}/reconcile`, { journalLineId: sug[0].journalLineId }); if (m.status === 200) matched++; }
  }
  ok(`all ${statement.length} receipts and payments found a matching ledger entry and reconciled`, matched === statement.length, `${matched}/${statement.length}`);
  // Bank fees via a rule, the cash deposit by hand.
  const rule = await call('POST', '/bank-rules', { name: 'FNB fees', matchText: 'FNB SERVICE FEE', direction: 'DEBIT', accountId: acc('6400') });
  ok('bank rule "FNB SERVICE FEE -> Bank Charges" created', rule.status === 201, rule.body);
  let fees = 0, otherIncome = 0; const manual: any[] = [];
  for (const [d, desc, mi, mo] of bankOther) {
    const t = (await call('POST', `/bank-accounts/${bank.id}/transactions`, { date: iso(d), description: desc, amount: mi || mo, type: mi ? 'CREDIT' : 'DEBIT' })).body.transaction;
    if (mo) fees += mo; else { otherIncome += mi; manual.push(t); }
  }
  const ap = await call('POST', `/bank-accounts/${bank.id}/apply-rules`); ok('rule auto-posts the 3 monthly bank fees', ap.status === 200 && ap.body.applied === 3, ap.body);
  for (const t of manual) ok('cash deposit categorised to Other Income', (await call('POST', `/bank-accounts/${bank.id}/transactions/${t.id}/categorise`, { accountId: acc('4100') })).status === 200);
  const unmatched = ((await call('GET', `/bank-accounts/${bank.id}/transactions`)).body.transactions || []).filter((t: any) => t.reconciliationStatus === 'UNMATCHED');
  ok('no unreconciled bank lines left', unmatched.length === 0, unmatched);

  // ---------- Independent expected figures ----------
  const sum = (a: any[], i: number) => r2(a.reduce((s, x) => s + Number(x[i] || 0), 0));
  const cnEx = r2(sales.reduce((s, x) => s + (x[11] ? x[11] * x[5] : 0), 0));
  const salesEx = r2(sum(sales, 6) - cnEx), purchEx = sum(purchases, 6);
  const expect = {
    bank: r2(opening + receipts + otherIncome - payments - importedTotal - fees),
    revenue: r2(salesEx + otherIncome),
    expenses: r2(purchEx + importedTotal + fees),
    debtors: r2(sales.reduce((s, x) => s + x[8] - (x[11] ? r2(x[11] * x[5] * (1 + vatRate)) : 0) - Number(x[10] || 0), 0)),
    creditors: r2(purchases.filter((p) => !p[9]).reduce((s, p) => s + p[8], 0)),
  };

  // ---------- Reports ----------
  console.log('\n6. Reports checked against the workbook');
  const bal = (await call('GET', '/bank-accounts')).body.bankAccounts.find((b: any) => b.id === bank.id).currentBalance;
  ok(`bank balance ${R(bal)} = expected ${R(expect.bank)}`, near(bal, expect.bank), { bal, expect: expect.bank });
  const pl = (await call('GET', '/reports/profit-and-loss?from=2026-07-01&to=2026-09-30')).body;
  ok(`P&L revenue ${R(pl.totalRevenue)} = ${R(expect.revenue)}`, near(pl.totalRevenue, expect.revenue), pl);
  ok(`P&L expenses ${R(pl.totalExpenses)} = ${R(expect.expenses)}`, near(pl.totalExpenses, expect.expenses), pl);
  ok(`net result ${R(pl.netProfit)}`, near(pl.netProfit, r2(expect.revenue - expect.expenses)), pl);
  const tb = (await call('GET', '/reports/trial-balance?asOf=2026-09-30')).body;
  ok(`trial balance balances (debits ${R(tb.totalDebit)} = credits ${R(tb.totalCredit)})`, tb.balanced && near(tb.totalDebit, tb.totalCredit), tb);
  const bs = (await call('GET', '/reports/balance-sheet?asOf=2026-09-30')).body;
  const bsBank = (bs.assets || []).find((a: any) => /Bank - /.test(a.name))?.amount;
  ok(`balance sheet bank at 30 Sep ${R(bsBank)} = ${R(expect.bank)} (opening balance dated 1 Jul)`, near(bsBank, expect.bank), bs.assets);
  ok(`balance sheet balances: assets ${R(bs.totalAssets)} = liabilities ${R(bs.totalLiabilities)} + equity ${R(bs.totalEquity)}`, bs.balanced && near(bs.totalAssets, r2(bs.totalLiabilities + bs.totalEquity)), bs);
  const ar = (await call('GET', '/reports/aged-receivables?asOf=2026-10-09')).body;
  ok(`debtors owe ${R(ar.totals.total)} = expected ${R(expect.debtors)}`, near(ar.totals.total, expect.debtors), ar.totals);
  ok('S4 shows as overdue (1-30 days) in aged debtors', ar.totals.d1_30 > 0, ar.totals);
  const apay = (await call('GET', '/reports/aged-payables?asOf=2026-10-09')).body;
  ok(`we owe suppliers ${R(apay.totals?.total)} = expected ${R(expect.creditors)}`, near(apay.totals?.total, expect.creditors), apay.totals);

  // ---------- VAT201 ----------
  console.log('\n7. VAT201 for July-August (bi-monthly)');
  const inPeriod = (d: any) => iso(d)! >= '2026-07-01' && iso(d)! <= '2026-08-31';
  const outVat = r2(sales.filter((s) => s[1] !== 'Q1' && inPeriod(s[0])).reduce((t, s) => t + s[7] - (s[11] ? r2(s[11] * s[5] * vatRate) : 0), 0));
  const inVat = r2(purchases.filter((p) => inPeriod(p[0])).reduce((t, p) => t + p[7], 0));
  const v = (await call('GET', '/reports/vat201?from=2026-07-01&to=2026-08-31')).body.vat201;
  ok(`output VAT ${R(v.outputVat)} = ${R(outVat)} (sales less credit note)`, near(v.outputVat, outVat), v);
  ok(`input VAT ${R(v.inputVat)} = ${R(inVat)} (supplier bills)`, near(v.inputVat, inVat), v);
  ok(`net VAT ${R(v.netVat)}: ${v.netVat < 0 ? 'refund due from SARS' : 'payable to SARS'}`, near(v.netVat, r2(outVat - inVat)), v);
  const fin = await call('POST', '/vat-periods/finalize', { periodStart: '2026-07-01', periodEnd: '2026-08-31' });
  ok('VAT period July-August finalized', fin.status < 300, fin.body);

  // ---------- Month-end ----------
  console.log('\n8. Month-end close and period lock');
  for (const m of ['2026-07', '2026-08']) {
    const chk = (await call('GET', `/month-end/${m}`)).body;
    ok(`${chk.label}: all blocking checks pass (${chk.progress}% complete)`, chk.blockingIssues === 0 && chk.canClose, chk.checks?.filter((c: any) => c.status !== 'ok').map((c: any) => `${c.title}: ${c.detail}`));
    const cl = await call('POST', `/month-end/${m}/close`); ok(`${chk.label} closed`, cl.status < 300, cl.body);
  }
  const late = await call('POST', '/invoices', { contactId: people['Hotel Breede'].id, issueDate: '2026-07-15', dueDate: '2026-08-14', lines: [{ description: 'Back-dated sale', quantity: 1, unitPrice: 100, accountId: acc('4000'), taxRateId: vat15 }] });
  const lateSend = late.status === 201 ? await call('POST', `/invoices/${late.body.invoice.id}/send`) : late;
  ok('posting into closed July is blocked', lateSend.status === 409, lateSend.body);
  if (late.status === 201) await call('POST', `/invoices/${late.body.invoice.id}/void`);
  const sep = (await call('GET', '/month-end/2026-09')).body;
  ok('September stays open, with an overdue-debtor warning to review', !sep.closed && sep.checks.some((c: any) => c.key === 'debtors' && c.status === 'warn'), sep.checks?.map((c: any) => `${c.key}:${c.status}`));

  // ---------- Exports ----------
  console.log('\n9. Exports');
  const gl = await call('GET', '/export/general-ledger?from=2026-07-01&to=2026-09-30', undefined, true);
  const glWb = new ExcelJS.Workbook(); let glRows = 0;
  try { await glWb.xlsx.load(gl.buffer); glRows = glWb.worksheets[0].rowCount; } catch {}
  ok(`general ledger exports to Excel (${glRows} rows)`, gl.status === 200 && glRows > 30, { status: gl.status, type: gl.type });
  fs.mkdirSync('samples/output', { recursive: true }); fs.writeFileSync('samples/output/general-ledger-q3-2026.xlsx', gl.buffer);
  const pdf = await call('GET', `/invoices/${inv.S4.id}/pdf`, undefined, true);
  ok('invoice PDF generated for the overdue invoice', pdf.status === 200 && pdf.buffer.subarray(0, 4).toString() === '%PDF', pdf.type);
  fs.writeFileSync('samples/output/invoice-S4.pdf', pdf.buffer);
  const dash = await call('GET', '/dashboard'); ok('dashboard loads', dash.status === 200, dash.body);

  console.log(`\nSummary: bank ${R(bal)}, revenue ${R(pl.totalRevenue)}, expenses ${R(pl.totalExpenses)}, net ${R(pl.netProfit)}, debtors ${R(ar.totals.total)}, VAT ${R(v.netVat)}`);
  console.log(`Login used: owner-${stamp}@karoo.example / Roast3r!2026`);
  fs.writeFileSync('samples/output/last-login.txt', `owner-${stamp}@karoo.example\nRoast3r!2026\n`);
  if (findings.length) { console.log('\nFindings:'); findings.forEach((f) => console.log(' - ' + f)); }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
