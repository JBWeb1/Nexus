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
