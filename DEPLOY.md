# Putting Nexus Ledger online (Vercel + Neon or Supabase)

Both have free tiers that are enough for a demo and first testers. Check their current limits before relying on them.

## 1. Database (Neon or Supabase)

1. Create a project. Choose PostgreSQL 16 or newer and a region close to your customers.
2. Copy the **direct** (non-pooled) connection string. On your computer put it in `.env` as `DIRECT_URL`.
3. Run `npm run db:migrate`. This creates the tables, the three database roles and the security rules.
   The migrations need no superuser and no BYPASSRLS attribute. This was tested here against a plain non-superuser owner,
   not against Neon or Supabase themselves, so watch the output the first time.
4. Give the three roles real passwords. In the provider's SQL editor run, with your own long random values:
   ```sql
   ALTER ROLE nexus_app PASSWORD '...';
   ALTER ROLE nexus_authn PASSWORD '...';
   ALTER ROLE nexus_service PASSWORD '...';
   ```
5. Build three connection strings from the provider's **pooled** host, one per role, same database name:
   `DATABASE_URL` (nexus_app), `AUTHN_DATABASE_URL` (nexus_authn), `SERVICE_DATABASE_URL` (nexus_service).

## 2. App (Vercel)

1. Push this folder to a GitHub repository and import it in Vercel. The defaults work (`npm run build`).
2. Add environment variables: the three database URLs, `AUTH_SECRET` and `JWT_SECRET` (long random strings, for example
   from `openssl rand -base64 32`), and `APP_URL` (your site address, no trailing slash).
3. Deploy, open the site and create your account.

## 3. Optional services

| Service | Variables | Notes |
|---|---|---|
| Paystack | `PAYSTACK_SECRET_KEY`, `PAYSTACK_PLAN_CODE`, `PAYSTACK_PLAN_CODE_MULTI` | Create two monthly plans (R250 and R470) in the Paystack dashboard. Set the webhook URL to `https://your-site/webhooks/paystack`. |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | Verify your sending domain in Resend first. |
| Anthropic (Claude) | `ANTHROPIC_API_KEY`, optional `RECEIPT_MODEL` | Reads receipt photos on the Receipts screen (default model `claude-opus-5-5`). Without it, receipts are typed in by hand. Receipt images are sent to Anthropic to be read: mention this in your privacy policy (POPIA). |
| Daily jobs | `CRON_SECRET` | Payment reminders go out each morning. `vercel.json` schedules `/api/cron/daily` at 05:00 UTC (07:00 SAST) and Vercel sends the secret automatically. On your own server, call it from cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/daily`. |
| WhatsApp (Meta) | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Optional second channel for reminders. Create an approved template named `payment_reminder` with five body parameters: customer name, invoice number, amount, due date, pay link. |
| S3 or R2 | `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, and for R2 `S3_ENDPOINT` | Required for file attachments on Vercel. Without it attachments return a clear "not set up" message. |

## Things that behave differently on serverless hosting

- **Rate limiting** on sign-in is counted per server instance, so on Vercel it is only a speed bump. Add a shared limiter
  (for example Upstash) or Vercel's firewall rules before a public launch.
- **Database connections.** Always use the pooled connection strings for the three app roles. `DB_POOL_MAX` (default 5)
  caps connections per role per instance.
- **Backups.** Free database tiers keep little or no history. Schedule `pg_dump` yourself or pay for point-in-time recovery
  before real customers rely on it.
- **Invoice pay links** use the same Paystack key as subscriptions, so that money lands in your account. Each company needs
  its own Paystack key before pay links are used for real.

## Updating

The app tells owners and admins when a newer version is out (a banner, and Settings > Updates with the release notes).
It reads this project's GitHub releases; for a private repository set `UPDATE_CHECK_TOKEN` to a GitHub token that can
read it, point `UPDATE_CHECK_URL` at another feed, or turn checks off with `UPDATE_CHECK=off`.

**The database updates itself.** `npm run build` applies any new database changes before the new code goes live, using
`DIRECT_URL`. If a change fails it is rolled back and the build stops, so the live site keeps running the old version.

### On Vercel

1. Add `DIRECT_URL` (the owner connection string) to the project's environment variables, so builds can update the database.
2. Merge the new version into the branch Vercel deploys. Vercel builds it, the build updates the database, and the new
   version goes live.

### On your own server

Install with `git clone` so the app can update itself. Then:

```bash
npm run update:check        # is there a newer version? changes nothing
npm run update              # back up, install, update the database, restart, check, roll back on failure
```

`npm run update` backs up the database to `backups/` with `pg_dump` (needs the PostgreSQL client tools and `DIRECT_URL`),
checks out the newest `vX.Y.Z` release, installs and builds it, restarts the app with `UPDATE_RESTART_CMD`
(for example `pm2 restart nexus` or `sudo systemctl restart nexus`), and waits for `APP_URL/health` to report the new
version. If the build fails or the new version does not answer within 90 seconds, it puts the previous version back.
Database changes are additive, so the previous version keeps working; restore a backup with
`pg_restore --clean --if-exists --dbname="$DIRECT_URL" backups/<file>.dump` only if the data itself looks wrong.

Options: `--yes` (no question asked), `--channel=main` (follow the latest commit on main instead of releases),
`--no-backup`. To update every night at 03:15, add a cron line:

```
15 3 * * * cd /srv/nexus && npm run update -- --yes >> backups/update.log 2>&1
```

### Publishing a new version

1. Raise `version` in `package.json` and add a section for it at the top of `CHANGELOG.md`.
2. Merge to main, then tag and push: `git tag v2.2.0 && git push origin v2.2.0`.
3. The Release workflow publishes the GitHub release with the changelog section as its notes. Running installs then
   show "2.2.0 is available", and servers on nightly updates install it.
