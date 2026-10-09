CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION gen_id(prefix text) RETURNS text AS $$
  SELECT prefix || '_' || replace(gen_random_uuid()::text, '-', '')
$$ LANGUAGE sql VOLATILE;

CREATE TABLE organizations (
  id TEXT PRIMARY KEY DEFAULT gen_id('org'),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  vat_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT gen_id('usr'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER','ADMIN','ACCOUNTANT','VIEWER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY DEFAULT gen_id('acc'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  subtype TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE TABLE tax_rates (
  id TEXT PRIMARY KEY DEFAULT gen_id('tax'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  rate NUMERIC(6,3) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contacts (
  id TEXT PRIMARY KEY DEFAULT gen_id('con'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  email TEXT, phone TEXT, address TEXT, vat_number TEXT,
  type TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (type IN ('CUSTOMER','SUPPLIER','BOTH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bank_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_id('bnk'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  bank_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE financial_years (
  id TEXT PRIMARY KEY DEFAULT gen_id('fy'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  UNIQUE (organization_id, start_date)
);

CREATE TABLE period_locks (
  organization_id TEXT PRIMARY KEY REFERENCES organizations(id),
  locked_through DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY DEFAULT gen_id('je'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('SALES','PURCHASE','RECEIPT','PAYMENT','JOURNAL','BANK_RECONCILIATION','VAT_SETTLEMENT','REVERSAL')),
  source_table TEXT,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','REVERSED')),
  reverses_entry_id TEXT REFERENCES journal_entries(id),
  financial_year_id TEXT REFERENCES financial_years(id),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON journal_entries (organization_id, date);

CREATE TABLE journal_lines (
  id TEXT PRIMARY KEY DEFAULT gen_id('jl'),
  journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  debit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  CHECK (NOT (debit > 0 AND credit > 0))
);
CREATE INDEX ON journal_lines (journal_entry_id);
CREATE INDEX ON journal_lines (account_id);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY DEFAULT gen_id('inv'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','PARTIAL','PAID','VOID')),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  journal_entry_id TEXT REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

CREATE TABLE invoice_lines (
  id TEXT PRIMARY KEY DEFAULT gen_id('il'),
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  tax_rate_id TEXT REFERENCES tax_rates(id),
  line_total NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE bills (
  id TEXT PRIMARY KEY DEFAULT gen_id('bil'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','PARTIAL','PAID','VOID')),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  journal_entry_id TEXT REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

CREATE TABLE bill_lines (
  id TEXT PRIMARY KEY DEFAULT gen_id('bl'),
  bill_id TEXT NOT NULL REFERENCES bills(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  tax_rate_id TEXT REFERENCES tax_rates(id),
  line_total NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT gen_id('pay'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  type TEXT NOT NULL CHECK (type IN ('RECEIPT','PAYMENT')),
  invoice_id TEXT REFERENCES invoices(id),
  bill_id TEXT REFERENCES bills(id),
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  reference TEXT,
  gateway TEXT,
  gateway_reference TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED','REVERSED')),
  journal_entry_id TEXT REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_gateway_ref ON payments (gateway, gateway_reference) WHERE gateway_reference IS NOT NULL;

CREATE TABLE bank_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_id('btx'),
  bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('DEBIT','CREDIT')),
  reconciliation_status TEXT NOT NULL DEFAULT 'UNMATCHED' CHECK (reconciliation_status IN ('UNMATCHED','MATCHED','IGNORED')),
  matched_journal_line_id TEXT REFERENCES journal_lines(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY DEFAULT gen_id('whe'),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

-- Immutability triggers
CREATE FUNCTION forbid_journal_line_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'journal_lines are immutable; post a reversal instead'; END $$ LANGUAGE plpgsql;
CREATE TRIGGER journal_lines_immutable BEFORE UPDATE OR DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION forbid_journal_line_mutation();

CREATE FUNCTION forbid_journal_entry_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'journal_entries cannot be deleted'; END IF;
  IF OLD.status = 'POSTED' AND NEW.status = 'REVERSED'
     AND (NEW.id, NEW.organization_id, NEW.date, NEW.description, NEW.source_type, NEW.source_table, NEW.source_id, NEW.reverses_entry_id, NEW.financial_year_id)
         IS NOT DISTINCT FROM
         (OLD.id, OLD.organization_id, OLD.date, OLD.description, OLD.source_type, OLD.source_table, OLD.source_id, OLD.reverses_entry_id, OLD.financial_year_id)
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'journal_entries are immutable (only POSTED->REVERSED is allowed)';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER journal_entries_immutable BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION forbid_journal_entry_mutation();

CREATE FUNCTION enforce_period_lock() RETURNS trigger AS $$
DECLARE locked DATE;
BEGIN
  SELECT locked_through INTO locked FROM period_locks WHERE organization_id = NEW.organization_id;
  IF locked IS NOT NULL AND NEW.date <= locked THEN
    RAISE EXCEPTION 'Period is locked through %; cannot post on %', locked, NEW.date USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER journal_entries_period_lock BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_period_lock();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nexus_app') THEN CREATE ROLE nexus_app LOGIN NOBYPASSRLS PASSWORD 'nexus_app_dev_password'; END IF;
  -- These two work across companies. Their access comes from role-specific policies (migration 0003), so no BYPASSRLS
  -- attribute is needed, which matters on hosted Postgres where the project owner may not be allowed to grant it.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nexus_authn') THEN CREATE ROLE nexus_authn LOGIN PASSWORD 'nexus_authn_dev_password'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='nexus_service') THEN CREATE ROLE nexus_service LOGIN PASSWORD 'nexus_service_dev_password'; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO nexus_app, nexus_authn, nexus_service;
GRANT EXECUTE ON FUNCTION gen_id(text) TO nexus_app, nexus_authn, nexus_service;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['organizations','users','accounts','tax_rates','contacts','bank_accounts','financial_years','period_locks','journal_entries','invoices','bills','payments']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF t = 'organizations' THEN
      EXECUTE 'CREATE POLICY tenant ON organizations USING (id = current_setting(''app.current_org'', true))';
    ELSE
      EXECUTE format('CREATE POLICY tenant ON %I USING (organization_id = current_setting(''app.current_org'', true)) WITH CHECK (organization_id = current_setting(''app.current_org'', true))', t);
    END IF;
  END LOOP;
END $$;

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON invoice_lines USING (EXISTS (SELECT 1 FROM invoices p WHERE p.id = invoice_id)) WITH CHECK (EXISTS (SELECT 1 FROM invoices p WHERE p.id = invoice_id));
CREATE POLICY tenant ON bill_lines USING (EXISTS (SELECT 1 FROM bills p WHERE p.id = bill_id)) WITH CHECK (EXISTS (SELECT 1 FROM bills p WHERE p.id = bill_id));
CREATE POLICY tenant ON journal_lines USING (EXISTS (SELECT 1 FROM journal_entries p WHERE p.id = journal_entry_id)) WITH CHECK (EXISTS (SELECT 1 FROM journal_entries p WHERE p.id = journal_entry_id));
CREATE POLICY tenant ON bank_transactions USING (EXISTS (SELECT 1 FROM bank_accounts p WHERE p.id = bank_account_id)) WITH CHECK (EXISTS (SELECT 1 FROM bank_accounts p WHERE p.id = bank_account_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexus_app, nexus_service;
GRANT SELECT, INSERT ON organizations, users TO nexus_authn;
GRANT INSERT ON accounts, tax_rates, financial_years TO nexus_authn;
GRANT SELECT ON users, organizations TO nexus_authn;
CREATE TABLE vat_periods (
  id TEXT PRIMARY KEY DEFAULT gen_id('vat'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'FINALIZED' CHECK (status IN ('DRAFT','FINALIZED')),
  output_vat NUMERIC(18,2) NOT NULL DEFAULT 0,
  input_vat NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_vat NUMERIC(18,2) NOT NULL DEFAULT 0,
  journal_entry_id TEXT REFERENCES journal_entries(id),
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  EXCLUDE USING gist (organization_id WITH =, daterange(period_start, period_end, '[]') WITH &&) WHERE (status = 'FINALIZED')
);
ALTER TABLE vat_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON vat_periods USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
GRANT ALL ON vat_periods TO nexus_app, nexus_service;
CREATE TYPE quote_status AS ENUM ('DRAFT','SENT','ACCEPTED','DECLINED','CONVERTED');
CREATE TABLE quotes (
  id TEXT PRIMARY KEY DEFAULT gen_id('quo'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  number TEXT NOT NULL,
  status quote_status NOT NULL DEFAULT 'DRAFT',
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  converted_invoice_id TEXT REFERENCES invoices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);
CREATE TABLE quote_lines (
  id TEXT PRIMARY KEY DEFAULT gen_id('ql'),
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  tax_rate_id TEXT REFERENCES tax_rates(id),
  line_total NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON quotes USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
CREATE POLICY tenant ON quote_lines USING (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id)) WITH CHECK (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id));
GRANT ALL ON quotes, quote_lines TO nexus_app, nexus_service;
CREATE TYPE recurrence_frequency AS ENUM ('WEEKLY','MONTHLY','QUARTERLY','ANNUALLY');
CREATE TYPE recurring_invoice_status AS ENUM ('ACTIVE','PAUSED','ENDED');
CREATE TABLE recurring_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_id('rec'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  frequency recurrence_frequency NOT NULL,
  status recurring_invoice_status NOT NULL DEFAULT 'ACTIVE',
  start_date DATE NOT NULL,
  next_run_date DATE NOT NULL,
  end_date DATE,
  due_days INT NOT NULL DEFAULT 30,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  notes TEXT,
  last_run_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE recurring_invoice_lines (
  id TEXT PRIMARY KEY DEFAULT gen_id('rl'),
  recurring_invoice_id TEXT NOT NULL REFERENCES recurring_invoices(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  tax_rate_id TEXT REFERENCES tax_rates(id)
);
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON recurring_invoices USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
CREATE POLICY tenant ON recurring_invoice_lines USING (EXISTS (SELECT 1 FROM recurring_invoices r WHERE r.id = recurring_invoice_id)) WITH CHECK (EXISTS (SELECT 1 FROM recurring_invoices r WHERE r.id = recurring_invoice_id));
GRANT ALL ON recurring_invoices, recurring_invoice_lines TO nexus_app, nexus_service;
ALTER TABLE organizations
  ADD COLUMN business_type TEXT,
  ADD COLUMN vat_registered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN onboarding_dismissed BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE month_closes (
  id TEXT PRIMARY KEY DEFAULT gen_id('mc'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  period TEXT NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  closed_by TEXT NOT NULL,
  closed_by_name TEXT NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issues_snapshot JSONB,
  UNIQUE (organization_id, period)
);
ALTER TABLE month_closes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON month_closes USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
GRANT SELECT, INSERT ON month_closes TO nexus_app, nexus_service; -- permanent record: no UPDATE/DELETE for the app roles
GRANT SELECT, INSERT ON organizations TO nexus_authn;
-- Multi-company: a user can belong to several companies, with a role in each.
CREATE TABLE memberships (
  user_id TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER','ADMIN','ACCOUNTANT','VIEWER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);
INSERT INTO memberships (user_id, organization_id, role) SELECT id, organization_id, role FROM users;
-- Identity table: only the identity role touches it (the tenant-scoped app role has no access).
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships TO nexus_authn;
GRANT UPDATE (organization_id) ON users TO nexus_authn; -- "last used company"

-- Per-company accounting style and defaults.
ALTER TABLE organizations
  ADD COLUMN accounting_style TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN vat_cycle TEXT NOT NULL DEFAULT 'B' CHECK (vat_cycle IN ('A','B','C','D')),   -- A: Jan/Mar/..; B: Feb/Apr/..; C: monthly; D: six-monthly
  ADD COLUMN year_end_month INT NOT NULL DEFAULT 2 CHECK (year_end_month BETWEEN 1 AND 12),
  ADD COLUMN invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  ADD COLUMN bill_prefix TEXT NOT NULL DEFAULT 'BILL',
  ADD COLUMN quote_prefix TEXT NOT NULL DEFAULT 'QUO',
  ADD COLUMN default_terms_days INT NOT NULL DEFAULT 30 CHECK (default_terms_days BETWEEN 0 AND 365),
  ADD COLUMN registration_number TEXT,
  ADD COLUMN address TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN bank_details TEXT;

-- Notes: general, or attached to an invoice / bill / quote / contact / month.
CREATE TABLE notes (
  id TEXT PRIMARY KEY DEFAULT gen_id('note'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL DEFAULT 'GENERAL' CHECK (entity_type IN ('GENERAL','INVOICE','BILL','QUOTE','CONTACT','PERIOD')),
  entity_id TEXT,
  title TEXT,
  body TEXT NOT NULL CHECK (length(btrim(body)) > 0),
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((entity_type = 'GENERAL') = (entity_id IS NULL))
);
CREATE INDEX notes_entity_idx ON notes (organization_id, entity_type, entity_id);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON notes USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
GRANT ALL ON notes TO nexus_app, nexus_service;
-- Credit notes (customer): reduce what an invoice owes without touching history. Posted to the ledger; voiding reverses the entry.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('DRAFT','SENT','PARTIAL','PAID','CREDITED','VOID'));
ALTER TABLE invoices ADD COLUMN credit_total NUMERIC(18,2) NOT NULL DEFAULT 0;   -- credits are counted inside amount_paid too, so balances stay consistent everywhere

CREATE TABLE credit_notes (
  id TEXT PRIMARY KEY DEFAULT gen_id('cn'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  reason TEXT,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL, tax_total NUMERIC(18,2) NOT NULL, total NUMERIC(18,2) NOT NULL CHECK (total > 0),
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','VOID')),
  journal_entry_id TEXT REFERENCES journal_entries(id),
  created_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);
CREATE TABLE credit_note_lines (
  id TEXT PRIMARY KEY DEFAULT gen_id('cnl'),
  credit_note_id TEXT NOT NULL REFERENCES credit_notes(id),
  description TEXT NOT NULL, quantity NUMERIC(18,4) NOT NULL DEFAULT 1, unit_price NUMERIC(18,2) NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id), tax_rate_id TEXT REFERENCES tax_rates(id),
  line_total NUMERIC(18,2) NOT NULL, tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);
ALTER TABLE organizations ADD COLUMN credit_note_prefix TEXT NOT NULL DEFAULT 'CN';
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY; ALTER TABLE credit_note_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON credit_notes USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
CREATE POLICY tenant ON credit_note_lines USING (EXISTS (SELECT 1 FROM credit_notes q WHERE q.id = credit_note_id)) WITH CHECK (EXISTS (SELECT 1 FROM credit_notes q WHERE q.id = credit_note_id));
GRANT ALL ON credit_notes, credit_note_lines TO nexus_app, nexus_service;

-- Bank rules: "description contains X -> post to account Y".
CREATE TABLE bank_rules (
  id TEXT PRIMARY KEY DEFAULT gen_id('rule'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL, match_text TEXT NOT NULL CHECK (length(btrim(match_text)) > 0),
  direction TEXT NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  account_id TEXT NOT NULL REFERENCES accounts(id), tax_rate_id TEXT REFERENCES tax_rates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE bank_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON bank_rules USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
GRANT ALL ON bank_rules TO nexus_app, nexus_service;

-- Activity log: append-only record of who changed what.
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY DEFAULT gen_id('act'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL, user_name TEXT NOT NULL,
  action TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_org_time ON activity_log (organization_id, created_at DESC);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON activity_log USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
GRANT SELECT, INSERT ON activity_log TO nexus_app, nexus_service;   -- append-only for the app roles

-- Account security: password reset tokens (stored hashed) and optional two-factor login.
CREATE TABLE password_resets (
  id TEXT PRIMARY KEY DEFAULT gen_id('pr'),
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON password_resets TO nexus_authn;
ALTER TABLE users ADD COLUMN totp_secret TEXT, ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT false;
GRANT UPDATE (password_hash, totp_secret, totp_enabled) ON users TO nexus_authn;
-- Team access: invite an accountant (or anyone) to a company. Identity data, so only the identity role touches it.
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','ACCOUNTANT','VIEWER')),
  invited_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invitations_org_email ON invitations (organization_id, lower(email));
CREATE INDEX invitations_email ON invitations (lower(email));
GRANT SELECT, INSERT, DELETE ON invitations TO nexus_authn;
CREATE INDEX IF NOT EXISTS memberships_org ON memberships (organization_id);
-- Nexus subscription: R250 per company per month, 14-day free trial. Billing state is written only by the billing service (nexus_service), never by the tenant app role.
ALTER TABLE organizations
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'TRIALING' CHECK (subscription_status IN ('TRIALING','ACTIVE','PAST_DUE','CANCELLED')),
  ADD COLUMN trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN current_period_end TIMESTAMPTZ,
  ADD COLUMN paystack_customer_code TEXT,
  ADD COLUMN paystack_subscription_code TEXT,
  ADD COLUMN paystack_email_token TEXT;
CREATE INDEX organizations_paystack_customer ON organizations (paystack_customer_code) WHERE paystack_customer_code IS NOT NULL;
CREATE INDEX organizations_paystack_subscription ON organizations (paystack_subscription_code) WHERE paystack_subscription_code IS NOT NULL;

-- The tenant app role may update company settings but not its own billing state. (New organizations columns need a grant here.)
DO $$ DECLARE cols text; BEGIN
  SELECT string_agg(quote_ident(column_name), ',') INTO cols FROM information_schema.columns
   WHERE table_schema='public' AND table_name='organizations'
     AND column_name NOT IN ('subscription_status','trial_ends_at','current_period_end','paystack_customer_code','paystack_subscription_code','paystack_email_token');
  EXECUTE 'REVOKE UPDATE ON organizations FROM nexus_app';
  EXECUTE 'GRANT UPDATE (' || cols || ') ON organizations TO nexus_app';
END $$;

CREATE TABLE subscription_payments (
  id TEXT PRIMARY KEY DEFAULT gen_id('spy'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  reference TEXT NOT NULL UNIQUE,
  amount NUMERIC(18,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON subscription_payments USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
GRANT SELECT ON subscription_payments TO nexus_app;
GRANT SELECT, INSERT ON subscription_payments TO nexus_service;
GRANT SELECT ON subscription_payments TO nexus_authn;
-- Practice tasks: to-dos per company with an owner and a due date, plus a repeatable monthly bookkeeping checklist.
CREATE TABLE tasks (
  id TEXT PRIMARY KEY DEFAULT gen_id('tsk'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DONE')),
  assignee_id TEXT REFERENCES users(id),
  assignee_name TEXT,
  period TEXT CHECK (period IS NULL OR period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  template_key TEXT,
  sort INT NOT NULL DEFAULT 0,
  link TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by_name TEXT
);
CREATE UNIQUE INDEX tasks_checklist_once ON tasks (organization_id, period, template_key) WHERE template_key IS NOT NULL;
CREATE INDEX tasks_org_status ON tasks (organization_id, status, due_date);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON tasks USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
GRANT ALL ON tasks TO nexus_app, nexus_service;
-- Two plans: SINGLE (one company, R250) and MULTI (R470, covers every company the payer owns).
ALTER TABLE organizations ADD COLUMN plan TEXT NOT NULL DEFAULT 'SINGLE' CHECK (plan IN ('SINGLE','MULTI'));
-- Deliberately no UPDATE grant on "plan" for nexus_app: only the billing service writes it.
GRANT SELECT ON memberships TO nexus_service; -- the billing service works out which companies a payer owns
