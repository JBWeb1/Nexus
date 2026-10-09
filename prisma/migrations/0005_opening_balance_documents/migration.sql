-- Invoices and bills brought over from old books as amounts still owing. They are not sales or purchases of this
-- period, so the VAT201 leaves them out.
ALTER TABLE invoices ADD COLUMN opening_balance BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bills ADD COLUMN opening_balance BOOLEAN NOT NULL DEFAULT false;
