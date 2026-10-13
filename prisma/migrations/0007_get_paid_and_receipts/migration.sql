-- Getting paid faster: automatic payment reminders, customer statements and a customer portal.
ALTER TABLE organizations ADD COLUMN reminders_enabled BOOLEAN NOT NULL DEFAULT false;
-- Days relative to the due date on which a reminder goes out: 3 days before, on the day, 7 and 30 days late.
ALTER TABLE organizations ADD COLUMN reminder_schedule INTEGER[] NOT NULL DEFAULT '{-3,0,7,30}';
GRANT UPDATE (reminders_enabled, reminder_schedule) ON organizations TO nexus_app;
ALTER TABLE contacts ADD COLUMN reminders_paused BOOLEAN NOT NULL DEFAULT false;

-- One row per invoice per reminder stage, so a stage is never sent twice.
CREATE TABLE invoice_reminders (
  id TEXT PRIMARY KEY DEFAULT gen_id('rem'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  stage INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SENT','SKIPPED','FAILED')),
  channels TEXT[] NOT NULL DEFAULT '{}',
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, stage)
);
CREATE INDEX invoice_reminders_org ON invoice_reminders (organization_id, created_at DESC);
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON invoice_reminders USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
CREATE POLICY service_role ON invoice_reminders TO nexus_service USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON invoice_reminders TO nexus_app, nexus_service;

-- Customer portal: a secret link per customer. Only a hash of the link is stored.
CREATE TABLE portal_links (
  id TEXT PRIMARY KEY DEFAULT gen_id('prt'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 year',
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);
CREATE INDEX portal_links_contact ON portal_links (organization_id, contact_id) WHERE revoked_at IS NULL;
ALTER TABLE portal_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON portal_links USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
CREATE POLICY service_role ON portal_links TO nexus_service USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE (revoked_at) ON portal_links TO nexus_app;
GRANT SELECT, INSERT, UPDATE (last_used_at) ON portal_links TO nexus_service;

-- Receipts: a photo read before its bill exists is attached to the bill once it is saved.
GRANT UPDATE (entity_type, entity_id) ON attachments TO nexus_app;
