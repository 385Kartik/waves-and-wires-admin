// api/phonepe.js
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const PHONEPE_BASE = process.env.PHONEPE_ENV === 'prod'
  ? 'https://api.phonepe.com/apis/hermes'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ── CORS helper — restrict to your domain only ────────────────────────────────
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

  const { action, payload } = req.body ?? {};
  const merchantId = process.env.PHONEPE_MERCHANT_ID;
  const saltKey    = process.env.PHONEPE_SALT_KEY;
  const saltIndex  = process.env.PHONEPE_SALT_INDEX || '1';
  const siteUrl    = (process.env.SITE_URL || '').replace(/\/$/, '');

  // ── INITIATE ────────────────────────────────────────────────────────────────
  if (action === 'initiate') {
    const { amount, orderNumber, phone } = payload ?? {};
    if (!amount || !orderNumber) {
      return res.status(400).json({ error: 'amount and orderNumber required' });
    }

    const merchantTransactionId = `${orderNumber}-${Date.now()}`;

    const data = {
      merchantId,
      merchantTransactionId,
      merchantUserId:    `WW_${orderNumber}`,
      amount:            Math.round(amount * 100),
      redirectUrl:       `${siteUrl}/payment-callback?order=${orderNumber}&txn=${merchantTransactionId}`,
      redirectMode:      'REDIRECT',
      callbackUrl:       `${siteUrl}/api/phonepe-webhook`,
      mobileNumber:      phone ? phone.replace(/\D/g, '').slice(-10) : undefined,
      paymentInstrument: { type: 'PAY_PAGE' },
    };

    const base64Payload = Buffer.from(JSON.stringify(data)).toString('base64');
    const endpoint      = '/pg/v1/pay';
    const xVerify       = `${sha256(base64Payload + endpoint + saltKey)}###${saltIndex}`;

    try {
      const r      = await fetch(`${PHONEPE_BASE}${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-VERIFY': xVerify },
        body:    JSON.stringify({ request: base64Payload }),
      });
      const result = await r.json();
      console.log('[PhonePe] Initiate:', result.code, result.message);

      if (result.success) {
        return res.status(200).json({
          success:       true,
          redirectUrl:   result.data?.instrumentResponse?.redirectInfo?.url,
          transactionId: merchantTransactionId,
          orderNumber,
        });
      }
      return res.status(400).json({
        success: false,
        error:   PHONEPE_ERROR_MESSAGES[result.code] ?? result.message ?? 'PhonePe initiation failed',
        code:    result.code,
      });
    } catch (err) {
      console.error('[PhonePe Initiate Error]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── CONFIRM (server-side verify + DB update — called by PaymentCallback) ────
  // This is the primary action. Frontend never writes to DB directly.
  if (action === 'confirm') {
    const { merchantTransactionId, orderNumber } = payload ?? {};
    if (!merchantTransactionId || !orderNumber) {
      return res.status(400).json({ error: 'merchantTransactionId and orderNumber required' });
    }

    // Check if already confirmed (idempotent — webhook may have already fired)
    const { data: existing } = await supabase
      .from('orders')
      .select('payment_status, status')
      .eq('order_number', orderNumber)
      .single();

    if (existing?.payment_status === 'paid') {
      return res.status(200).json({ success: true, state: 'COMPLETED', alreadyConfirmed: true });
    }

    // Verify with PhonePe
    const endpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const xVerify  = `${sha256(endpoint + saltKey)}###${saltIndex}`;

    try {
      const r      = await fetch(`${PHONEPE_BASE}${endpoint}`, {
        method:  'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY':      xVerify,
          'X-MERCHANT-ID': merchantId,
        },
      });
      const result = await r.json();
      const state  = result?.data?.state;
      console.log('[PhonePe Confirm]', orderNumber, state, result.code);

      if (state === 'COMPLETED' || result.code === 'PAYMENT_SUCCESS') {
        // Server-side DB update — never trust the client for this
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            payment_ref:    merchantTransactionId,
            status:         'confirmed',
            updated_at:     new Date().toISOString(),
          })
          .eq('order_number', orderNumber);

        return res.status(200).json({ success: true, state: 'COMPLETED' });
      }

      if (state === 'FAILED' || result.code === 'PAYMENT_ERROR') {
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status:         'cancelled',
            updated_at:     new Date().toISOString(),
          })
          .eq('order_number', orderNumber);

        return res.status(200).json({
          success: false,
          state:   'FAILED',
          error:   PHONEPE_ERROR_MESSAGES[result.code] ?? result.message ?? 'Payment failed',
        });
      }

      // PENDING — don't update DB, let webhook handle it
      return res.status(200).json({ success: false, state: state ?? 'PENDING' });
    } catch (err) {
      console.error('[PhonePe Confirm Error]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── STATUS CHECK (raw, for admin use) ────────────────────────────────────────
  if (action === 'verify') {
    const { merchantTransactionId } = payload ?? {};
    if (!merchantTransactionId) return res.status(400).json({ error: 'merchantTransactionId required' });

    const endpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const xVerify  = `${sha256(endpoint + saltKey)}###${saltIndex}`;

    try {
      const r      = await fetch(`${PHONEPE_BASE}${endpoint}`, {
        method:  'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY':      xVerify,
          'X-MERCHANT-ID': merchantId,
        },
      });
      const result = await r.json();
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` });
}

const PHONEPE_ERROR_MESSAGES = {
  PAYMENT_ERROR:              'Payment failed. Please try again.',
  PAYMENT_PENDING:            'Payment is pending. Please wait.',
  PAYMENT_DECLINED:           'Payment was declined by your bank.',
  TIMED_OUT:                  'Payment timed out. Please try again.',
  AUTHORIZATION_FAILED:       'Authorization failed.',
  INTERNAL_SERVER_ERROR:      'PhonePe server error. Try again later.',
  BAD_REQUEST:                'Invalid payment request.',
  TRANSACTION_NOT_FOUND:      'Transaction not found.',
  TRANSACTION_ALREADY_EXISTS: 'Duplicate transaction ID.',
};