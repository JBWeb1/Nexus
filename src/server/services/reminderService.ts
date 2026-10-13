/**
 * Automatic payment reminders. For each owing invoice, the company's schedule (days relative to the due date, default
 * 3 days before, on the day, 7 and 30 days late) decides when to write. Each stage goes out at most once per invoice:
 * when several are due at once (say the company only just switched reminders on) only the latest is sent and the earlier
 * ones are marked skipped. Email carries the invoice PDF and a portal link to pay; WhatsApp is used when it is set up.
 */
import { money, today } from '../utils/helpers';
import { sendMail, configured as emailConfigured } from '../utils/mailer';
import { sendWhatsApp } from './whatsappService';
import { createPortalLink } from './portalService';
import { invoicePdfBuffer } from '../controllers/documentExtrasController';
import type { Queryable } from '../db';

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const R = (n: number, cur = 'ZAR') => `${cur === 'ZAR' ? 'R' : cur + ' '}${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const whatsappConfigured = () => !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/** The latest stage that has been reached, or null. */
export function dueStage(schedule: number[], daysLate: number) {
  const reached = [...schedule].sort((a, b) => a - b).filter((s) => s <= daysLate); return reached.length ? reached[reached.length - 1] : null;
}
export function reminderText({ stage, org, contact, inv, owing, link }) {
  const amount = R(owing, inv.currency), due = String(inv.due_date).slice(0, 10);
  const opening = stage < 0 ? `A friendly reminder that invoice ${inv.number} for ${amount} is due on ${due}.`
    : stage === 0 ? `Invoice ${inv.number} for ${amount} is due today.`
    : `Invoice ${inv.number} for ${amount} was due on ${due} and is now ${stage} day${stage === 1 ? '' : 's'} overdue.`;
  const ask = stage <= 0 ? 'You can view and pay it here:' : 'Please pay as soon as you can, or let us know if something is wrong with it. View and pay it here:';
  return { subject: `${stage > 0 ? 'Overdue: ' : 'Reminder: '}invoice ${inv.number} from ${org.name}`,
    text: `Hi ${contact.name},\n\n${opening}\n\n${ask}\n${link}\n\nIf you have already paid, thank you, and please ignore this message.\n\n${org.name}${org.phone ? `\n${org.phone}` : ''}` };
}

export type ReminderResult = { invoice: string; customer: string; stage: number; status: 'SENT' | 'FAILED' | 'NO_CHANNEL'; channels: string[]; detail?: string };

/** Runs one company's reminders as of a date. `c` must be able to see that company (its tenant transaction, or the service pool). */
export async function runOrgReminders(c: Queryable, orgId: string, asOf = today()): Promise<ReminderResult[]> {
  const org = (await c.query('SELECT id, name, phone, reminder_schedule FROM organizations WHERE id=$1', [orgId])).rows[0]; if (!org) return [];
  const schedule: number[] = (org.reminder_schedule || []).map(Number);
  const invoices = (await c.query(`SELECT i.*, (i.total - i.amount_paid)::float AS owing, c.name AS contact_name, c.email AS contact_email, c.phone AS contact_phone
     FROM invoices i JOIN contacts c ON c.id=i.contact_id
    WHERE i.organization_id=$1 AND i.status IN ('SENT','PARTIAL') AND i.total - i.amount_paid >= 1 AND NOT c.reminders_paused ORDER BY i.due_date`, [orgId])).rows;
  const out: ReminderResult[] = [];
  for (const inv of invoices) {
    const stage = dueStage(schedule, daysBetween(String(inv.due_date).slice(0, 10), asOf)); if (stage === null) continue;
    const done = new Set((await c.query('SELECT stage FROM invoice_reminders WHERE invoice_id=$1', [inv.id])).rows.map((r) => Number(r.stage)));
    if (done.has(stage)) continue;
    const contact = { name: inv.contact_name, email: inv.contact_email, phone: inv.contact_phone };
    const canEmail = emailConfigured() && /^\S+@\S+\.\S+$/.test(contact.email || ''), canWhatsApp = whatsappConfigured() && !!contact.phone;
    // Nothing to send with: leave it for when email or WhatsApp is set up (only the latest stage will then go).
    if (!canEmail && !canWhatsApp) { out.push({ invoice: inv.number, customer: contact.name, stage, status: 'NO_CHANNEL', channels: [], detail: contact.email || contact.phone ? 'Email/WhatsApp not set up on the server' : 'Customer has no email or phone number' }); continue; }
    for (const s of schedule) if (s < stage && !done.has(s)) await c.query("INSERT INTO invoice_reminders (organization_id, invoice_id, stage, status, detail) VALUES ($1,$2,$3,'SKIPPED','A later reminder was due') ON CONFLICT DO NOTHING", [orgId, inv.id, s]);
    const { url } = await createPortalLink(c, orgId, inv.contact_id);
    const msg = reminderText({ stage, org, contact, inv, owing: money(inv.owing), link: url });
    const channels: string[] = []; const errors: string[] = [];
    if (canEmail) { try { const { buf } = await invoicePdfBuffer(c, orgId, inv.id); await sendMail({ to: contact.email, subject: msg.subject, text: msg.text, attachments: [{ filename: `${inv.number}.pdf`, content: buf }] }); channels.push('EMAIL'); } catch (e: any) { errors.push(`email: ${e.message}`); } }
    if (canWhatsApp) { const w: any = await sendWhatsApp(contact.phone, 'payment_reminder', [contact.name, inv.number, R(inv.owing, inv.currency), String(inv.due_date).slice(0, 10), url]); if (w.ok) channels.push('WHATSAPP'); else errors.push('whatsapp: not delivered'); }
    const status = channels.length ? 'SENT' : 'FAILED';
    await c.query('INSERT INTO invoice_reminders (organization_id, invoice_id, stage, status, channels, detail) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [orgId, inv.id, stage, status, channels, errors.join('; ') || null]);
    out.push({ invoice: inv.number, customer: contact.name, stage, status, channels, detail: errors.join('; ') || undefined });
  }
  return out;
}
