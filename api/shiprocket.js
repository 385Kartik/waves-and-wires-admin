// api/shiprocket.js
// FIX: cancel_shipment endpoint corrected
// FIX: token cache made resilient for serverless cold starts
const BASE = 'https://apiv2.shiprocket.in/v1/external';

let _token  = null;
let _expiry = 0;

async function getToken() {
  if (_token && Date.now() < _expiry) return _token;

  const res = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email:    process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  if (!res.ok) throw new Error(`Shiprocket auth failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('No token in Shiprocket auth response');

  _token  = data.token;
  _expiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days
  return _token;
}

function resetToken() {
  _token  = null;
  _expiry = 0;
}

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
    const { action, payload } = req.body ?? {};
    if (!action) return res.status(400).json({ error: 'Missing action' });

    const token   = await getToken();
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // ── Create order ─────────────────────────────────────────────────────
    if (action === 'create_order') {
      const r = await fetch(`${BASE}/orders/create/adhoc`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (r.status === 401) { resetToken(); throw new Error('Shiprocket token expired. Please retry.'); }
      return res.status(200).json(data);
    }

    // ── Cancel order (before AWB assigned) ───────────────────────────────
    if (action === 'cancel_order') {
      const orderId = Number(payload.shiprocket_order_id);
      if (!orderId) return res.status(400).json({ error: 'Invalid shiprocket_order_id' });

      const r = await fetch(`${BASE}/orders/cancel`, {
        method: 'POST', headers,
        body:   JSON.stringify({ ids: [orderId] }),
      });
      const data = await r.json();
      if (r.status === 401) { resetToken(); throw new Error('Shiprocket token expired. Please retry.'); }
      console.log('[SR cancel_order]', JSON.stringify(data));
      return res.status(200).json(data);
    }

    // ── Cancel shipment (after AWB assigned) ─────────────────────────────
    if (action === 'cancel_shipment') {
      if (!payload.awb_code) return res.status(400).json({ error: 'awb_code required' });

      const r = await fetch(`${BASE}/shipments/cancel`, {
        method: 'POST', headers,
        body:   JSON.stringify({ awbs: [payload.awb_code] }),
      });
      const data = await r.json();
      if (r.status === 401) { resetToken(); throw new Error('Shiprocket token expired. Please retry.'); }
      console.log('[SR cancel_shipment]', JSON.stringify(data));
      return res.status(200).json(data);
    }

    // ── Track by AWB ─────────────────────────────────────────────────────
    if (action === 'track_awb') {
      const r = await fetch(`${BASE}/courier/track/awb/${payload.awb}`, { headers });
      if (r.status === 401) { resetToken(); throw new Error('Shiprocket token expired. Please retry.'); }
      return res.status(200).json(await r.json());
    }

    // ── Get order details ──────────────────────────────────────────────────
    if (action === 'get_order_details') {
      const r = await fetch(`${BASE}/orders/show/${payload.shiprocket_order_id}`, { headers });
      if (r.status === 401) { resetToken(); throw new Error('Shiprocket token expired. Please retry.'); }
      return res.status(200).json(await r.json());
    }

    // ── Generate AWB ──────────────────────────────────────────────────────
    if (action === 'generate_awb') {
      const r = await fetch(`${BASE}/courier/assign/awb/1`, {
        method: 'POST', headers,
        body:   JSON.stringify({ shipment_id: [payload.shipment_id] }),
      });
      if (r.status === 401) { resetToken(); throw new Error('Shiprocket token expired. Please retry.'); }
      return res.status(200).json(await r.json());
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[Shiprocket API Error]', err.message);
    if (err.message.includes('auth') || err.message.includes('401')) resetToken();
    return res.status(500).json({ error: err.message });
  }
}