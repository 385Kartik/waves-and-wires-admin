// api/shiprocket.js
// ─────────────────────────────────────────────────────────────────────────────
// FIX: cancel_shipment endpoint was wrong (/orders/cancel/shipment/awbs → /shipments/cancel)
// FIX: shiprocket_order_id should be sent as number, not string, for cancel
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://apiv2.shiprocket.in/v1/external';
let cachedToken = null;
let tokenExpiry = null;

async function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      email:    process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Shiprocket auth failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('No token in Shiprocket auth response');
  cachedToken = data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
      return res.status(200).json(await r.json());
    }

    // ── Cancel order (before AWB assigned) ───────────────────────────────
    // Shiprocket expects ids as array of NUMBERS (not strings)
    if (action === 'cancel_order') {
      const orderId = Number(payload.shiprocket_order_id);
      if (!orderId) return res.status(400).json({ error: 'Invalid shiprocket_order_id' });

      const r = await fetch(`${BASE}/orders/cancel`, {
        method: 'POST', headers,
        body:   JSON.stringify({ ids: [orderId] }),
      });
      const data = await r.json();
      console.log('[SR cancel_order]', JSON.stringify(data));
      return res.status(200).json(data);
    }

    // ── Cancel shipment (after AWB assigned) ─────────────────────────────
    // FIXED: was /orders/cancel/shipment/awbs → correct endpoint is /shipments/cancel
    if (action === 'cancel_shipment') {
      if (!payload.awb_code) return res.status(400).json({ error: 'awb_code required' });

      const r = await fetch(`${BASE}/shipments/cancel`, {
        method: 'POST', headers,
        body:   JSON.stringify({ awbs: [payload.awb_code] }),
      });
      const data = await r.json();
      console.log('[SR cancel_shipment]', JSON.stringify(data));
      return res.status(200).json(data);
    }

    // ── Track by AWB ─────────────────────────────────────────────────────
    if (action === 'track_awb') {
      const r = await fetch(`${BASE}/courier/track/awb/${payload.awb}`, { headers });
      return res.status(200).json(await r.json());
    }

    // ── Get order details (for AWB sync) ──────────────────────────────────
    if (action === 'get_order_details') {
      const r = await fetch(`${BASE}/orders/show/${payload.shiprocket_order_id}`, { headers });
      return res.status(200).json(await r.json());
    }

    // ── Generate AWB (after create_order if not auto-assigned) ────────────
    if (action === 'generate_awb') {
      const r = await fetch(`${BASE}/courier/assign/awb/1`, {
        method: 'POST', headers,
        body:   JSON.stringify({ shipment_id: [payload.shipment_id] }),
      });
      return res.status(200).json(await r.json());
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[Shiprocket API Error]', err.message);
    // If token expired, clear cache so next request re-authenticates
    if (err.message.includes('auth')) { cachedToken = null; tokenExpiry = null; }
    return res.status(500).json({ error: err.message });
  }
}