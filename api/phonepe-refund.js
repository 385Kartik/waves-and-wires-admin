// api/phonepe-refund.js
import crypto from 'crypto';

const envToken = (process.env.PHONEPE_ENV || '').toLowerCase().trim();
const PHONEPE_BASE = (envToken === 'prod' || envToken === 'production')
  ? 'https://api.phonepe.com/apis/hermes'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const ALLOWED_ORIGINS = [
  process.env.SITE_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { payment_ref, order_number, amount } = req.body;
    if (!payment_ref || !amount) {
      return res.status(400).json({ error: 'payment_ref and amount required' });
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey    = process.env.PHONEPE_SALT_KEY;
    const saltIndex  = process.env.PHONEPE_SALT_INDEX || '1';
    const siteUrl    = (process.env.SITE_URL || '').replace(/\/$/, '');

    const refundTransactionId = `REFUND-${order_number}-${Date.now()}`;

    const data = {
      merchantId,
      merchantUserId:        `WW_${order_number}`,
      originalTransactionId: payment_ref,
      merchantTransactionId: refundTransactionId,
      amount:                Math.round(amount * 100),
      callbackUrl:           `${siteUrl}/api/phonepe-webhook`,
    };

    const base64Payload = Buffer.from(JSON.stringify(data)).toString('base64');
    const endpoint      = '/pg/v1/refund';
    const hash          = crypto.createHash('sha256').update(base64Payload + endpoint + saltKey).digest('hex');
    const xVerify       = `${hash}###${saltIndex}`;

    const r      = await fetch(`${PHONEPE_BASE}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify },
      body:    JSON.stringify({ request: base64Payload }),
    });
    const result = await r.json();
    console.log('[PhonePe Refund]', result.code, result.message);

    if (result.success) {
      return res.status(200).json({ success: true, refund_id: refundTransactionId });
    }
    return res.status(400).json({
      success: false,
      error:   result.message ?? 'Refund failed',
      code:    result.code,
    });
  } catch (err) {
    console.error('[PhonePe Refund Error]', err.message);
    return res.status(500).json({ error: err.message });
  }
}