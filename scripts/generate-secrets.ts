/**
 * Makes the secret values Nexus needs before it goes live. Run it on your own computer, never in a shared terminal.
 *
 *   npm run secrets                 writes secrets.local.env and secrets.local.sql (git ignores both, only you can read them)
 *   npm run secrets -- --into .env  replaces AUTH_SECRET, JWT_SECRET and CRON_SECRET in an existing env file
 *
 * Values are never printed. Copy them from the file into your host's environment settings, run the SQL once against
 * the production database, then delete both files. KEYS.md explains every key.
 */
import crypto from 'crypto'; import fs from 'fs';

const rand = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const APP_SECRETS = ['AUTH_SECRET', 'JWT_SECRET', 'CRON_SECRET'] as const;
const args = process.argv.slice(2); const flag = (n: string) => args.indexOf(n);

function into(file: string) {
  if (!fs.existsSync(file)) { console.error(`${file} does not exist`); process.exit(1); }
  let text = fs.readFileSync(file, 'utf8');
  for (const name of APP_SECRETS) {
    const line = `${name}=${rand()}`; const re = new RegExp(`^${name}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, line) : `${text.replace(/\n?$/, '\n')}${line}\n`;
  }
  fs.writeFileSync(file, text, { mode: 0o600 }); fs.chmodSync(file, 0o600);
  console.log(`New ${APP_SECRETS.join(', ')} written to ${file}.`);
  console.log('Everyone is signed out when AUTH_SECRET or JWT_SECRET changes, and two-factor must be set up again after JWT_SECRET changes.');
}

function fresh() {
  const env = 'secrets.local.env', sql = 'secrets.local.sql';
  if ((fs.existsSync(env) || fs.existsSync(sql)) && flag('--force') < 0) { console.error(`${env} or ${sql} already exists. Move it away, or run again with --force to replace it.`); process.exit(1); }
  const host = args[flag('--db-host') + 1] && flag('--db-host') >= 0 ? args[flag('--db-host') + 1] : 'YOUR-DB-HOST:5432/nexus_ledger';
  const pw = { nexus_app: rand(24), nexus_authn: rand(24), nexus_service: rand(24) };
  const url = (role: keyof typeof pw) => `postgres://${role}:${pw[role]}@${host}?sslmode=require`;
  const lines = [
    '# Nexus Ledger production secrets. Generated ' + new Date().toISOString().slice(0, 10) + '. Keep private; delete after copying.',
    '# Paste each line into your host (for example Vercel > Project > Settings > Environment Variables). See KEYS.md.',
    '', '# Sign-in sessions, API tokens and two-factor sealing',
    ...APP_SECRETS.map((n) => `${n}=${rand()}`),
    '', '# Database connections for the three app roles (run secrets.local.sql first so the passwords match)',
    `DATABASE_URL=${url('nexus_app')}`, `AUTHN_DATABASE_URL=${url('nexus_authn')}`, `SERVICE_DATABASE_URL=${url('nexus_service')}`,
    '', '# Only if you connect WhatsApp: any long random value, also typed into the Meta developer console',
    `WHATSAPP_VERIFY_TOKEN=${rand(24)}`, '',
  ];
  const stmts = ['-- Run once as the database owner, after the migrations have created the roles. Replaces the development passwords.',
    ...Object.entries(pw).map(([r, p]) => `ALTER ROLE ${r} WITH PASSWORD '${p}';`), ''];
  fs.writeFileSync(env, lines.join('\n'), { mode: 0o600 }); fs.writeFileSync(sql, stmts.join('\n'), { mode: 0o600 });
  console.log(`Wrote ${env} and ${sql} (readable only by you). Values are not shown here on purpose.\n`);
  console.log('Next:');
  console.log(`  1. Run ${sql} against the production database as its owner (psql "$DIRECT_URL" -f ${sql}).`);
  console.log(`  2. Copy each line of ${env} into your host's environment variables.${flag('--db-host') < 0 ? ' Replace YOUR-DB-HOST first, or run again with --db-host host:5432/dbname.' : ''}`);
  console.log('  3. Add the keys from outside services (Paystack, Resend, Anthropic, storage) as KEYS.md describes.');
  console.log('  4. Delete both files.');
}

flag('--into') >= 0 ? into(args[flag('--into') + 1] || '.env') : fresh();
