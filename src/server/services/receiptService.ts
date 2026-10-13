/**
 * Reads a photo or PDF of a receipt or supplier invoice with Claude and returns the fields a bill needs. Needs
 * ANTHROPIC_API_KEY; RECEIPT_MODEL overrides the model. Nothing is saved here: the user checks the result first.
 */
import Anthropic from '@anthropic-ai/sdk';
import { ApiError, money } from '../utils/helpers';

export const RECEIPT_MODEL = () => process.env.RECEIPT_MODEL || 'claude-opus-5-5';
export const receiptsConfigured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const nullable = (type: string, extra: Record<string, unknown> = {}) => ({ type: [type, 'null'], ...extra });
/** What Claude must return. Strict JSON schema: every field present, null when not on the document. */
export const RECEIPT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['supplierName', 'supplierVatNumber', 'documentNumber', 'date', 'currency', 'total', 'vatAmount', 'isTaxInvoice', 'description', 'accountCode', 'paymentMethod', 'confidence', 'notes'],
  properties: {
    supplierName: nullable('string', { description: 'Business that issued the document (the seller), as printed' }),
    supplierVatNumber: nullable('string', { description: "Seller's VAT registration number if printed (South African numbers are 10 digits starting with 4)" }),
    documentNumber: nullable('string', { description: 'Invoice, slip or receipt number' }),
    date: nullable('string', { description: 'Document date as YYYY-MM-DD' }),
    currency: { type: 'string', description: 'ISO currency code, ZAR when amounts are in rand (R)' },
    total: nullable('number', { description: 'Amount paid or payable including VAT' }),
    vatAmount: nullable('number', { description: 'VAT included in the total, as printed. 0 if the document shows no VAT' }),
    isTaxInvoice: { type: 'boolean', description: 'True when it is a valid VAT tax invoice: says "Tax invoice", shows the supplier VAT number and the VAT amount' },
    description: { type: 'string', description: 'A short bookkeeping description of what was bought, e.g. "Diesel for delivery van" or "Office printer paper"' },
    accountCode: nullable('string', { description: 'The best expense account code from the list provided, or null if none fits' }),
    paymentMethod: { type: 'string', enum: ['card', 'cash', 'eft', 'account', 'unknown'], description: 'How it was paid; "account" when it is an invoice to be paid later' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How clearly the key fields (supplier, date, total) could be read' },
    notes: { type: 'string', description: 'Anything the bookkeeper should check (blurry total, handwritten changes, several receipts in one photo). Empty if none' },
  },
} as const;

export type ReceiptReading = {
  supplierName: string | null; supplierVatNumber: string | null; documentNumber: string | null; date: string | null; currency: string;
  total: number | null; vatAmount: number | null; isTaxInvoice: boolean; description: string; accountCode: string | null;
  paymentMethod: 'card' | 'cash' | 'eft' | 'account' | 'unknown'; confidence: 'high' | 'medium' | 'low'; notes: string;
};

const SYSTEM = `You read receipts, till slips and supplier invoices for a South African small business's bookkeeping.
Read only what is printed on the document; never guess a number that is not there, use null instead.
South African documents usually show amounts as "R 1 234,56" or "R1,234.56" and dates as DD/MM/YYYY.
VAT is 15%. Fuel is zero-rated. If the document shows a VAT amount, report that amount as printed.
If the image is not a receipt or invoice, return nulls, confidence "low" and say so in notes.`;

/** Cleans what came back: sensible numbers and dates, and an account code that really is on the list. */
export function normaliseReading(raw: any, accountCodes: string[]): ReceiptReading {
  const num = (v: any) => (typeof v === 'number' && isFinite(v) ? money(Math.abs(v)) : null);
  const date = typeof raw?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) && !isNaN(Date.parse(raw.date)) ? raw.date : null;
  const total = num(raw?.total); let vat = num(raw?.vatAmount);
  const notes = [String(raw?.notes || '').trim()];
  if (total !== null && vat !== null && vat > total) { notes.push('The VAT read was larger than the total, so it was left out: check it.'); vat = null; }
  return {
    supplierName: raw?.supplierName ? String(raw.supplierName).trim().slice(0, 200) : null,
    supplierVatNumber: raw?.supplierVatNumber ? String(raw.supplierVatNumber).replace(/\s/g, '').slice(0, 20) : null,
    documentNumber: raw?.documentNumber ? String(raw.documentNumber).trim().slice(0, 60) : null,
    date, currency: /^[A-Z]{3}$/.test(String(raw?.currency || '')) ? raw.currency : 'ZAR', total, vatAmount: vat,
    isTaxInvoice: raw?.isTaxInvoice === true, description: String(raw?.description || '').trim().slice(0, 200) || 'Receipt',
    accountCode: accountCodes.includes(String(raw?.accountCode)) ? String(raw.accountCode) : null,
    paymentMethod: ['card', 'cash', 'eft', 'account'].includes(raw?.paymentMethod) ? raw.paymentMethod : 'unknown',
    confidence: ['high', 'medium', 'low'].includes(raw?.confidence) ? raw.confidence : 'low',
    notes: notes.filter(Boolean).join(' '),
  };
}

let client: Anthropic | null = null;
/** `anthropic` is injectable for tests; production uses one shared client. */
export async function readReceipt(file: { buffer: Buffer; mimetype: string }, accounts: { code: string; name: string }[], anthropic?: Pick<Anthropic, 'beta'>): Promise<ReceiptReading> {
  if (!anthropic && !receiptsConfigured()) throw new ApiError(503, 'Reading receipts is not set up on this server yet. Add ANTHROPIC_API_KEY to the server settings.');
  const type = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
  const isPdf = type === 'application/pdf';
  if (!isPdf && !IMAGE_TYPES.includes(type as ImageType)) throw new ApiError(400, 'Upload a photo (JPEG, PNG or WebP) or a PDF of the receipt. iPhone HEIC photos: set the camera to "Most compatible", or share as JPEG.');
  if (file.buffer.length > 5 * 1024 * 1024 && !isPdf) throw new ApiError(413, 'That photo is larger than 5 MB. Take it again at a lower resolution.');
  const data = file.buffer.toString('base64');
  const doc: Anthropic.Beta.BetaContentBlockParam = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: type as ImageType, data } };
  const list = accounts.map((a) => `${a.code} ${a.name}`).join('\n');
  const api = anthropic ?? (client ??= new Anthropic());
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await api.beta.messages.create({
      model: RECEIPT_MODEL(), max_tokens: 4000, system: SYSTEM,
      // A safety decline is re-run on Anthropic's recommended fallback model instead of failing.
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: RECEIPT_SCHEMA as any } },
      messages: [{ role: 'user', content: [doc, { type: 'text', text: `Read this document. Expense accounts to choose from:\n${list}` }] }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new ApiError(429, 'The receipt reader is busy. Try again in a minute.');
    if (e instanceof Anthropic.AuthenticationError) throw new ApiError(503, 'The receipt reader key (ANTHROPIC_API_KEY) was not accepted.');
    if (e instanceof Anthropic.BadRequestError) throw new ApiError(400, 'That file could not be read as a receipt. Try a clearer photo.');
    if (e instanceof Anthropic.APIError) throw new ApiError(502, 'The receipt reader is not available right now. Try again shortly.');
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new ApiError(422, 'This document could not be read. Enter it by hand.');
  if (response.stop_reason === 'max_tokens') throw new ApiError(502, 'The receipt reader stopped early. Try again.');
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  let raw: unknown; try { raw = JSON.parse(text || ''); } catch { throw new ApiError(502, 'The receipt reader gave an unreadable answer. Try again.'); }
  return normaliseReading(raw, accounts.map((a) => a.code));
}
