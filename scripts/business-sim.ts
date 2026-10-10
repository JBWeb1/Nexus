// Runs a quarter of real-world bookkeeping through the API from the files in samples/, then checks every report
// against figures worked out independently from the workbook.
// Needs a running server (API=http://localhost:3000) with DISABLE_RATE_LIMIT=1. Run: npm run test:business
import ExcelJS from 'exceljs'; import fs from 'fs';
const BASE = process.env.API || 'http://localhost:3000';
const FILE = 'samples/karoo-coffee-books-q3-2026.xlsx', DEBTORS = 'samples/karoo-opening-debtors-2026-07-01.xlsx', CREDITORS = 'samples/karoo-opening-creditors-2026-07-01.xlsx', CARD = 'samples/karoo-card-export-sep-2026.csv';
const MOVE_OVER = '2026-07-01';
let pass = 0, fail = 0; const findings: string[] = [];
const ok = (name: string, cond: boolean, extra: any = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${cond ? '' : '  ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)).slice(0, 500)}`); };
const note = (s: string) => { findings.push(s); console.log(`  NOTE  ${s}`); };
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;
const r2 = (n: number) => Math.round(n * 100) / 100;
const R = (n: number) => 'R' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let token = '';
async function call(method: string, path: string, body?: any, raw = false): Promise<any> {
  const isForm = body instanceof FormData;
  const res = await fetch(BASE + '/api' + path, { method, headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  if (raw) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') };
  const t = await res.text(); let j: any; try { j = JSON.parse(t); } catch { j = t; } return { status: res.status, body: j };
}
const fileForm = (path: string, extra: Record<string, string> = {}) => {
  const f = new FormData(); f.append('file', new Blob([fs.readFileSync(path)], { type: path.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), path.split('/').pop()!);
  for (const [k, v] of Object.entries(extra)) f.append(k, v); return f;
};
const iso = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : null);
const val = (v: any) => (v && typeof v === 'object' && 'result' in v ? v.result : v);

(async () => {
  // ---------- Read the workbook ----------
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(FILE);
  const rows = (name: string) => { const out: any[][] = []; wb.getWorksheet(name)!.eachRow((r, n) => { if (n > 1) out.push((r.values as any[]).slice(1).map(val)); }); return out; };
  const notes = Object.fromEntries(rows('Notes').map((r) => [r[0], r[1]]));
  const vatRate = Number(notes['VAT rate']), opening = Number(notes['Opening bank balance 1 Jul 2026 (R)']);
  const cats = Object.fromEntries(rows('Categories').map((r) => [r[0], { code: String(r[1]), vat: /^yes/i.test(String(r[3])) }]));
  const contacts = rows('Contacts'), sales = rows('Sales'), purchases = rows('Purchases'), bankOther = rows('Bank other');
  console.log(`Workbook: ${FILE} (${wb.worksheets.length} sheets, ${sales.length} sales, ${purchases.length} bills)`);
  // What each imported row should do to the books: the bookkeeper's own answer, from the Categories sheet.
  const posted: { date: string; gross: number; refund: boolean; code: string; vat: boolean }[] = [];
  const book = (p: typeof posted[0]) => posted.push(p);
  const netOf = (p: typeof posted[0]) => (p.vat ? r2(p.gross / (1 + vatRate)) : p.gross), vatOf = (p: typeof posted[0]) => r2(p.gross - netOf(p));

  // ---------- Set up the company ----------
  console.log('\n1. Company set-up (moving over from old books on 1 July)');
  const stamp = Date.now();
  const reg = await call('POST', '/auth/register', { organizationName: String(notes['Business']).replace(/ \(.*\)$/, ''), name: 'Thandi Mokoena', email: `owner-${stamp}@karoo.example`, password: 'Roast3r!2026' });
  ok('owner registers the company', reg.status === 201, reg.body); token = reg.body.token;
  const org = await call('PATCH', '/organization', { businessType: 'Manufacturing', vatRegistered: true, vatNumber: String(notes['VAT number']), vatCycle: 'B', defaultTermsDays: Number(notes['Invoice terms (days)']), invoicePrefix: 'KCR' });
  ok('VAT registration and invoice terms saved', org.status === 200, org.body);
  const accounts = (await call('GET', '/accounts')).body.accounts; const acc = (code: string) => accounts.find((a: any) => a.code === code)?.id;
  const codeOf = (id: string) => accounts.find((a: any) => a.id === id)?.code;
  const taxRates = (await call('GET', '/tax-rates')).body.taxRates; const vat15 = taxRates.find((t: any) => t.rate === vatRate * 100).id;
  const rateOf = (id: string | null) => Number(taxRates.find((t: any) => t.id === id)?.rate || 0);
  const bankRes = await call('POST', '/bank-accounts', { name: String(notes['Bank']), bankName: 'FNB', openingBalance: opening, openingDate: MOVE_OVER });
  ok(`bank account opened with ${R(opening)} as at ${MOVE_OVER}`, bankRes.status === 201, bankRes.body); const bank = bankRes.body.bankAccount;
  const people: Record<string, any> = {};
  for (const [name, type, email, phone] of contacts) { const c = await call('POST', '/contacts', { name, type, email, phone }); people[name] = c.body.contact; }
  ok(`${contacts.length} customers and suppliers added`, Object.values(people).every(Boolean));

  // ---------- Opening debtors and creditors ----------
  console.log('\n2. Bring over what is still owed from the old books');
  const od = await call('POST', '/import/opening-balances/preview', fileForm(DEBTORS, { kind: 'DEBTORS' }));
  const odRows = (od.body.rows || []).filter((r: any) => r.valid);
  ok('debtors sheet read: 2 invoices, "3 450,00" understood, TOTAL row left out', od.status === 200 && odRows.length === 2 && near(odRows[1]?.amount, 3450) && od.body.rows.some((r: any) => !r.valid), od.body);
  ok('existing customers recognised by name', odRows.every((r: any) => r.contactId), odRows);
  const odc = await call('POST', '/import/opening-balances/commit', { kind: 'DEBTORS', asAt: MOVE_OVER, rows: odRows });
  ok(`opening debtors brought over: ${R(odc.body.total)}`, odc.status === 200 && odc.body.imported === 2 && near(odc.body.total, 10350), odc.body);
  const odAgain = await call('POST', '/import/opening-balances/commit', { kind: 'DEBTORS', asAt: MOVE_OVER, rows: odRows });
  ok('bringing the same debtors over twice is refused', odAgain.body.imported === 0 && odAgain.body.failed.length === 2, odAgain.body);
  const oc = await call('POST', '/import/opening-balances/preview', fileForm(CREDITORS, { kind: 'CREDITORS' }));
  const occ = await call('POST', '/import/opening-balances/commit', { kind: 'CREDITORS', asAt: MOVE_OVER, rows: oc.body.rows.filter((r: any) => r.valid) });
  ok(`opening creditors brought over: ${R(occ.body.total)} (bill keeps the supplier's number GB-889)`, occ.status === 200 && occ.body.imported === 1 && near(occ.body.total, 11500), occ.body);
  const openInv = (await call('GET', '/invoices')).body.invoices; const hotelOpen = openInv.find((i: any) => /INV-0612/.test(i.notes || ''));
  const greenOpen = (await call('GET', '/bills')).body.bills.find((b: any) => b.number === 'GB-889');
  ok('opening invoices are open and payable, not drafts', hotelOpen?.status === 'SENT' && greenOpen?.status === 'APPROVED', { hotelOpen, greenOpen });
  const again = await call('POST', '/import/opening-balances/commit', { kind: 'CREDITORS', asAt: MOVE_OVER, rows: oc.body.rows.filter((r: any) => r.valid) });
  ok('bringing the same supplier bill over twice is refused', again.body.imported === 0 && again.body.failed.length === 1, again.body);
  let receipts = 0, payments = 0;
  const p1 = await call('POST', '/payments/invoice', { invoiceId: hotelOpen.id, bankAccountId: bank.id, amount: 6900, date: '2026-07-14' });
  ok('Hotel Breede pays its June invoice in July', p1.status < 300, p1.body); receipts += 6900;
  const p2 = await call('POST', '/payments/bill', { billId: greenOpen.id, bankAccountId: bank.id, amount: 11500, date: '2026-07-24' });
  ok('we pay Green Bean the June bill in July', p2.status < 300, p2.body); payments += 11500;

  // ---------- Import the old expense book ----------
  console.log('\n3. Import the old Excel expense book');
  const pv = await call('POST', '/import/expenses/preview', fileForm(FILE));
  ok('preview finds Date/Description/Amount/Category columns', pv.status === 200 && pv.body.detectedColumns?.date && pv.body.detectedColumns?.amount && pv.body.detectedColumns?.category, pv.body);
  ok('reads it as a hand-kept book: positive = spending, brackets = refund', pv.body.convention === 'POSITIVE_IS_EXPENSE', pv.body.convention);
  const sheet = wb.getWorksheet('Expenses')!; const expected: Record<number, { amount: number; refund: boolean; cat: string }> = {};
  sheet.eachRow((r, n) => { if (n === 1) return; const v = val(r.getCell(4).value); const raw = String(v ?? ''); const cat = String(r.getCell(3).value ?? ''); if (!cat) return;
    const num = typeof v === 'number' ? v : parseFloat(raw.replace(/[R\s()]/g, '').replace(/,(\d{2})$/, '.$1').replace(/,/g, ''));
    expected[n] = { amount: num, refund: /^\(.*\)$/.test(raw.trim()), cat }; });
  const prev = pv.body.rows || []; const mine = prev.filter((p: any) => expected[p.rowNumber]);
  ok('SA ("1 850,00"), US ("1,500.00") and "R899.00" amounts all read correctly', mine.every((p: any) => near(p.amount, expected[p.rowNumber].amount)), mine);
  ok('dd/mm/yyyy text dates and real Excel dates both read', mine.every((p: any) => /^2026-0[789]-\d\d$/.test(p.date)), mine.map((p: any) => p.date));
  const totalRow = prev.find((p: any) => /TOTAL/i.test(p.description)); ok('the TOTAL row is flagged as not importable', !totalRow || !totalRow.valid, totalRow);
  const refundRow = mine.find((p: any) => expected[p.rowNumber].refund);
  ok('the "(99,00)" Telkom line is read as a REFUND, not spending', refundRow?.direction === 'REFUND' && refundRow.valid, refundRow);
  ok('every row is put on the right expense account from the Category column', mine.every((p: any) => codeOf(p.accountId) === cats[expected[p.rowNumber].cat].code && p.accountSource === 'category'), mine.map((p: any) => [p.rowNumber, codeOf(p.accountId), p.accountSource]));
  ok('VAT suggested on rent, power, internet, ads; none on zero-rated fuel', mine.every((p: any) => (rateOf(p.taxRateId) > 0) === cats[expected[p.rowNumber].cat].vat), mine.map((p: any) => [p.description, rateOf(p.taxRateId)]));
  ok('R12,000 rent rows flagged: keep the full tax invoice (over R5,000)', mine.filter((p: any) => /Rent/.test(p.description)).every((p: any) => p.needsTaxInvoice) && mine.filter((p: any) => !/Rent/.test(p.description)).every((p: any) => !p.needsTaxInvoice), mine.map((p: any) => [p.description, p.needsTaxInvoice]));
  ok('nothing flagged as a duplicate on first import', mine.every((p: any) => !p.duplicate), mine.map((p: any) => p.duplicate));
  const toImport = mine.map((p: any) => ({ ...p, remember: /Eskom/.test(p.description) && /07-05/.test(p.date) }));
  const cm = await call('POST', '/import/expenses/commit', { bankAccountId: bank.id, rows: toImport });
  for (const p of mine) { const e = expected[p.rowNumber]; book({ date: p.date, gross: e.amount, refund: e.refund, code: cats[e.cat].code, vat: cats[e.cat].vat }); }
  const bookVat = r2(posted.reduce((s, p) => s + (p.refund ? -1 : 1) * vatOf(p), 0));
  ok(`${toImport.length} rows imported (1 refund), VAT claimed ${R(cm.body.vatClaimed)} = ${R(bookVat)}`, cm.status === 200 && cm.body.imported === toImport.length && cm.body.refunds === 1 && near(cm.body.vatClaimed, bookVat) && !cm.body.failed.length, cm.body);
  ok('"always" tick saved an Eskom rule for next time', cm.body.rulesCreated === 1 && (await call('GET', '/bank-rules')).body.rules.some((r: any) => r.matchText === 'eskom'), cm.body);
  const pv2 = await call('POST', '/import/expenses/preview', fileForm(FILE));
  ok('uploading the same book again: every row flagged "already on the books" and unticked', (pv2.body.rows || []).filter((p: any) => expected[p.rowNumber]).every((p: any) => p.duplicate === 'ALREADY_IMPORTED'), pv2.body.rows?.map((p: any) => p.duplicate));
  const cm2 = await call('POST', '/import/expenses/commit', { bankAccountId: bank.id, rows: pv2.body.rows.filter((p: any) => p.valid) });
  ok('even if sent anyway, duplicates are skipped and nothing is doubled', cm2.body.imported === 0 && cm2.body.duplicates.length === toImport.length, cm2.body);

  // ---------- Card account export (bank style) ----------
  console.log('\n4. Import a card account export (bank style: spending is negative)');
  const cv = await call('POST', '/import/expenses/preview', fileForm(CARD));
  const crow = (re: RegExp) => (cv.body.rows || []).find((r: any) => re.test(r.description));
  ok('reads it as a bank export: negative = spending', cv.body.convention === 'NEGATIVE_IS_EXPENSE', cv.body.convention);
  ok('the Eskom line already imported from the book is flagged and unticked', crow(/Eskom/)?.duplicate === 'ALREADY_IMPORTED', crow(/Eskom/));
  ok('the positive Takealot line is a refund, the negative one spending', crow(/refund/)?.direction === 'REFUND' && crow(/office chair/)?.direction === 'EXPENSE', [crow(/refund/), crow(/office chair/)]);
  ok('Sasol fuel suggested with no VAT (zero-rated)', rateOf(crow(/Sasol/)?.taxRateId) === 0, crow(/Sasol/));
  const cardRows = (cv.body.rows || []).filter((r: any) => r.valid && !r.duplicate).map((r: any) => ({ ...r, accountId: /Takealot/.test(r.description) ? acc('6500') : /Sasol/.test(r.description) ? acc('6600') : r.accountId }));
  const cc = await call('POST', '/import/expenses/commit', { bankAccountId: bank.id, rows: cardRows });
  ok(`${cardRows.length} card lines imported; the chair and its refund cancel out`, cc.body.imported === 3 && cc.body.refunds === 1, cc.body);
  book({ date: '2026-09-14', gross: 2299, refund: false, code: '6500', vat: true }); book({ date: '2026-09-22', gross: 2299, refund: true, code: '6500', vat: true }); book({ date: '2026-09-28', gross: 650, refund: false, code: '6600', vat: false });
  ok('the Eskom rule saved during the first import suggests the account on the card export (no Category column there)', crow(/Eskom/)?.accountSource === 'rule' && codeOf(crow(/Eskom/)?.accountId) === '6200', crow(/Eskom/));

  // ---------- Sales ----------
  console.log('\n5. Sales: invoices, payments, a credit note, a quote');
  const inv: Record<string, any> = {}; const dueDate = (d: string) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + Number(notes['Invoice terms (days)'])); return x.toISOString().slice(0, 10); };
  for (const [d, ref, cust, item, qty, price, , vat, total, paidOn, paid, cnQty] of sales.filter((s) => s[1] !== 'Q1')) {
    const c = await call('POST', '/invoices', { contactId: people[cust].id, issueDate: iso(d), dueDate: dueDate(iso(d)!), lines: [{ description: item, quantity: qty, unitPrice: price, accountId: acc('4000'), taxRateId: vat15 }] });
    ok(`${ref}: invoice ${R(total)} for ${cust} (VAT ${R(vat)})`, c.status === 201 && near(c.body.invoice.total, total) && near(c.body.invoice.taxTotal, vat), c.body); inv[ref] = c.body.invoice;
    const s = await call('POST', `/invoices/${inv[ref].id}/send`); ok(`${ref}: invoice sent (posts to the ledger)`, s.status === 200, s.body);
    if (cnQty) {
      const cn = await call('POST', `/invoices/${inv[ref].id}/credit-notes`, { reason: 'Damaged in delivery', issueDate: '2026-08-12', lines: [{ description: `${item} (damaged)`, quantity: cnQty, unitPrice: price, accountId: acc('4000'), taxRateId: vat15 }] });
      ok(`${ref}: credit note for ${cnQty} damaged bags = ${R(r2(cnQty * price * (1 + vatRate)))}`, cn.status === 201 && near(cn.body.creditNote.total, r2(cnQty * price * (1 + vatRate))), cn.body);
    }
    if (paidOn) {
      const p = await call('POST', '/payments/invoice', { invoiceId: inv[ref].id, bankAccountId: bank.id, amount: paid, date: iso(paidOn) });
      ok(`${ref}: customer paid ${R(paid)} on ${iso(paidOn)}`, p.status < 300, p.body); receipts += paid;
    }
  }
  const [qd, , qcust, qitem, qqty, qprice, , , qtotal, qpaidOn, qpaid] = sales.find((s) => s[1] === 'Q1')!;
  const q = await call('POST', '/quotes', { contactId: people[qcust].id, issueDate: iso(qd), expiryDate: '2026-09-30', lines: [{ description: qitem, quantity: qqty, unitPrice: qprice, accountId: acc('4000'), taxRateId: vat15 }] });
  ok(`quote for ${qitem} ${R(qtotal)}`, q.status === 201 && near(q.body.quote.total, qtotal), q.body);
  ok('quote sent and accepted', (await call('POST', `/quotes/${q.body.quote.id}/send`)).status === 200 && (await call('POST', `/quotes/${q.body.quote.id}/accept`)).status === 200);
  ok('converting cannot date the invoice before the quote', (await call('POST', `/quotes/${q.body.quote.id}/convert`, { issueDate: '2026-09-01' })).status === 400);
  const conv = await call('POST', `/quotes/${q.body.quote.id}/convert`, { issueDate: '2026-09-12' });
  ok('accepted quote converted to an invoice dated the day it was accepted (12 Sep)', conv.status === 201 && conv.body.invoice.issueDate === '2026-09-12', conv.body);
  const qInv = conv.body.invoice;
  ok('converted invoice sent', (await call('POST', `/invoices/${qInv.id}/send`)).status === 200);
  const qp = await call('POST', '/payments/invoice', { invoiceId: qInv.id, bankAccountId: bank.id, amount: qpaid, date: iso(qpaidOn) });
  ok(`Q1: customer paid ${R(qpaid)}`, qp.status < 300, qp.body); receipts += qpaid; inv.Q1 = qInv;
  const over = await call('POST', '/payments/invoice', { invoiceId: inv.S2.id, bankAccountId: bank.id, amount: 999999, date: '2026-09-01' });
  ok('over-payment of an invoice is refused', over.status >= 400, over.body);

  // ---------- Purchases ----------
  console.log('\n6. Purchases: supplier bills and payments');
  for (const [d, ref, sup, item, qty, price, , , total, paidOn, code] of purchases) {
    const b = await call('POST', '/bills', { contactId: people[sup].id, issueDate: iso(d), dueDate: dueDate(iso(d)!), lines: [{ description: item, quantity: qty, unitPrice: price, accountId: acc(String(code)), taxRateId: vat15 }] });
    ok(`${ref}: bill ${R(total)} from ${sup}`, b.status === 201 && near(b.body.bill.total, total), b.body);
    ok(`${ref}: bill approved`, (await call('POST', `/bills/${b.body.bill.id}/approve`)).status === 200);
    if (paidOn) { const p = await call('POST', '/payments/bill', { billId: b.body.bill.id, bankAccountId: bank.id, amount: total, date: iso(paidOn) }); ok(`${ref}: supplier paid ${R(total)}`, p.status < 300, p.body); payments += total; }
  }

  // ---------- Bank statement and reconciliation ----------
  console.log('\n7. Bank statement: match every line');
  const statement = [
    { date: '2026-07-14', desc: 'MAGTAPE CREDIT HOTEL BREEDE', amount: 6900, type: 'CREDIT' }, { date: '2026-07-24', desc: 'INTERNET PMT TO GREEN BEAN IMPORTERS', amount: 11500, type: 'DEBIT' },
    ...sales.filter((s) => s[9]).map((s) => ({ date: iso(s[9]), desc: `MAGTAPE CREDIT ${String(s[2]).toUpperCase()}`, amount: s[10], type: 'CREDIT' })),
    ...purchases.filter((p) => p[9]).map((p) => ({ date: iso(p[9]), desc: `INTERNET PMT TO ${String(p[2]).toUpperCase()}`, amount: p[8], type: 'DEBIT' })),
  ];
  let matched = 0;
  for (const s of statement) {
    const t = (await call('POST', `/bank-accounts/${bank.id}/transactions`, { date: s.date, description: s.desc, amount: s.amount, type: s.type })).body.transaction;
    const sug = (await call('GET', `/bank-accounts/${bank.id}/transactions/${t.id}/suggestions`)).body.suggestions || [];
    if (sug.length) { const m = await call('POST', `/bank-accounts/${bank.id}/transactions/${t.id}/reconcile`, { journalLineId: sug[0].journalLineId }); if (m.status === 200) matched++; }
  }
  ok(`all ${statement.length} receipts and payments found a matching ledger entry and reconciled`, matched === statement.length, `${matched}/${statement.length}`);
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
  const importedNet = r2(posted.reduce((s, p) => s + (p.refund ? -1 : 1) * netOf(p), 0)), importedCash = r2(posted.reduce((s, p) => s + (p.refund ? -1 : 1) * p.gross, 0));
  const expect = {
    bank: r2(opening + receipts + otherIncome - payments - importedCash - fees),
    revenue: r2(salesEx + otherIncome),
    expenses: r2(purchEx + importedNet + fees),
    debtors: r2(3450 + sales.reduce((s, x) => s + x[8] - (x[11] ? r2(x[11] * x[5] * (1 + vatRate)) : 0) - Number(x[10] || 0), 0)),
    creditors: r2(purchases.filter((p) => !p[9]).reduce((s, p) => s + p[8], 0)),
    openingEquity: r2(opening + 10350 - 11500),
  };

  // ---------- Reports ----------
  console.log('\n8. Reports checked against the workbook');
  const bal = (await call('GET', '/bank-accounts')).body.bankAccounts.find((b: any) => b.id === bank.id).currentBalance;
  ok(`bank balance ${R(bal)} = expected ${R(expect.bank)}`, near(bal, expect.bank), { bal, expect: expect.bank });
  const pl = (await call('GET', '/reports/profit-and-loss?from=2026-07-01&to=2026-09-30')).body;
  ok(`P&L revenue ${R(pl.totalRevenue)} = ${R(expect.revenue)} (opening debtors are not sales)`, near(pl.totalRevenue, expect.revenue), pl);
  ok(`P&L expenses ${R(pl.totalExpenses)} = ${R(expect.expenses)} (imports net of VAT, refunds deducted)`, near(pl.totalExpenses, expect.expenses), pl);
  ok(`net result ${R(pl.netProfit)}`, near(pl.netProfit, r2(expect.revenue - expect.expenses)), pl);
  const internet = pl.expenses.find((e: any) => e.code === '6300')?.amount;
  ok(`internet costs reduced by the refund: ${R(internet)}`, near(internet, r2((899 * 3 - 99) / (1 + vatRate))), pl.expenses);
  const tb = (await call('GET', '/reports/trial-balance?asOf=2026-09-30')).body;
  ok(`trial balance balances (debits ${R(tb.totalDebit)} = credits ${R(tb.totalCredit)})`, tb.balanced && near(tb.totalDebit, tb.totalCredit), tb);
  const bs = (await call('GET', '/reports/balance-sheet?asOf=2026-09-30')).body;
  const bsBank = (bs.assets || []).find((a: any) => /Bank - /.test(a.name))?.amount;
  ok(`balance sheet bank at 30 Sep ${R(bsBank)} = ${R(expect.bank)}`, near(bsBank, expect.bank), bs.assets);
  ok(`balance sheet balances: assets ${R(bs.totalAssets)} = liabilities ${R(bs.totalLiabilities)} + equity ${R(bs.totalEquity)}`, bs.balanced && near(bs.totalAssets, r2(bs.totalLiabilities + bs.totalEquity)), bs);
  const owner = (bs.equity || []).find((a: any) => a.code === '3000')?.amount;
  ok(`owner's equity carries the opening position ${R(expect.openingEquity)} (bank + debtors - creditors)`, near(owner, expect.openingEquity), bs.equity);
  const ar = (await call('GET', '/reports/aged-receivables?asOf=2026-10-09')).body;
  ok(`debtors owe ${R(ar.totals.total)} = expected ${R(expect.debtors)} (incl. Bean There's June invoice)`, near(ar.totals.total, expect.debtors), ar.totals);
  ok('the unpaid June opening invoice shows as over 60 days late', ar.totals.d61_90 > 0, ar.totals);
  const apay = (await call('GET', '/reports/aged-payables?asOf=2026-10-09')).body;
  ok(`we owe suppliers ${R(apay.totals?.total)} = expected ${R(expect.creditors)}`, near(apay.totals?.total, expect.creditors), apay.totals);

  // ---------- VAT201 ----------
  console.log('\n9. VAT201 for July-August (bi-monthly)');
  const inPeriod = (d: string) => d >= '2026-07-01' && d <= '2026-08-31';
  const outVat = r2(sales.filter((s) => s[1] !== 'Q1' && inPeriod(iso(s[0])!)).reduce((t, s) => t + s[7] - (s[11] ? r2(s[11] * s[5] * vatRate) : 0), 0));
  const importVat = r2(posted.filter((p) => inPeriod(p.date)).reduce((t, p) => t + (p.refund ? -1 : 1) * vatOf(p), 0));
  const inVat = r2(purchases.filter((p) => inPeriod(iso(p[0])!)).reduce((t, p) => t + p[7], 0) + importVat);
  const v = (await call('GET', '/reports/vat201?from=2026-07-01&to=2026-08-31')).body.vat201;
  ok(`output VAT ${R(v.outputVat)} = ${R(outVat)} (sales less credit note; opening debtors excluded)`, near(v.outputVat, outVat), v);
  ok(`input VAT ${R(v.inputVat)} = ${R(inVat)} (bills ${R(r2(inVat - importVat))} + imported expenses ${R(importVat)})`, near(v.inputVat, inVat), v);
  ok('opening invoices do not appear as zero-rated sales', near(v.zeroRatedSales, 0), v);
  ok(`net VAT ${R(v.netVat)}: ${v.netVat < 0 ? 'refund due from SARS' : 'payable to SARS'}`, near(v.netVat, r2(outVat - inVat)), v);
  const fin = await call('POST', '/vat-periods/finalize', { periodStart: '2026-07-01', periodEnd: '2026-08-31' });
  ok('VAT period July-August finalized', fin.status < 300, fin.body);
  const vAfter = (await call('GET', '/reports/vat201?from=2026-07-01&to=2026-08-31')).body.vat201;
  ok('the finalized period still shows the same VAT figures afterwards', near(vAfter.outputVat, v.outputVat) && near(vAfter.inputVat, v.inputVat) && near(vAfter.netVat, v.netVat), vAfter);

  // ---------- Month-end ----------
  console.log('\n10. Month-end close and period lock');
  for (const m of ['2026-07', '2026-08']) {
    const chk = (await call('GET', `/month-end/${m}`)).body;
    ok(`${chk.label}: all blocking checks pass (${chk.progress}% complete)`, chk.blockingIssues === 0 && chk.canClose, chk.checks?.filter((c: any) => c.status !== 'ok').map((c: any) => `${c.title}: ${c.detail}`));
    const cl = await call('POST', `/month-end/${m}/close`); ok(`${chk.label} closed`, cl.status < 300, cl.body);
  }
  const late = await call('POST', '/invoices', { contactId: people['Hotel Breede'].id, issueDate: '2026-07-15', dueDate: '2026-08-14', lines: [{ description: 'Back-dated sale', quantity: 1, unitPrice: 100, accountId: acc('4000'), taxRateId: vat15 }] });
  const lateSend = late.status === 201 ? await call('POST', `/invoices/${late.body.invoice.id}/send`) : late;
  ok('posting into closed July is blocked', lateSend.status === 409, lateSend.body);
  if (late.status === 201) await call('POST', `/invoices/${late.body.invoice.id}/void`);
  const lateImp = await call('POST', '/import/expenses/commit', { bankAccountId: bank.id, rows: [{ rowNumber: 1, date: '2026-08-15', description: 'Forgotten August receipt', amount: 100, direction: 'EXPENSE', accountId: acc('6900') }] });
  ok('importing into closed August is blocked too', lateImp.body.imported === 0 && /locked/i.test(lateImp.body.failed?.[0]?.error || ''), lateImp.body);
  const sep = (await call('GET', '/month-end/2026-09')).body;
  ok('September stays open, with an overdue-debtor warning to review', !sep.closed && sep.checks.some((c: any) => c.key === 'debtors' && c.status === 'warn'), sep.checks?.map((c: any) => `${c.key}:${c.status}`));

  // ---------- Exports ----------
  console.log('\n11. Exports');
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
