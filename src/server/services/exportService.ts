import ExcelJS from 'exceljs';
/** sheets: [{name, columns:[{header,key,width,money?}], rows:[...]}] */
async function buildWorkbook(sheets) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Nexus Ledger';
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    ws.columns = s.columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 16, style: c.money ? { numFmt: '#,##0.00' } : undefined }));
    ws.getRow(1).font = { bold: true }; ws.views = [{ state: 'frozen', ySplit: 1 }];
    s.rows.forEach((r) => ws.addRow(r));
  }
  return wb;
}
async function sendXlsx(res, wb, filename) {
  const buf = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buf));
}
export { buildWorkbook, sendXlsx };
