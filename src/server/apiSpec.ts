/**
 * The public API map: the endpoints integrations may rely on, with what each needs and returns.
 * One list feeds both /api/openapi.json (for tools such as Postman and code generators) and the /developers page.
 * Paths are relative to /api. Everything else the web app calls may change without notice.
 */
export type Endpoint = { method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; path: string; summary: string; tag: string; write?: boolean; query?: Record<string, string>; body?: Record<string, any>; returns: string; note?: string };

const line = { description: 'House Blend 1kg', quantity: 10, unitPrice: 260, accountId: 'acc_…(an income account from GET /accounts)', taxRateId: 'tax_…(from GET /tax-rates)', itemId: 'itm_…(optional, a product: fills price and moves stock)' };

export const ENDPOINTS: Endpoint[] = [
  { tag: 'Company', method: 'GET', path: '/auth/me', summary: 'The company and person this key belongs to', returns: '{ user, organization }' },
  { tag: 'Company', method: 'GET', path: '/accounts', summary: 'Chart of accounts (ids for document lines)', returns: '{ accounts: [...] }' },
  { tag: 'Company', method: 'GET', path: '/tax-rates', summary: 'VAT rates (ids for document lines)', returns: '{ taxRates: [...] }' },

  { tag: 'Contacts', method: 'GET', path: '/contacts', summary: 'List customers and suppliers', query: { type: 'CUSTOMER or SUPPLIER (optional)' }, returns: '{ contacts: [...] }' },
  { tag: 'Contacts', method: 'POST', path: '/contacts', write: true, summary: 'Add a customer or supplier', body: { name: 'Bean There Cafe', type: 'CUSTOMER', email: 'accounts@beanthere.example', phone: '021 555 0100', address: '12 Long Street, Cape Town', vatNumber: '4123456789' }, returns: '{ contact }' },
  { tag: 'Contacts', method: 'GET', path: '/contacts/{id}', summary: 'One contact', returns: '{ contact }' },
  { tag: 'Contacts', method: 'PATCH', path: '/contacts/{id}', write: true, summary: 'Change a contact (send only the fields to change)', body: { phone: '021 555 0199' }, returns: '{ contact }' },
  { tag: 'Contacts', method: 'GET', path: '/contacts/{id}/statement', summary: "A customer's statement", query: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }, returns: '{ statement }' },

  { tag: 'Invoices', method: 'GET', path: '/invoices', summary: 'List invoices', query: { status: 'DRAFT, SENT, PARTIAL, PAID or VOID (optional)' }, returns: '{ invoices: [...] }' },
  { tag: 'Invoices', method: 'POST', path: '/invoices', write: true, summary: 'Create a draft invoice', body: { contactId: 'con_…', issueDate: '2026-11-24', dueDate: '2026-12-24', notes: 'Thank you!', lines: [line] }, returns: '{ invoice } (status DRAFT)', note: 'Totals and VAT are worked out by Nexus. dueDate defaults to your payment terms.' },
  { tag: 'Invoices', method: 'GET', path: '/invoices/{id}', summary: 'One invoice with its lines', returns: '{ invoice }' },
  { tag: 'Invoices', method: 'PATCH', path: '/invoices/{id}', write: true, summary: 'Change a draft invoice', body: { dueDate: '2026-12-31', lines: [line] }, returns: '{ invoice }', note: 'Only drafts can change. Posted invoices are corrected with a credit note.' },
  { tag: 'Invoices', method: 'POST', path: '/invoices/{id}/send', write: true, summary: 'Send (post) an invoice to the ledger', returns: '{ invoice } (status SENT)', note: 'Posting is what makes it count in the books and the VAT201.' },
  { tag: 'Invoices', method: 'POST', path: '/invoices/{id}/email', write: true, summary: 'Email the invoice PDF to the customer', returns: '{ ok }' },
  { tag: 'Invoices', method: 'POST', path: '/invoices/{id}/void', write: true, summary: 'Void an invoice', returns: '{ invoice }' },
  { tag: 'Invoices', method: 'GET', path: '/invoices/{id}/pdf', summary: 'The invoice as a PDF file', returns: 'application/pdf' },
  { tag: 'Invoices', method: 'GET', path: '/quotes', summary: 'List quotes', returns: '{ quotes: [...] }' },
  { tag: 'Invoices', method: 'POST', path: '/quotes', write: true, summary: 'Create a quote', body: { contactId: 'con_…', issueDate: '2026-11-24', expiryDate: '2026-12-24', lines: [line] }, returns: '{ quote }' },

  { tag: 'Bills', method: 'GET', path: '/bills', summary: 'List supplier bills', returns: '{ bills: [...] }' },
  { tag: 'Bills', method: 'POST', path: '/bills', write: true, summary: 'Create a draft bill', body: { contactId: 'con_…(a supplier)', number: 'HGB-5530', issueDate: '2026-11-20', dueDate: '2026-12-20', lines: [{ description: 'Green coffee beans', quantity: 1, unitPrice: 12800, accountId: 'acc_…', taxRateId: 'tax_…' }] }, returns: '{ bill } (status DRAFT)' },
  { tag: 'Bills', method: 'GET', path: '/bills/{id}', summary: 'One bill with its lines', returns: '{ bill }' },
  { tag: 'Bills', method: 'POST', path: '/bills/{id}/approve', write: true, summary: 'Approve (post) a bill to the ledger', returns: '{ bill }' },

  { tag: 'Payments', method: 'POST', path: '/payments/invoice', write: true, summary: 'Record money received for an invoice', body: { invoiceId: 'inv_…', bankAccountId: 'bnk_…', amount: 3450, date: '2026-11-24', reference: 'EFT 8812' }, returns: '{ payment }' },
  { tag: 'Payments', method: 'POST', path: '/payments/bill', write: true, summary: 'Record a payment to a supplier', body: { billId: 'bil_…', bankAccountId: 'bnk_…', amount: 14720, date: '2026-11-24' }, returns: '{ payment }' },
  { tag: 'Payments', method: 'POST', path: '/payments/{id}/reverse', write: true, summary: 'Reverse a payment', body: { date: '2026-11-24' }, returns: '{ payment }' },

  { tag: 'Products', method: 'GET', path: '/items', summary: 'Products and services, with stock on hand', returns: '{ items: [...] }' },
  { tag: 'Products', method: 'POST', path: '/items', write: true, summary: 'Add a product or service', body: { code: 'HB-1KG', name: 'House Blend 1kg', salePrice: 260, purchasePrice: 140, trackStock: true, openingQuantity: 40 }, returns: '{ item }' },
  { tag: 'Products', method: 'GET', path: '/items/{id}', summary: 'One product with its stock history', returns: '{ item, movements }' },
  { tag: 'Products', method: 'GET', path: '/reports/stock-valuation', summary: 'Stock on hand at average cost', returns: '{ asAt, items, total, ledgerBalance, agrees }' },

  { tag: 'Banking', method: 'GET', path: '/bank-accounts', summary: 'Bank accounts and balances', returns: '{ bankAccounts: [...] }' },
  { tag: 'Banking', method: 'GET', path: '/bank-accounts/{id}/transactions', summary: 'Statement lines and whether each is matched', returns: '{ transactions: [...] }' },
  { tag: 'Banking', method: 'POST', path: '/bank-accounts/{id}/transactions', write: true, summary: 'Add a statement line (for example from a bank feed)', body: { date: '2026-11-24', description: 'EFT BEAN THERE CAFE', amount: 3450, type: 'CREDIT' }, returns: '{ transaction }' },

  { tag: 'Reports', method: 'GET', path: '/reports/profit-and-loss', summary: 'Profit and loss', query: { from: 'YYYY-MM-DD (default 1 Jan)', to: 'YYYY-MM-DD (default today)' }, returns: '{ from, to, revenue, expenses, totalRevenue, totalExpenses, netProfit }' },
  { tag: 'Reports', method: 'GET', path: '/reports/balance-sheet', summary: 'Balance sheet', query: { asOf: 'YYYY-MM-DD (default today)' }, returns: '{ asOf, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced }' },
  { tag: 'Reports', method: 'GET', path: '/reports/trial-balance', summary: 'Trial balance', query: { asOf: 'YYYY-MM-DD (default today)' }, returns: '{ asOf, rows, totalDebit, totalCredit, balanced }' },
  { tag: 'Reports', method: 'GET', path: '/reports/aged-receivables', summary: 'Who owes you, by age', query: { asOf: 'YYYY-MM-DD' }, returns: '{ rows, totals }' },
  { tag: 'Reports', method: 'GET', path: '/reports/aged-payables', summary: 'Who you owe, by age', query: { asOf: 'YYYY-MM-DD' }, returns: '{ rows, totals }' },
  { tag: 'Reports', method: 'GET', path: '/reports/vat201', summary: 'VAT201 figures for a period', query: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }, returns: '{ vat201 }', note: 'Figures to review before filing; Nexus does not file with SARS.' },
  { tag: 'Reports', method: 'GET', path: '/books-health', summary: 'The checks Nexus runs on the books', returns: '{ healthy, checks: [...] }' },

  { tag: 'Map', method: 'GET', path: '/map/contacts', summary: 'Customers and suppliers with their map location and what they owe', returns: '{ contacts: [...] }' },
];

/** OpenAPI 3.1 description built from the list above. */
export function openApi(serverUrl: string) {
  const paths: Record<string, any> = {};
  for (const e of ENDPOINTS) {
    const params = [...(e.path.match(/\{(\w+)\}/g) || []).map((p) => ({ name: p.slice(1, -1), in: 'path', required: true, schema: { type: 'string' } })),
      ...Object.entries(e.query || {}).map(([name, description]) => ({ name, in: 'query', required: false, description, schema: { type: 'string' } }))];
    (paths[e.path] ||= {})[e.method.toLowerCase()] = {
      tags: [e.tag], summary: e.summary, description: [e.note, e.write ? 'Needs a read-and-write key.' : 'Works with a read-only key.'].filter(Boolean).join(' '),
      parameters: params.length ? params : undefined,
      requestBody: e.body ? { required: true, content: { 'application/json': { example: e.body } } } : undefined,
      responses: { 200: { description: e.returns }, 401: { description: 'Missing, invalid or revoked key' }, 403: { description: 'The key may not do this' }, 429: { description: 'Too many requests' } },
    };
  }
  return {
    openapi: '3.1.0',
    info: { title: 'Nexus Ledger API', version: '1', description: 'Use one company\'s books from your own software. Authenticate with an API key from Settings > API keys: Authorization: Bearer nxs_...' },
    servers: [{ url: `${serverUrl.replace(/\/$/, '')}/api` }],
    components: { securitySchemes: { apiKey: { type: 'http', scheme: 'bearer', description: 'An API key that starts with nxs_' } } },
    security: [{ apiKey: [] }], paths,
  };
}
