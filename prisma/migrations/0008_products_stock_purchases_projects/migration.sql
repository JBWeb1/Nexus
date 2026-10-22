-- Products and services, stock on hand, purchase orders, and projects with time tracking.

-- Projects come first: document lines can be tagged with one.
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT gen_id('prj'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  contact_id TEXT REFERENCES contacts(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','ARCHIVED')),
  hourly_rate NUMERIC(18,2),
  budget NUMERIC(18,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX projects_org ON projects (organization_id, status);

-- Hours worked on a project. Billable hours become invoice lines; invoice_id marks them as billed.
CREATE TABLE time_entries (
  id TEXT PRIMARY KEY DEFAULT gen_id('tim'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  user_id TEXT,
  user_name TEXT,
  date DATE NOT NULL,
  hours NUMERIC(8,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT NOT NULL,
  billable BOOLEAN NOT NULL DEFAULT true,
  rate NUMERIC(18,2),
  invoice_id TEXT REFERENCES invoices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX time_entries_project ON time_entries (project_id, date);

-- Products and services. Tracked items keep a quantity on hand and its total cost; the average cost is value / quantity.
-- For a tracked item, purchase_account_id is the stock (asset) account and cogs_account_id is charged when it is sold.
CREATE TABLE items (
  id TEXT PRIMARY KEY DEFAULT gen_id('itm'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  sale_price NUMERIC(18,2),
  purchase_price NUMERIC(18,2),
  sale_account_id TEXT REFERENCES accounts(id),
  purchase_account_id TEXT REFERENCES accounts(id),
  cogs_account_id TEXT REFERENCES accounts(id),
  sale_tax_rate_id TEXT REFERENCES tax_rates(id),
  purchase_tax_rate_id TEXT REFERENCES tax_rates(id),
  track_stock BOOLEAN NOT NULL DEFAULT false,
  qty_on_hand NUMERIC(18,4) NOT NULL DEFAULT 0,
  stock_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(18,4),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code),
  CHECK (NOT track_stock OR (purchase_account_id IS NOT NULL AND cogs_account_id IS NOT NULL))
);

-- Every change to stock, with its cost. A permanent record: never edited, a mistake is undone by another movement.
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_id('stk'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('PURCHASE','SALE','ADJUSTMENT','OPENING','VOID')),
  quantity NUMERIC(18,4) NOT NULL,
  value NUMERIC(18,2) NOT NULL,
  source_table TEXT,
  source_id TEXT,
  line_id TEXT,
  project_id TEXT REFERENCES projects(id),
  journal_entry_id TEXT REFERENCES journal_entries(id),
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_item ON stock_movements (item_id, date, created_at);
CREATE INDEX stock_movements_source ON stock_movements (source_table, source_id);

-- Purchase orders: what was ordered from a supplier, turned into a bill when the supplier's invoice arrives.
ALTER TABLE organizations ADD COLUMN purchase_order_prefix TEXT NOT NULL DEFAULT 'PO';
GRANT UPDATE (purchase_order_prefix) ON organizations TO nexus_app;
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_id('po'),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  delivery_date DATE,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','BILLED','CANCELLED')),
  notes TEXT,
  bill_id TEXT REFERENCES bills(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);
CREATE TABLE purchase_order_lines (
  id TEXT PRIMARY KEY DEFAULT gen_id('pol'),
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  tax_rate_id TEXT REFERENCES tax_rates(id),
  line_total NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0
);

-- Every kind of document line can name a product and a project.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['invoice_lines','bill_lines','quote_lines','recurring_invoice_lines','credit_note_lines','purchase_order_lines'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN item_id TEXT REFERENCES items(id)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN project_id TEXT REFERENCES projects(id)', t);
  END LOOP;
END $$;
CREATE INDEX invoice_lines_project ON invoice_lines (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX bill_lines_project ON bill_lines (project_id) WHERE project_id IS NOT NULL;

-- Notes and attachments can belong to the new records too.
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_entity_type_check;
ALTER TABLE notes ADD CONSTRAINT notes_entity_type_check CHECK (entity_type IN ('GENERAL','INVOICE','BILL','QUOTE','CONTACT','PERIOD','PURCHASE_ORDER','PROJECT','ITEM'));
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_entity_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_entity_type_check CHECK (entity_type IN ('INVOICE','BILL','QUOTE','CONTACT','GENERAL','PURCHASE_ORDER','PROJECT','ITEM'));

-- Row-level security: each company sees only its own.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['projects','time_entries','items','stock_movements','purchase_orders'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant ON %I USING (organization_id = current_setting(''app.current_org'', true)) WITH CHECK (organization_id = current_setting(''app.current_org'', true))', t);
    EXECUTE format('CREATE POLICY service_role ON %I TO nexus_service USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant ON purchase_order_lines USING (EXISTS (SELECT 1 FROM purchase_orders p WHERE p.id = purchase_order_id)) WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders p WHERE p.id = purchase_order_id));
CREATE POLICY service_role ON purchase_order_lines TO nexus_service USING (true) WITH CHECK (true);
GRANT ALL ON projects, time_entries, items, purchase_orders, purchase_order_lines TO nexus_app, nexus_service;
GRANT SELECT, INSERT ON stock_movements TO nexus_app, nexus_service;
