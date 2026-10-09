import PDFDocument from 'pdfkit';
const fmt = (n, cur = 'ZAR') => `${cur === 'ZAR' ? 'R' : cur + ' '} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Renders a tidy A4 document (invoice, quote or credit note) to a Buffer. */
function renderDocument({ kind, org, contact, doc, lines, dateLabel = 'Date', dueLabel = 'Due', extra = [], footer }: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 50 }); const chunks = [];
    pdf.on('data', (c) => chunks.push(c)); pdf.on('end', () => resolve(Buffer.concat(chunks))); pdf.on('error', reject);
    const ink = '#14212F', soft = '#5b6670', gold = '#B8932B';
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(18).text(org.name, 50, 50);
    pdf.font('Helvetica').fontSize(9).fillColor(soft);
    [org.registration_number && `Reg: ${org.registration_number}`, org.vat_number && `VAT: ${org.vat_number}`, org.address, org.phone, org.email].filter(Boolean).forEach((t) => pdf.text(String(t), { width: 260 }));
    pdf.font('Helvetica-Bold').fontSize(22).fillColor(gold).text(kind.toUpperCase(), 330, 50, { width: 215, align: 'right' });
    pdf.font('Helvetica').fontSize(10).fillColor(ink).text(`No: ${doc.number}`, 330, 82, { width: 215, align: 'right' }).text(`${dateLabel}: ${String(doc.issue_date).slice(0, 10)}`, { width: 215, align: 'right' });
    if (doc.due_date) pdf.text(`${dueLabel}: ${String(doc.due_date).slice(0, 10)}`, { width: 215, align: 'right' });
    extra.forEach((t) => pdf.text(t, { width: 215, align: 'right' }));
    let y = Math.max(pdf.y, 150) + 14; pdf.moveTo(50, y).lineTo(545, y).strokeColor('#d8d2c2').stroke(); y += 12;
    pdf.font('Helvetica-Bold').fontSize(9).fillColor(soft).text('BILL TO', 50, y); pdf.font('Helvetica').fontSize(11).fillColor(ink).text(contact.name, 50, y + 13);
    pdf.fontSize(9).fillColor(soft); [contact.address, contact.email, contact.vat_number && `VAT: ${contact.vat_number}`].filter(Boolean).forEach((t) => pdf.text(String(t), { width: 260 }));
    y = pdf.y + 16; const cols = [50, 280, 340, 420, 495];
    pdf.rect(50, y, 495, 20).fill('#EFE9DA'); pdf.fillColor(ink).font('Helvetica-Bold').fontSize(9);
    pdf.text('Description', cols[0] + 6, y + 6); pdf.text('Qty', cols[1], y + 6, { width: 50, align: 'right' }); pdf.text('Price', cols[2], y + 6, { width: 70, align: 'right' }); pdf.text('VAT', cols[3], y + 6, { width: 60, align: 'right' }); pdf.text('Total', cols[4], y + 6, { width: 45, align: 'right' });
    y += 26; pdf.font('Helvetica').fontSize(9.5);
    for (const l of lines) {
      if (y > 700) { pdf.addPage(); y = 60; }
      pdf.fillColor(ink).text(l.description, cols[0] + 6, y, { width: 220 }); const h = pdf.y;
      pdf.text(String(Number(l.quantity)), cols[1], y, { width: 50, align: 'right' }); pdf.text(fmt(l.unit_price, doc.currency), cols[2] - 20, y, { width: 90, align: 'right' });
      pdf.text(fmt(l.tax_amount, doc.currency), cols[3] - 10, y, { width: 70, align: 'right' }); pdf.text(fmt(Number(l.line_total) + Number(l.tax_amount), doc.currency), cols[4] - 25, y, { width: 70, align: 'right' });
      y = Math.max(h, y + 14) + 6; pdf.moveTo(50, y - 3).lineTo(545, y - 3).strokeColor('#e6e0d0').lineWidth(0.5).stroke();
    }
    y += 6; const row = (label: string, val: string, bold = false) => { pdf.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10).fillColor(ink).text(label, 330, y, { width: 100 }); pdf.text(val, 430, y, { width: 115, align: 'right' }); y += bold ? 20 : 15; };
    row('Subtotal', fmt(doc.subtotal, doc.currency)); row('VAT', fmt(doc.tax_total, doc.currency)); row('Total', fmt(doc.total, doc.currency), true);
    if (doc.amount_paid > 0 && kind === 'Invoice') { row('Paid / credited', fmt(doc.amount_paid, doc.currency)); row('Balance due', fmt(doc.total - doc.amount_paid, doc.currency), true); }
    if (doc.currency !== 'ZAR') { pdf.font('Helvetica').fontSize(8.5).fillColor(soft).text(`Exchange rate: 1 ${doc.currency} = R ${Number(doc.exchange_rate)}`, 330, y, { width: 215, align: 'right' }); y += 14; }
    y += 14; if (y > 690) { pdf.addPage(); y = 60; }
    if (doc.reason) { pdf.font('Helvetica-Bold').fontSize(9).fillColor(soft).text('REASON', 50, y); pdf.font('Helvetica').fontSize(10).fillColor(ink).text(doc.reason, 50, y + 12, { width: 495 }); y = pdf.y + 12; }
    if (doc.notes) { pdf.font('Helvetica-Bold').fontSize(9).fillColor(soft).text('NOTES', 50, y); pdf.font('Helvetica').fontSize(10).fillColor(ink).text(doc.notes, 50, y + 12, { width: 495 }); y = pdf.y + 12; }
    if (footer?.bank_details) { pdf.font('Helvetica-Bold').fontSize(9).fillColor(soft).text('BANKING DETAILS', 50, y); pdf.font('Helvetica').fontSize(10).fillColor(ink).text(footer.bank_details, 50, y + 12, { width: 300 }); }
    pdf.end();
  });
}
export { renderDocument };
