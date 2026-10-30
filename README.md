# Nexus Ledger

**Try it in your browser:** [interactive demo](https://jbweb1.github.io/Nexus/) with sample books for a coffee roaster (the page is `docs/index.html`, served by GitHub Pages).

Accounting for South African businesses and their accountants.

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui components, Lucide icons, Framer Motion |
| Backend | Next.js route handlers on Node.js |
| Database | PostgreSQL |
| ORM | Prisma 6 (pg driver adapter) |
| Sign-in | Auth.js (next-auth v5) |
| Payments | Paystack |
| Email | Resend |
| File storage | AWS S3 or Cloudflare R2 (local disk in development) |
| Charts | Recharts |
| Hosting | Vercel + Neon or Supabase (see DEPLOY.md) |

## Run it on your computer

You need Node.js 20.6 or newer and PostgreSQL 16.

```bash
copy .env.example .env        # macOS/Linux: cp .env.example .env
npm install
npm run setup                 # creates the database and applies the migrations
npm run build
npm start                     # http://localhost:3000
```

If your PostgreSQL `postgres` password is not `devpassword`, change it in `DIRECT_URL` inside `.env` before `npm run setup`.

While developing, use `npm run dev` instead of build + start. Pages reload as you edit.

Other commands: `npm run typecheck`, `npm run test:unit` (fast checks, no database needed), `npm test` (175 end-to-end checks against a running server; set `API=http://localhost:3000`
and `ADMIN_DATABASE_URL` to the same value as `DIRECT_URL`, and start the server with `PAYSTACK_SECRET_KEY=sk_test_regression` and `DISABLE_RATE_LIMIT=1`).

## Getting paid and receipts

Statements (Contacts > Statement), a customer portal with online payment, automatic payment reminders
(Settings > Payment reminders, sent daily via `/api/cron/daily`) and receipt reading from photos (Receipts, needs
`ANTHROPIC_API_KEY`). See DEPLOY.md for the settings.

## Products, stock, purchase orders and projects

Products & stock keeps a price list for document lines and, for stocked products, the quantity on hand at average cost:
bills add stock, invoices post cost of sales, stock counts post the difference, and the stock value is checked against
the ledger. Purchase orders go to suppliers as PDFs and become draft bills when the supplier's invoice arrives. Projects
collect the invoice and bill lines tagged with them, log hours, and invoice billable hours; each shows its profit.

## Install as an app

Installable from the browser on Android, iPhone, Windows and Mac (Settings > Install the app), as an Android APK
built by `.github/workflows/android.yml` from the `android/` folder, and as a Windows installer (.exe) built by
`.github/workflows/windows.yml` from the `desktop/` folder. See "Installing Nexus as an app" in DEPLOY.md.

## Updates

Every build updates the database itself, owners see when a new version is out (Settings > Updates), and
`npm run update` updates a self-hosted server with a backup and automatic rollback. See "Updating" in DEPLOY.md.

## Try it with sample books

`samples/` holds a quarter of books for a fictional coffee roaster, ready to upload on the Import screen:

- `karoo-coffee-books-q3-2026.xlsx`: a hand-kept expense book (mixed date and number formats, a refund in brackets,
  a totals row) plus the sales, purchases and bank lines for July to September 2026.
- `karoo-opening-debtors-2026-07-01.xlsx` and `karoo-opening-creditors-2026-07-01.xlsx`: what was still owed when the
  books moved over (Import > Opening debtors and creditors).
- `karoo-card-export-sep-2026.csv`: a bank-style export (spending negative) that overlaps the expense book.

`npm run test:business` runs the whole quarter through a running server and checks every report against the workbook.

## How it is put together

```
prisma/schema.prisma        data model (34 models)
prisma/migrations/          SQL migrations: tables, roles, row-level security, ledger triggers
src/app/                    Next.js routes: pages, /api/[...path], /api/session (Auth.js), /webhooks
src/auth.ts                 Auth.js configuration
src/server/routes.ts        every API endpoint in one list
src/server/controllers/     request handlers
src/server/services/        payments, subscriptions, exceptions, import/export
src/server/db.ts            Prisma clients and the tenant transaction
src/ui/                     screens (views), components, shadcn/ui primitives
scripts/                    setup, migrate, regression suite
```

### Design rules worth knowing before you change things

- **Ledger first.** Invoices, bills, payments and credit notes post journal entries. Journal lines cannot be edited or deleted
  (database trigger); corrections are reversing entries. Closed periods are locked in the database.
- **One company can never see another's data.** Every tenant table has PostgreSQL row-level security keyed on
  `app.current_org`. Each request runs in one transaction that sets it (`Db.tx` in `src/server/db.ts`). The app connects as three
  roles: `nexus_app` (tenant-scoped), `nexus_authn` (sign-in and memberships) and `nexus_service` (billing and webhooks).
- **Prisma, two ways.** Simple modules (contacts, tax rates, attachments) use the typed client: `c.prisma.contact.findMany(...)`.
  Ledger, VAT and reporting use SQL through Prisma (`c.query(sql, params)`), because they rely on aggregates, locks and
  database rules the Prisma query API does not express. Both run on the same transaction, so both are tenant-scoped.
- **Sign-in.** `/api/auth/login` checks the password, two-factor code and company membership, then the browser exchanges the
  result for an Auth.js session cookie (httpOnly). Scripts and integrations may send the same proof as a Bearer token.
- **TypeScript.** The code compiles with `strict` off. Shared components, the database layer and the HTTP layer are typed;
  most handlers still take loosely typed request bodies. Tightening that is a good next step.

## Features

Multi-company with a company switcher, team roles (Owner, Admin, Accountant, Viewer) and invitations, invoices, quotes,
recurring invoices, credit notes, bills, purchase orders, products and services, stock on hand at average cost with cost of
sales and stock counts, projects with timesheets and profit per project, payments and reversals, bank accounts, bank matching, bank rules, spreadsheet import,
VAT201 preview and period finalisation, month-end close, reports (P&L, balance sheet, trial balance, aged debtors and
creditors), Excel and PDF export, insights with rule-based explanations, work queue, tasks and monthly checklists, notes, file
attachments, activity log, guided tutorials, two-factor sign-in, password reset, company data export, and subscriptions
(R250 a month for one company, R470 for all the companies a payer owns, 14-day trial).

## Not built

Payroll, PAYE/UIF/SDL and a statutory deadline calendar (they need verified current SARS rules), audit preparation pack,
practice billing, bank feeds, SARS e-filing, multiple warehouses, serial and batch numbers, and stock returned on credit
notes (a credit note reduces the sale; count returned stock back in with a stock count). The VAT201 screen is a preview; you
submit the return yourself on eFiling.

## Not tested against live services

Paystack (checkout, renewals, plan switching), Resend, and S3/R2 are implemented and covered with simulated webhooks and the
local-disk storage driver, but have not been run against the real services. Test each with a sandbox key before launch.
