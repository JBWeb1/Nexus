// Each lesson is a short, ordered walkthrough. `to` is the screen it happens on; `routes` (optional) gives a screen per step for the guided tutorial.
export const LESSONS = [
  { id: "setup", group: "Getting started", minutes: 3, title: "Set up your company", summary: "Tell Nexus who you are so invoices, VAT and reports come out right.", to: "/setup", steps: [
    "Open Settings and fill in your business name and type.", "Tick \"We are registered for VAT\" and enter your 10-digit VAT number if you have one.",
    "Pick the accounting style closest to your business. It adds the right accounts and never removes any.", "Set your VAT cycle and financial year-end.",
    "Add your address and banking details. They print on every invoice and quote."] },
  { id: "tour", routes: ["/", "/invoices", "/banking", "/reports", "/work-queue"], group: "Getting started", minutes: 2, title: "Find your way around", summary: "What each part of the menu is for.", to: "/", steps: [
    "Dashboard shows bank balance, what you're owed, what you owe and this month's profit.", "Sales holds invoices, quotes, recurring invoices and your contacts.",
    "Money is where bank accounts, bank matching and spreadsheet imports live.", "Books has reports, VAT201, month-end and the chart of accounts.",
    "Work queue lists everything that needs a person, with the evidence behind each flag."] },
  { id: "invoice", routes: ["/contacts", "/invoices/new", "/invoices/new", "/invoices", "/invoices"], group: "Selling", minutes: 4, title: "Send your first invoice", summary: "From customer to posted invoice in a few clicks.", to: "/invoices/new", steps: [
    "Add the customer under Contacts if they aren't there yet.", "Go to Invoices and choose New invoice. Pick the customer and add line items with an account and VAT rate.",
    "Leave the due date blank to use your default payment terms.", "Save, then choose Send & post. This puts the invoice in your ledger and splits out the VAT.",
    "Use Download PDF or Email to get it to your customer."] },
  { id: "payment", group: "Selling", minutes: 3, title: "Record a payment", summary: "Mark invoices as paid, in full or in part.", to: "/invoices", steps: [
    "Open the invoice and choose Record payment.", "Pick the bank account, the amount and the date. A part payment leaves the rest outstanding.",
    "If a card gateway took a fee, enter it and Nexus books the fee as an expense.", "Made a mistake? Use Reverse on the payment. Nothing is deleted; a reversing entry is posted."] },
  { id: "credit", group: "Selling", minutes: 3, title: "Issue a credit note", summary: "Reduce what a customer owes without editing the invoice.", to: "/invoices", steps: [
    "Open a sent invoice and choose Issue credit note.", "Enter how many of each line you are crediting, or use Fill all lines for a full credit.",
    "Add a reason and issue it. The balance drops and the VAT is reversed.", "You can void a credit note later; the invoice balance goes back up."] },
  { id: "quotes", routes: ["/quotes", "/quotes", "/recurring"], group: "Selling", minutes: 3, title: "Quotes and recurring invoices", summary: "Win the work, then bill it without retyping.", to: "/quotes", steps: [
    "Create a quote under Quotes and mark it as sent.", "When the customer agrees, mark it Accepted and choose Convert to invoice.",
    "For retainers and rent, set up a recurring invoice. When one is due, generate it from the Recurring page. It arrives as a draft for you to check and send."] },
  { id: "bills", routes: ["/contacts", "/bills", "/import", "/import"], group: "Buying and bank", minutes: 4, title: "Capture bills and expenses", summary: "Record what you owe suppliers, or import a whole spreadsheet.", to: "/bills", steps: [
    "Add the supplier under Contacts, then create a bill under Bills.", "Choose Approve & post to put it in the ledger and claim the input VAT.",
    "Got a bank export? Use Import, match the columns, and give each row an expense account.", "Amounts like \"12 800,00\" and \"R 1 250,50\" are read correctly."] },
  { id: "bank", group: "Buying and bank", minutes: 5, title: "Reconcile your bank", summary: "Make the books agree with the bank statement.", to: "/banking", steps: [
    "Add your bank account with its opening balance.", "Add or import the statement lines.", "For each line choose Find match to link it to an invoice payment or bill payment already in the ledger.",
    "No match because it was never captured? Use Post to account to book it straight to an expense or income account, with VAT.",
    "Create a bank rule for lines that repeat, then use Apply rules to post them all at once."] },
  { id: "vat", group: "Month-end and VAT", minutes: 4, title: "Preview your VAT201", summary: "See output and input VAT for a period, straight from the ledger.", to: "/vat201", steps: [
    "Open VAT201. The dates default to your VAT cycle.", "Check output VAT, input VAT and the net amount against your documents.",
    "When you are happy, finalize the period. It locks those dates so nothing can change underneath a filed return.",
    "Nexus gives you the figures; you still submit the return yourself on SARS eFiling."] },
  { id: "close", group: "Month-end and VAT", minutes: 4, title: "Close the month", summary: "A checklist that tells you exactly what is still open.", to: "/month-end", steps: [
    "Open Month-end and pick the month.", "Work through anything marked in red: unmatched bank lines, drafts, VAT not finalized.", "Amber items are warnings. Review them, but they don't block closing.",
    "Choose Close month. The period is locked in the database and a permanent record is kept."] },
  { id: "insights", routes: ["/insights", "/insights", "/insights", "/insights"], group: "Month-end and VAT", minutes: 3, title: "Understand why numbers moved", summary: "Click a month and see what drove the change.", to: "/insights", steps: [
    "Open Insights and click any month on the chart.", "\"What changed\" compares it with the month before.", "Choose Revenue, Expenses or Debtors to see the customers, suppliers and accounts behind the change.",
    "Click any invoice or bill in the list to open the source document."] },
  { id: "queue", group: "Month-end and VAT", minutes: 2, title: "Use the work queue", summary: "Let the books tell you what needs attention.", to: "/work-queue", steps: [
    "Open Work queue. Items are sorted by urgency.", "Choose \"Why was this flagged?\" to see the evidence.", "Use Review to jump to the screen where you can fix it."] },
  { id: "team", group: "Team and account", minutes: 3, title: "Invite your accountant", summary: "Give someone their own login and stay in control.", to: "/setup", steps: [
    "In Settings, find Team and accountant access.", "Enter their email and choose Accountant, Admin or Viewer.", "If they already use Nexus they are added at once. If not, they join when they register with that email.",
    "Change a role or remove access at any time. It takes effect immediately."] },
  { id: "companies", group: "Team and account", minutes: 2, title: "Run more than one company", summary: "Separate books, one login.", to: "/companies", steps: [
    "Use the company switcher at the top of the menu.", "Choose Add or manage companies to create another one.", "The Companies page shows what needs attention in each, so you know where to work first."] },
  { id: "security", routes: ["/setup", "/setup", "/billing"], group: "Team and account", minutes: 3, title: "Keep your account safe", summary: "Two-factor sign-in, backups of your data and your plan.", to: "/setup", steps: [
    "In Settings, set up two-factor sign-in and scan the QR code with an authenticator app.", "Use Download all company data whenever you want your own copy.",
    "Billing shows your plan, trial days left and payment history."] },
];
