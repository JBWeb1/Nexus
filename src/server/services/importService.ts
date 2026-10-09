import ExcelJS from 'exceljs'; import { Readable } from 'stream';
import { ApiError } from '../utils/helpers';
const HINTS = { date: ['date', 'transaction date', 'posted'], description: ['description', 'details', 'narrative', 'reference', 'memo', 'payee'], amount: ['amount', 'debit', 'value', 'total', 'paid'] };
const cellText = (v) => (v == null ? '' : typeof v === 'object' && v.richText ? v.richText.map((r) => r.text).join('') : typeof v === 'object' && v.result !== undefined ? String(v.result) : String(v));
function parseDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = cellText(v).trim(); let m;
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // SA: dd/mm/yyyy
  return null;
}
function parseAmount(v) {
  if (typeof v === 'number') return Math.abs(v);
  let s = cellText(v).replace(/[Rr\s\u00a0]/g, '').replace(/^\((.*)\)$/, '-$1');
  // Decimal separator is whichever of , or . comes last (SA exports use "12 800,00"; others "12,800.00").
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? Math.abs(n) : null;
}
async function parseExpenseSpreadsheet(file) {
  const wb = new ExcelJS.Workbook();
  try {
    if (/\.csv$/i.test(file.originalname || '') || file.mimetype === 'text/csv') await wb.csv.read(Readable.from(file.buffer));
    else await wb.xlsx.load(file.buffer);
  } catch { throw new ApiError(400, 'Could not read file. Upload a valid .xlsx or .csv'); }
  const ws = wb.worksheets[0]; if (!ws) throw new ApiError(400, 'File has no sheets');
  const headerRow = ws.getRow(1); const cols: Record<string, number> = {};
  headerRow.eachCell((cell, n) => {
    const t = cellText(cell.value).trim().toLowerCase();
    for (const [k, hs] of Object.entries(HINTS)) if (!cols[k] && hs.some((h) => t === h || t.includes(h))) cols[k] = n;
  });
  if (!cols.date || !cols.amount) throw new ApiError(400, 'Could not detect Date and Amount columns. Add a header row with those names.');
  const rows = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const date = parseDate(row.getCell(cols.date).value), amount = parseAmount(row.getCell(cols.amount).value);
    const description = cols.description ? cellText(row.getCell(cols.description).value).trim() : '';
    if (!date && amount == null && !description) return;
    rows.push({ rowNumber: n, date, description: description || 'Imported expense', amount, valid: !!date && amount > 0 });
  });
  return { detectedColumns: cols, rows };
}
export { parseExpenseSpreadsheet };
