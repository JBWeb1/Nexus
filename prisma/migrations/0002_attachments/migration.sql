-- Files attached to documents (receipts, signed quotes, supplier invoices). The bytes live in S3 / Cloudflare R2; this table holds the pointer.
CREATE TABLE attachments (
  id TEXT PRIMARY KEY DEFAULT gen_id('att'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('INVOICE','BILL','QUOTE','CONTACT','GENERAL')),
  entity_id TEXT,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INT NOT NULL CHECK (size >= 0),
  storage_key TEXT NOT NULL UNIQUE,
  uploaded_by TEXT NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX attachments_entity ON attachments (organization_id, entity_type, entity_id);
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON attachments USING (organization_id = current_setting('app.current_org', true)) WITH CHECK (organization_id = current_setting('app.current_org', true));
GRANT SELECT, INSERT, DELETE ON attachments TO nexus_app, nexus_service;
