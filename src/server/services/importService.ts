import ExcelJS from 'exceljs'; import { Readable } from 'stream';
import { ApiError } from '../utils/helpers';

// Header words for each column. A header matches when it equals one of these or contains it.
// "in"/"out" columns are checked before the single amount column, so "Debit"/"Credit" pairs are read as two columns.
const HINTS = {
  date: ['date', 'transaction date', 'posted'],
  description: ['description', 'details', 'narrative', 'reference', 'memo', 'payee'],
  moneyOut: ['money out', 'debit', 'withdrawal', 'paid out', 'spent'],
  moneyIn: ['money in', 'credit', 'deposit', 'received', 'paid in'],
  amount: ['amount', 'value', 'total', 'paid'],
  category: ['category', 'account', 'type of expense', 'expense type'],
  balance: ['balance', 'running total'],
};
const cellText = (v) => (v == null ? '' : typeof v === 'object' && v.richText ? v.richText.map((r) => r.text).join('') : typeof v === 'object' && v.result !== undefined ? String(v.result) : String(v));
function parseDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = cellText(v).trim(); let m;
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // SA: dd/mm/yyyy
  return null;
}
/** Signed amount: "(99,00)", "-99" and "99-" are negative. Returns null when the cell holds no number. */
function parseSigned(v) {
  if (v && typeof v === 'object' && v.result !== undefined) v = v.result;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = cellText(v).replace(/[Rr\s ]/g, ''); if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); } else if (s.endsWith('-')) { neg = !neg; s = s.slice(0, -1); }
  // Decimal separator is whichever of , or . comes last (SA exports use "12 800,00"; others "12,800.00").
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(/,/g, '');
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = parseFloat(s); return neg ? -n : n;
}
const parseAmount = (v) => { const n = parseSigned(v); return n == null ? null : Math.abs(n); };

async function readSheet(file) {
  const wb = new ExcelJS.Workbook();
  try {
    if (/\.csv$/i.test(file.originalname || '') || file.mimetype === 'text/csv') await wb.csv.read(Readable.from(file.buffer));
    else await wb.xlsx.load(file.buffer);
  } catch { throw new ApiError(400, 'Could not read file. Upload a valid .xlsx or .csv'); }
  const ws = wb.worksheets[0]; if (!ws) throw new ApiError(400, 'File has no sheets');
  return ws;
}
function detectColumns(ws, hints: Record<string, string[]>) {
  const cols: Record<string, number> = {};
  ws.getRow(1).eachCell((cell, n) => {
    const t = cellText(cell.value).trim().toLowerCase(); if (!t) return;
    for (const [k, hs] of Object.entries(hints)) if (!cols[k] && !Object.values(cols).includes(n) && hs.some((h) => t === h || t.includes(h))) { cols[k] = n; break; }
  });
  return cols;
}

export type Direction = 'EXPENSE' | 'REFUND';
export interface ExpenseRow { rowNumber: number; date: string | null; description: string; amount: number | null; direction: Direction; category: string; valid: boolean; }

/**
 * Reads an expense book or a bank export. Works out which way money moved:
 *  - separate "Money in"/"Money out" (or Credit/Debit) columns: from the column that is filled;
 *  - a bank export (it has a running Balance column, or most figures are negative): negative = expense;
 *  - otherwise, as in a hand-kept expense book: positive = expense, and a bracketed or negative figure = refund.
 */
async function parseExpenseSpreadsheet(file) {
  const ws = await readSheet(file);
  const cols = detectColumns(ws, HINTS);
  // A lone "Debit" or "Credit" column is just the amount column.
  if (!cols.amount && cols.moneyOut && !cols.moneyIn) { cols.amount = cols.moneyOut; delete cols.moneyOut; }
  if (!cols.amount && cols.moneyIn && !cols.moneyOut) { cols.amount = cols.moneyIn; delete cols.moneyIn; }
  const split = !!(cols.moneyIn && cols.moneyOut);
  if (!cols.date || !(cols.amount || split)) throw new ApiError(400, 'Could not detect Date and Amount columns. Add a header row with those names (or "Money in" and "Money out").');
  const raw: { rowNumber: number; date: string | null; description: string; signed: number | null; category: string }[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    let signed: number | null;
    if (split) { const out = parseAmount(row.getCell(cols.moneyOut).value), inn = parseAmount(row.getCell(cols.moneyIn).value); signed = out ? -out : inn ? inn : null; }
    else signed = parseSigned(row.getCell(cols.amount).value);
    const date = parseDate(row.getCell(cols.date).value);
    const description = cols.description ? cellText(row.getCell(cols.description).value).trim() : '';
    const category = cols.category ? cellText(row.getCell(cols.category).value).trim() : '';
    if (!date && signed == null && !description) return;
    raw.push({ rowNumber: n, date, description, signed, category });
  });
  const nums = raw.map((r) => r.signed).filter((x): x is number => x != null && x !== 0);
  // Bank-export style: spending shown as negative. A running balance column marks a bank export; failing that, a
  // hand-kept book is almost never mostly negative, so more than half negative means bank style.
  const negativeIsExpense = split || !!cols.balance || (nums.length > 0 && nums.filter((x) => x < 0).length / nums.length > 0.5);
  const convention = split ? 'IN_OUT_COLUMNS' : negativeIsExpense ? 'NEGATIVE_IS_EXPENSE' : 'POSITIVE_IS_EXPENSE';
  const rows: ExpenseRow[] = raw.map((r) => {
    const amount = r.signed == null ? null : Math.abs(r.signed);
    const direction: Direction = r.signed != null && (negativeIsExpense ? r.signed > 0 : r.signed < 0) ? 'REFUND' : 'EXPENSE';
    return { rowNumber: r.rowNumber, date: r.date, description: r.description || 'Imported expense', amount, direction, category: r.category, valid: !!r.date && amount != null && amount > 0 };
  });
  return { detectedColumns: cols, convention, rows };
}

const OPENING_HINTS = {
  date: ['invoice date', 'date', 'issued'],
  dueDate: ['due date', 'due'],
  contact: ['customer', 'supplier', 'client', 'name', 'contact', 'debtor', 'creditor'],
  reference: ['invoice', 'reference', 'ref', 'number', 'doc'],
  amount: ['amount owing', 'outstanding', 'balance', 'owing', 'amount', 'due amount'],
};
/** Reads a list of documents still owed (debtors) or owing (creditors) on the day the books move over. */
async function parseOpeningSpreadsheet(file) {
  const ws = await readSheet(file);
  // Match the specific headers first ("Due date" before "Date", "Amount owing" before "Amount").
  const cols: Record<string, number> = {};
  ws.getRow(1).eachCell((cell, n) => {
    const t = cellText(cell.value).trim().toLowerCase(); if (!t) return;
    const order = ['dueDate', 'date', 'amount', 'contact', 'reference'];
    for (const k of order) if (!cols[k] && OPENING_HINTS[k].some((h) => t === h || t.includes(h))) { cols[k] = n; break; }
  });
  if (!cols.contact || !cols.amount) throw new ApiError(400, 'Could not detect the Customer/Supplier and Amount owing columns. Add a header row with those names.');
  const rows = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const contactName = cellText(row.getCell(cols.contact).value).trim(); const amount = parseAmount(row.getCell(cols.amount).value);
    const date = cols.date ? parseDate(row.getCell(cols.date).value) : null, dueDate = cols.dueDate ? parseDate(row.getCell(cols.dueDate).value) : null;
    const reference = cols.reference ? cellText(row.getCell(cols.reference).value).trim() : '';
    if (!contactName && amount == null) return;
    rows.push({ rowNumber: n, contactName, reference, date, dueDate, amount, valid: !!contactName && amount != null && amount > 0 && !/^total/i.test(contactName) });
  });
  return { detectedColumns: cols, rows };
}
export { parseExpenseSpreadsheet, parseOpeningSpreadsheet, parseSigned };
