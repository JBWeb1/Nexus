# Changelog

Each version's section becomes its release notes, which owners see under Settings > Updates.

## [2.3.0] - 2026-10-22

### New: products and stock
- Products & stock: a list of what you sell and buy, with prices, accounts and VAT. Pick a product on an invoice, quote,
  bill or purchase order and the line fills itself in.
- Stock on hand for products you keep in stock, at average cost. Approving a bill adds stock; sending an invoice takes it
  out and posts cost of sales in the same entry, so profit is right every month. You cannot invoice more than you have.
- Stock counts: enter what is on the shelf and Nexus writes off (or adds) the difference and posts the journal. Opening
  stock can be entered when you add a product.
- Each product shows its full stock history, low-stock warnings (reorder level), and the total stock value checked
  against the stock account in the ledger.

### New: purchase orders
- Order from suppliers with a purchase order (PO-0001…), download it as a PDF or email it.
- When the supplier's invoice arrives, one click turns the order into a draft bill with the same lines and the
  supplier's invoice number.

### New: projects and timesheets
- Projects for jobs and clients, with an hourly rate and an optional budget.
- Log hours (billable or not) and turn billable hours into an invoice in one click. Voiding that invoice makes the hours
  billable again.
- Tag any invoice, bill or quote line with a project to see what the job earned, what it cost (including stock used) and
  its profit.

### Fixed
- Lines on invoices, quotes, bills and credit notes could come back in a different order from how they were entered,
  on screen and on the PDF. They now always keep their order.

## [2.2.0] - 2026-10-13

### New: get paid faster
- Customer statements: opening balance, invoices, payments and credit notes with a running balance and ageing.
  Download as PDF, email it, or share on WhatsApp. Open it from Contacts > Statement.
- Customer portal: a private link where a customer sees everything they owe, opens their invoices, downloads their
  statement and pays online. Links expire after a year and can be turned off per customer.
- Automatic payment reminders (Settings > Payment reminders): a friendly note 3 days before the due date, then on the
  day, 7 and 30 days late (you choose the days). Each email has the invoice attached and a pay link; never sent twice;
  pause it for any customer.

### New: receipts from photos
- Snap or upload a till slip or supplier invoice on the new Receipts screen. Claude reads the supplier, date, total
  and VAT; you check it and save it as a bill, paid or owing, with the photo attached as the tax invoice.
- Till slips with zero-rated items (milk, bread) are split so the VAT claimed matches the slip exactly. Fuel is
  zero-rated, and VAT is only suggested on a proper tax invoice.

### New: install Nexus as an app
- Installable on Android, iPhone, Windows and Mac from the browser (Settings > Install the app), with its own icon and
  window, shortcuts to "New invoice" and "Snap a receipt", and an offline screen.
- An Android app (APK), built by GitHub Actions, that opens your Nexus site full-screen.
- A Windows installer (Nexus-Ledger-Setup.exe), built by GitHub Actions: Nexus in its own window with a desktop and
  Start-menu icon.

### Fixed
- Losing the internet connection no longer looks like being signed out: the app says it is offline and reconnects.
- Automatic invoice, bill and quote numbers only follow the company's own sequence (BILL-0004 after BILL-0003).
  Before, a supplier reference such as "T-881" on a bill from a receipt made the next number jump to BILL-0882.

## [2.1.0] - 2026-10-10

### New
- Updates: the app shows its version and tells owners when a newer one is out, with these notes. Every build brings the
  database up to date before the new version goes live, and `npm run update` updates a self-hosted server with a backup,
  a health check and automatic rollback.
- Import expenses and refunds from expense books and bank exports: refunds are recognised, VAT is claimed on imported
  expenses, accounts are suggested from a Category column, saved rules or past imports, and duplicates are skipped.
- Bring over opening debtors and creditors when moving from another system.
- Bank accounts take an "as at" date for their opening balance.
- Converting a quote asks for the invoice date.

### Fixed
- Reports no longer crash when switching to the balance sheet.
- A finalized VAT201 period keeps showing its VAT figures.
- Opening balances are dated correctly, so reports before the account was added are no longer short.

### Security
- Accounts lock for 15 minutes after 10 failed sign-in or two-factor attempts.
- A password reset signs out every earlier session.
- Rate limiting can no longer be dodged with a fake X-Forwarded-For header.
- Missing secrets in production stop the app instead of falling back to a public value.

## [2.0.0]
- First version on GitHub.
