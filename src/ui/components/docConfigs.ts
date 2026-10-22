export const DOCS = {
  invoices: { path: "/invoices", listKey: "invoices", itemKey: "invoice", route: "/invoices", title: "Invoices", singular: "Invoice", contactType: "CUSTOMER", contactLabel: "Customer", accountType: "REVENUE", dueField: "dueDate", dueLabel: "Due date", exportPath: "/export/invoices", payPath: "/payments/invoice", payIdField: "invoiceId", allowFee: true, paidVerb: "Record payment", openStatuses: ["SENT", "PARTIAL"] },
  bills: { path: "/bills", listKey: "bills", itemKey: "bill", route: "/bills", title: "Bills", singular: "Bill", side: "purchase", contactType: "SUPPLIER", contactLabel: "Supplier", accountType: "EXPENSE", dueField: "dueDate", dueLabel: "Due date", exportPath: "/export/bills", payPath: "/payments/bill", payIdField: "billId", allowFee: false, paidVerb: "Record payment", openStatuses: ["APPROVED", "PARTIAL"] },
  quotes: { path: "/quotes", listKey: "quotes", itemKey: "quote", route: "/quotes", title: "Quotes", singular: "Quote", contactType: "CUSTOMER", contactLabel: "Customer", accountType: "REVENUE", dueField: "expiryDate", dueLabel: "Expiry date", openStatuses: [] },
  "purchase-orders": { path: "/purchase-orders", listKey: "purchaseOrders", itemKey: "purchaseOrder", route: "/purchase-orders", title: "Purchase orders", singular: "Purchase order", contactType: "SUPPLIER", contactLabel: "Supplier", accountType: "EXPENSE", dueField: "deliveryDate", dueLabel: "Delivery date", side: "purchase", openStatuses: [] },
  recurring: { path: "/recurring-invoices", listKey: "recurringInvoices", itemKey: "recurringInvoice", route: "/recurring", title: "Recurring invoices", singular: "Recurring invoice", contactType: "CUSTOMER", contactLabel: "Customer", accountType: "REVENUE", dueField: "endDate", dueLabel: "End date (optional)", recurring: true },
};
// Action buttons per document type & status: [label, endpoint suffix, variant, confirm?]
export const ACTIONS = {
  invoices: { DRAFT: [["Send & post", "send", "primary"], ["Void", "void", "danger", true]], SENT: [["Void", "void", "danger", true]], PARTIAL: [] },
  bills: { DRAFT: [["Approve & post", "approve", "primary"], ["Void", "void", "danger", true]], APPROVED: [["Void", "void", "danger", true]] },
  "purchase-orders": { DRAFT: [["Mark as sent", "send", "primary"], ["Cancel order", "cancel", "danger", true]], SENT: [["Supplier's invoice received", "convert", "gold"], ["Cancel order", "cancel", "danger", true]] },
  quotes: { DRAFT: [["Mark as sent", "send", "primary"]], SENT: [["Accepted", "accept", "primary"], ["Declined", "decline", "danger"]], ACCEPTED: [["Convert to invoice", "convert", "gold"]] },
};
