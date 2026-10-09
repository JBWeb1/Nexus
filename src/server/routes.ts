// Every API endpoint, in one place. Mounted at /api by src/app/api/[...path]/route.ts.
import { Router } from './http';
import { asyncHandler as h } from './utils/helpers';
import { authPool, servicePool } from './db';
import { requireAuth, requireRole } from './middleware/auth';
import { rateLimit } from './middleware/rateLimit';
import * as auth from './controllers/authController';
import * as accounts from './controllers/accountsController';
import * as tax from './controllers/taxRatesController';
import * as contacts from './controllers/contactsController';
import * as inv from './controllers/invoicesController';
import * as bills from './controllers/billsController';
import * as bank from './controllers/bankAccountsController';
import * as pay from './controllers/paymentsController';
import * as fin from './controllers/financialController';
import * as vat from './controllers/vatController';
import * as rep from './controllers/reportsController';
import * as onb from './controllers/onboardingController';
import * as wq from './controllers/workQueueController';
import * as me from './controllers/monthEndController';
import * as dash from './controllers/dashboardController';
import * as imp from './controllers/importController';
import * as exp from './controllers/exportController';
import * as quo from './controllers/quotesController';
import * as rec from './controllers/recurringController';
import * as comp from './controllers/companiesController';
import * as tasks from './controllers/tasksController';
import * as ins from './controllers/insightsController';
import * as bill from './controllers/billingController';
import * as team from './controllers/teamController';
import * as notes from './controllers/notesController';
import * as cn from './controllers/creditNotesController';
import * as dx from './controllers/documentExtrasController';
import * as rules from './controllers/bankRulesController';
import * as act from './controllers/activityController';
import * as sec from './controllers/securityController';
import * as att from './controllers/attachmentsController';

const r = new Router();
const authLimit = rateLimit({ limit: 30, windowMs: 60_000, name: 'auth' }), resetLimit = rateLimit({ limit: 6, windowMs: 3_600_000, name: 'reset' });
r.post('/auth/register', authLimit, h(auth.register, { pool: authPool, scoped: false }));
r.post('/auth/login', authLimit, h(auth.login, { pool: authPool, scoped: false }));
r.post('/auth/forgot', resetLimit, h(sec.forgot, { pool: authPool, scoped: false }));
r.post('/auth/reset', authLimit, h(sec.reset, { pool: authPool, scoped: false }));
r.use(requireAuth);
r.get('/auth/me', h(auth.me));
r.get('/billing', h(bill.status, { pool: servicePool, scoped: false })); r.post('/billing/checkout', h(bill.checkout, { pool: servicePool, scoped: false })); r.post('/billing/verify', h(bill.verify, { pool: servicePool, scoped: false })); r.post('/billing/cancel', h(bill.cancel, { pool: servicePool, scoped: false }));
r.get('/insights/monthly', h(ins.monthly)); r.get('/insights/changes', h(ins.changes)); r.get('/insights/explain', h(ins.explain)); r.get('/insights/payment-behaviour', h(ins.paymentBehaviour)); r.get('/insights/reconciliation', h(ins.reconciliation));
r.get('/tasks', h(tasks.list)); r.post('/tasks', h(tasks.create)); r.post('/tasks/checklist', h(tasks.checklist)); r.patch('/tasks/:id', h(tasks.update)); r.delete('/tasks/:id', h(tasks.remove)); r.get('/practice', h(tasks.practice, { pool: authPool, scoped: false }));
r.get('/team', h(team.list, { pool: authPool, scoped: false })); r.post('/team/invite', h(team.invite, { pool: authPool, scoped: false })); r.patch('/team/:userId', h(team.changeRole, { pool: authPool, scoped: false })); r.delete('/team/:userId', h(team.removeMember, { pool: authPool, scoped: false })); r.delete('/team/invitations/:id', h(team.cancelInvite, { pool: authPool, scoped: false }));
r.get('/companies', h(comp.list, { pool: authPool, scoped: false })); r.get('/companies/overview', h(comp.overview, { pool: authPool, scoped: false })); r.post('/companies', h(comp.create, { pool: authPool, scoped: false })); r.post('/companies/:id/switch', h(comp.switchTo, { pool: authPool, scoped: false }));
r.post('/auth/2fa/setup', h(sec.twoFaSetup, { pool: authPool, scoped: false })); r.post('/auth/2fa/enable', h(sec.twoFaEnable, { pool: authPool, scoped: false })); r.post('/auth/2fa/disable', h(sec.twoFaDisable, { pool: authPool, scoped: false }));
r.get('/invoices/:id/pdf', h(dx.invoicePdf)); r.post('/invoices/:id/email', h(dx.emailInvoice)); r.post('/invoices/:id/pay-link', h(dx.payLink)); r.get('/quotes/:id/pdf', h(dx.quotePdf)); r.post('/quotes/:id/email', h(dx.emailQuote));
r.get('/credit-notes', h(cn.list)); r.get('/credit-notes/:id', h(cn.get)); r.get('/credit-notes/:id/pdf', h(cn.pdf)); r.post('/credit-notes/:id/void', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), h(cn.voidNote)); r.post('/invoices/:id/credit-notes', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), h(cn.create));
r.get('/bank-rules', h(rules.listRules)); r.post('/bank-rules', h(rules.createRule)); r.delete('/bank-rules/:id', h(rules.deleteRule));
r.post('/bank-accounts/:id/apply-rules', h(rules.applyRules)); r.post('/bank-accounts/:id/transactions/:txnId/categorise', h(rules.categorise));
r.get('/activity', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), h(act.list)); r.get('/export/company-data', requireRole('OWNER', 'ADMIN'), h(exp.companyData));
r.get('/notes', h(notes.list)); r.post('/notes', h(notes.create)); r.patch('/notes/:id', h(notes.update)); r.delete('/notes/:id', h(notes.remove));
r.get('/dashboard', h(dash.summary));

r.get('/accounts', h(accounts.list)); r.post('/accounts', h(accounts.create)); r.patch('/accounts/:id', h(accounts.update)); r.delete('/accounts/:id', h(accounts.remove));
r.get('/tax-rates', h(tax.list)); r.post('/tax-rates', h(tax.create)); r.delete('/tax-rates/:id', h(tax.remove));
r.get('/contacts', h(contacts.list)); r.post('/contacts', h(contacts.create)); r.get('/contacts/:id', h(contacts.get)); r.patch('/contacts/:id', h(contacts.update)); r.delete('/contacts/:id', h(contacts.remove));

r.get('/invoices', h(inv.list)); r.post('/invoices', h(inv.create)); r.get('/invoices/:id', h(inv.get)); r.patch('/invoices/:id', h(inv.update));
r.post('/invoices/:id/send', h(inv.send)); r.post('/invoices/:id/void', h(inv.voidInvoice));
r.get('/bills', h(bills.list)); r.post('/bills', h(bills.create)); r.get('/bills/:id', h(bills.get)); r.post('/bills/:id/approve', h(bills.approve)); r.post('/bills/:id/void', h(bills.voidBill));

r.get('/bank-accounts', h(bank.list)); r.post('/bank-accounts', h(bank.create));
r.get('/bank-accounts/:id/transactions', h(bank.listTransactions)); r.post('/bank-accounts/:id/transactions', h(bank.addTransaction));
r.post('/bank-accounts/:id/transactions/:txnId/reconcile', h(bank.reconcile)); r.get('/bank-accounts/:id/transactions/:txnId/suggestions', h(bank.suggestions));
r.post('/payments/invoice', h(pay.payInvoice)); r.post('/payments/bill', h(pay.payBill)); r.post('/payments/:id/reverse', h(pay.reverse));

r.get('/financial-years', h(fin.listYears)); r.post('/financial-years/:id/close', requireRole('OWNER', 'ADMIN'), h(fin.closeYear));
r.get('/period-lock', h(fin.getLock)); r.put('/period-lock', requireRole('OWNER', 'ADMIN'), h(fin.setLock));

r.get('/reports/vat201', h(vat.preview)); r.get('/vat-periods', h(vat.listPeriods)); r.post('/vat-periods/finalize', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), h(vat.finalize));
r.get('/reports/profit-and-loss', h(rep.profitAndLoss)); r.get('/reports/balance-sheet', h(rep.balanceSheet)); r.get('/reports/trial-balance', h(rep.trialBalance));
r.get('/reports/aged-receivables', h(rep.agedReceivables)); r.get('/reports/aged-payables', h(rep.agedPayables));

r.post('/import/expenses/preview', h(imp.preview)); r.post('/import/expenses/commit', h(imp.commit));
r.post('/import/opening-balances/preview', h(imp.openingPreview)); r.post('/import/opening-balances/commit', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), h(imp.openingCommit));
r.get('/export/general-ledger', h(exp.generalLedger)); r.get('/export/trial-balance', h(exp.trialBalance)); r.get('/export/invoices', h(exp.invoices)); r.get('/export/bills', h(exp.bills));

r.get('/quotes', h(quo.list)); r.post('/quotes', h(quo.create)); r.get('/quotes/:id', h(quo.get));
r.post('/quotes/:id/send', h(quo.send)); r.post('/quotes/:id/accept', h(quo.accept)); r.post('/quotes/:id/decline', h(quo.decline)); r.post('/quotes/:id/convert', h(quo.convert));
r.get('/recurring-invoices', h(rec.list)); r.post('/recurring-invoices', h(rec.create)); r.post('/recurring-invoices/run-due', h(rec.runDue));
r.get('/recurring-invoices/:id', h(rec.get)); r.post('/recurring-invoices/:id/pause', h(rec.pause)); r.post('/recurring-invoices/:id/resume', h(rec.resume));
r.get('/organization', h(onb.getOrganization)); r.patch('/organization', requireRole('OWNER', 'ADMIN'), h(onb.updateOrganization));
r.get('/onboarding', h(onb.checklist)); r.post('/onboarding/dismiss', h(onb.dismiss));
r.get('/work-queue', h(wq.get));
r.get('/month-end', h(me.list)); r.get('/month-end/:period', h(me.status)); r.post('/month-end/:period/close', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), h(me.close));
r.get('/attachments', h(att.list)); r.post('/attachments', h(att.upload)); r.get('/attachments/:id/download', h(att.download)); r.delete('/attachments/:id', h(att.remove));
export default r;
