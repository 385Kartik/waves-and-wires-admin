// api/phonepe-refund.js
// Replaces razorpay-refund.js in both waves-and-wires/api and waves-and-wires-admin/api

import crypto from 'crypto';

const PHONEPE_BASE = process.env.PHONEPE_ENV === 'prod'
  ? 'https://api.phonepe.com/apis/hermes'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    // transaction_id = order_number (jo checkout pe merchantTransactionId set kiya tha)
    const { transaction_id, amount } = req.body;
    if (!transaction_id || !amount) {
      return res.status(400).json({ error: 'transaction_id and amount required' });
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey    = process.env.PHONEPE_SALT_KEY;
    const saltIndex  = process.env.PHONEPE_SALT_INDEX || '1';
    const siteUrl    = process.env.SITE_URL || 'https://wavesandwires.in';

    const refundTransactionId = `REFUND_${transaction_id}_${Date.now()}`;

    const data = {
      merchantId,
      merchantUserId:        `WW_${transaction_id}`,
      originalTransactionId: transaction_id,           // original order number
      merchantTransactionId: refundTransactionId,
      amount:                Math.round(amount * 100), // paise
      callbackUrl:           `${siteUrl}/api/phonepe-webhook`,
    };

    const base64payload = Buffer.from(JSON.stringify(data)).toString('base64');
    const endpoint      = '/pg/v1/refund';
    const hash          = crypto.createHash('sha256').update(base64payload + endpoint + saltKey).digest('hex');
    const xVerify       = `${hash}###${saltIndex}`;

    const r      = await fetch(`${PHONEPE_BASE}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify },
      body:    JSON.stringify({ request: base64payload }),
    });
    const result = await r.json();

    if (result.success) {
      return res.status(200).json({ success: true, refund_id: refundTransactionId });
    }
    return res.status(400).json({ success: false, error: result.message ?? 'Refund failed' });
  } catch (err) {
    console.error('[PhonePe Refund Error]', err.message);
    return res.status(500).json({ error: err.message });
  }
}