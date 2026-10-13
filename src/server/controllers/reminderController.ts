import crypto from 'crypto';
import { toCamel } from '../utils/helpers';
import { servicePool } from '../db';
import { runOrgReminders, whatsappConfigured } from '../services/reminderService';
import { configured as emailConfigured } from '../utils/mailer';
import type { Req, Res, Next } from '../http';

/** GET /reminders: settings, what can send, and the latest reminders. */
async function list(req, res, c) {
  const org = (await c.query('SELECT reminders_enabled, reminder_schedule FROM organizations WHERE id=$1', [req.user.orgId])).rows[0];
  const rows = (await c.query(`SELECT r.*, i.number, c.name AS customer FROM invoice_reminders r JOIN invoices i ON i.id=r.invoice_id JOIN contacts c ON c.id=i.contact_id
     WHERE r.organization_id=$1 AND r.status <> 'SKIPPED' ORDER BY r.created_at DESC LIMIT 100`, [req.user.orgId])).rows;
  res.json({ enabled: org.reminders_enabled, schedule: org.reminder_schedule, email: emailConfigured(), whatsapp: whatsappConfigured(), scheduled: !!process.env.CRON_SECRET, reminders: toCamel(rows) });
}
/** POST /reminders/run: send whatever is due now for this company (also what the daily job does). */
async function runNow(req, res, c) { res.json({ results: await runOrgReminders(c, req.user.orgId) }); }

/**
 * GET /api/cron/daily, called once a day by Vercel Cron (or any scheduler) with "Authorization: Bearer $CRON_SECRET".
 * Each company runs in its own transaction, so one company's problem never stops the others.
 */
async function daily(req: Req, res: Res, next: Next) {
  try {
    const secret = process.env.CRON_SECRET; const given = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!secret) return res.status(503).json({ error: 'CRON_SECRET is not set, so scheduled jobs are off' });
    if (given.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return res.status(401).json({ error: 'Not allowed' });
    const orgs = (await servicePool.query('SELECT id FROM organizations WHERE reminders_enabled')).rows;
    const summary = { companies: orgs.length, sent: 0, failed: 0, waiting: 0, errors: [] as string[] };
    for (const o of orgs) {
      try { const r = await servicePool.tx((c) => runOrgReminders(c, o.id), o.id); summary.sent += r.filter((x) => x.status === 'SENT').length; summary.failed += r.filter((x) => x.status === 'FAILED').length; summary.waiting += r.filter((x) => x.status === 'NO_CHANNEL').length; }
      catch (e: any) { summary.errors.push(`${o.id}: ${e.message}`); console.error('[cron reminders]', o.id, e); }
    }
    res.json(summary);
  } catch (e) { next(e); }
}
export { list, runNow, daily };
