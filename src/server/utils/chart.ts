import { newId } from './helpers';
const CHART = [
  ['1000','Cash on Hand','ASSET','cash'],['1010','Bank Account','ASSET','bank'],['1100','Accounts Receivable','ASSET','receivable'],['1200','Inventory','ASSET',null],['1500','Equipment','ASSET','fixed'],
  ['2000','Accounts Payable','LIABILITY','payable'],['2100','VAT Output','LIABILITY','vat_output'],['2110','VAT Input','LIABILITY','vat_input'],['2120','SARS Payable','LIABILITY','sars'],['2200','Loans','LIABILITY',null],
  ['3000',"Owner's Equity",'EQUITY',null],['3100','Retained Earnings','EQUITY',null],
  ['4000','Sales','REVENUE',null],['4100','Other Income','REVENUE',null],
  ['5000','Cost of Sales','EXPENSE',null],['6000','Salaries & Wages','EXPENSE',null],['6100','Rent','EXPENSE',null],['6200','Electricity & Water','EXPENSE',null],
  ['6300','Telephone & Internet','EXPENSE',null],['6400','Bank Charges','EXPENSE',null],['6410','Payment Processing Fees','EXPENSE',null],['6500','Office Supplies','EXPENSE',null],
  ['6600','Fuel & Travel','EXPENSE',null],['6700','Professional Fees','EXPENSE',null],['6800','Marketing & Advertising','EXPENSE',null],['6900','General Expenses','EXPENSE',null],
];
/** IDs generated client-side: nexus_authn is INSERT-only on these tables (no RETURNING). Returns the bank ledger account id. */
async function seedChartOfAccounts(client, orgId) {
  for (const [code, name, type, subtype] of CHART) {
    await client.query('INSERT INTO accounts (id, organization_id, code, name, type, subtype, is_system) VALUES ($1,$2,$3,$4,$5,$6,true)', [newId('acc'), orgId, code, name, type, subtype]);
  }
  const rates = [['VAT 15%', 15, true], ['Zero-rated (0%)', 0, false], ['Exempt', 0, false]];
  for (const [name, rate, def] of rates) await client.query('INSERT INTO tax_rates (id, organization_id, name, rate, is_default) VALUES ($1,$2,$3,$4,$5)', [newId('tax'), orgId, name, rate, def]);
}

/** Accounting styles: extra accounts layered on top of the base chart. Applying one only ever ADDS accounts (never renames/removes). */
const TEMPLATES = {
  GENERAL: { label: 'General business', description: 'The standard chart: sales, cost of sales and common overheads.', accounts: [] },
  CONSTRUCTION: { label: 'Construction & trades', description: 'Retentions, subcontractors, materials, plant hire and work in progress.', accounts: [
    ['1300', 'Retentions Receivable', 'ASSET'], ['1310', 'Work in Progress', 'ASSET'], ['2300', 'Retentions Payable', 'LIABILITY'], ['2310', 'Deposits Received in Advance', 'LIABILITY'],
    ['4010', 'Contract Income', 'REVENUE'], ['5010', 'Subcontractors', 'EXPENSE'], ['5020', 'Materials', 'EXPENSE'], ['5030', 'Plant & Equipment Hire', 'EXPENSE'], ['5040', 'Site Labour', 'EXPENSE'], ['6610', 'Vehicle Running Costs', 'EXPENSE']] },
  RETAIL: { label: 'Retail & stock', description: 'Stock on hand, purchases, freight, shrinkage and card fees.', accounts: [
    ['1210', 'Stock on Hand', 'ASSET'], ['4010', 'Point-of-Sale Sales', 'REVENUE'], ['4020', 'Online Sales', 'REVENUE'], ['5010', 'Stock Purchases', 'EXPENSE'], ['5020', 'Freight & Import Costs', 'EXPENSE'], ['5030', 'Stock Shrinkage & Write-offs', 'EXPENSE'], ['6420', 'Card Machine Fees', 'EXPENSE']] },
  RESTAURANT: { label: 'Restaurant & food', description: 'Food and beverage sales and purchases, packaging, wastage and delivery fees.', accounts: [
    ['4010', 'Food Sales', 'REVENUE'], ['4020', 'Beverage Sales', 'REVENUE'], ['5010', 'Food Purchases', 'EXPENSE'], ['5020', 'Beverage Purchases', 'EXPENSE'], ['5030', 'Packaging', 'EXPENSE'], ['5040', 'Wastage', 'EXPENSE'], ['6010', 'Kitchen Wages', 'EXPENSE'], ['6430', 'Delivery Platform Fees', 'EXPENSE']] },
  PROPERTY: { label: 'Property rental', description: 'Rental income, tenant deposits, rates, levies, repairs and agent commission.', accounts: [
    ['1600', 'Investment Property', 'ASSET'], ['2300', 'Tenant Deposits Held', 'LIABILITY'], ['4010', 'Rental Income', 'REVENUE'], ['4020', 'Recoveries from Tenants', 'REVENUE'], ['6110', 'Rates & Taxes', 'EXPENSE'], ['6120', 'Repairs & Maintenance', 'EXPENSE'], ['6130', 'Levies', 'EXPENSE'], ['6140', 'Agent Commission', 'EXPENSE']] },
  FREELANCER: { label: 'Freelancer / consulting', description: 'Fees, software, home office, mileage, training and owner drawings.', accounts: [
    ['3200', 'Owner Drawings', 'EQUITY'], ['4010', 'Consulting Fees', 'REVENUE'], ['6150', 'Home Office Costs', 'EXPENSE'], ['6510', 'Software & Subscriptions', 'EXPENSE'], ['6610', 'Mileage & Travel Claims', 'EXPENSE'], ['6710', 'Training & Courses', 'EXPENSE']] },
  PROFESSIONAL: { label: 'Professional services', description: 'Fees, disbursements, indemnity insurance and memberships.', accounts: [
    ['2300', 'Trust / Client Funds Held', 'LIABILITY'], ['4010', 'Professional Fees', 'REVENUE'], ['4020', 'Disbursements Recovered', 'REVENUE'], ['6720', 'Professional Indemnity Insurance', 'EXPENSE'], ['6730', 'Memberships & Registrations', 'EXPENSE'], ['6740', 'Disbursements', 'EXPENSE']] },
};
/** Adds any template accounts the company does not have yet. `existing` = Set of codes already present (omit for a brand-new company). */
async function applyAccountingStyle(client, orgId, style, existing = new Set()) {
  const t = TEMPLATES[style]; if (!t) throw new Error('Unknown accounting style'); const added = [];
  for (const [code, name, type] of t.accounts) {
    if (existing.has(code)) continue;
    await client.query('INSERT INTO accounts (id, organization_id, code, name, type, is_system) VALUES ($1,$2,$3,$4,$5,false)', [newId('acc'), orgId, code, name, type]); added.push(`${code} ${name}`);
  }
  return added;
}
export { seedChartOfAccounts, CHART, TEMPLATES, applyAccountingStyle };
