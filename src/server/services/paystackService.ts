async function verifyPaystackTransaction(reference) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY not configured');
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${key}` } });
  const body = await res.json();
  if (!res.ok || !body.status) throw new Error(`Paystack verify failed: ${body.message || res.status}`);
  return body.data; // {status, amount (minor units), fees, currency, metadata, reference}
}
export { verifyPaystackTransaction };
