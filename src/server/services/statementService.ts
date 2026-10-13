/**
 * A customer's statement: what they owed at the start of the period, every invoice, payment and credit note in it with a
 * running balance, and how old the unpaid amount is. Built from the same figures as each invoice's balance
 * (invoice total less completed payments and posted credit notes), so the closing balance always matches aged debtors.
 */
import { ApiError, money, addDays, today, isDate } from '../utils/helpers';
import type { Queryable } from '../db';

export type StatementLine = { date: string; type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE'; reference: string; description: string; debit: number; credit: number; balance: number; dueDate?: string | null; invoiceId?: string };

export async function buildStatement(c: Queryable, orgId: string, contactId: string, opts: { from?: string; to?: string } = {}) {
  const to = isDate(opts.to) ? opts.to! : today(); const from = isDate(opts.from) ? opts.from! : addDays(to, -89);
  if (from > to) throw new ApiError(400, 'The start date must be before the end date');
  const contact = (await c.query('SELECT * FROM contacts WHERE id=$1 AND organization_id=$2', [contactId, orgId])).rows[0];
  if (!contact) throw new ApiError(404, 'Customer not found');
  const org = (await c.query('SELECT * FROM organizations WHERE id=$1', [orgId])).rows[0];
  const invoices = (await c.query(`SELECT id, number, issue_date::text AS date, due_date::text AS due_date, total::float AS total, amount_paid::float AS amount_paid, currency, opening_balance, notes
     FROM invoices WHERE organization_id=$1 AND contact_id=$2 AND status NOT IN ('DRAFT','VOID') AND issue_date <= $3 ORDER BY issue_date, number`, [orgId, contactId, to])).rows;
  const ids = invoices.map((i) => i.id);
  const pays = ids.length ? (await c.query(`SELECT p.invoice_id, p.date::text AS date, p.amount::float AS amount, p.reference, i.number FROM payments p JOIN invoices i ON i.id=p.invoice_id
     WHERE p.invoice_id = ANY($1) AND p.status='COMPLETED' AND p.date <= $2 ORDER BY p.date, p.created_at`, [ids, to])).rows : [];
  const credits = ids.length ? (await c.query(`SELECT n.invoice_id, n.number, n.issue_date::text AS date, n.total::float AS total, n.reason, i.number AS invoice_number FROM credit_notes n JOIN invoices i ON i.id=n.invoice_id
     WHERE n.invoice_id = ANY($1) AND n.status='POSTED' AND n.issue_date <= $2 ORDER BY n.issue_date, n.number`, [ids, to])).rows : [];

  const all: Omit<StatementLine, 'balance'>[] = [
    ...invoices.map((i) => ({ date: i.date, type: 'INVOICE' as const, reference: i.number, description: i.opening_balance ? (i.notes || 'Opening balance') : 'Invoice', debit: money(i.total), credit: 0, dueDate: i.due_date, invoiceId: i.id })),
    ...pays.map((p) => ({ date: p.date, type: 'PAYMENT' as const, reference: p.reference || p.number, description: `Payment, thank you (${p.number})`, debit: 0, credit: money(p.amount), invoiceId: p.invoice_id })),
    ...credits.map((n) => ({ date: n.date, type: 'CREDIT_NOTE' as const, reference: n.number, description: `Credit note on ${n.invoice_number}${n.reason ? `: ${n.reason}` : ''}`, debit: 0, credit: money(n.total), invoiceId: n.invoice_id })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type === 'INVOICE' ? -1 : 1));

  let opening = 0; for (const l of all) if (l.date < from) opening = money(opening + l.debit - l.credit);
  let running = opening; const lines: StatementLine[] = all.filter((l) => l.date >= from).map((l) => { running = money(running + l.debit - l.credit); return { ...l, balance: running }; });

  // Ageing of what is still owing at the statement date, by how late each invoice is.
  const owing = (inv) => money(inv.total - pays.filter((p) => p.invoice_id === inv.id).reduce((s, p) => s + p.amount, 0) - credits.filter((n) => n.invoice_id === inv.id).reduce((s, n) => s + n.total, 0));
  const ageing = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  const open = [];
  for (const inv of invoices) {
    const due = owing(inv); if (due <= 0.004) continue;
    const late = Math.floor((Date.parse(to) - Date.parse(inv.due_date)) / 86_400_000);
    const k = late <= 0 ? 'current' : late <= 30 ? 'd1_30' : late <= 60 ? 'd31_60' : late <= 90 ? 'd61_90' : 'd90plus'; ageing[k] = money(ageing[k] + due);
    open.push({ id: inv.id, number: inv.number, date: inv.date, dueDate: inv.due_date, total: inv.total, owing: due, daysLate: Math.max(0, late) });
  }
  const currencies = [...new Set(invoices.map((i) => i.currency))];
  return { organization: { name: org.name, vatNumber: org.vat_number, address: org.address, phone: org.phone, email: org.email, bankDetails: org.bank_details, registrationNumber: org.registration_number },
    contact: { id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, address: contact.address, vatNumber: contact.vat_number },
    from, to, currency: currencies[0] || 'ZAR', mixedCurrencies: currencies.length > 1, openingBalance: opening, lines, closingBalance: running, ageing, openInvoices: open };
}
