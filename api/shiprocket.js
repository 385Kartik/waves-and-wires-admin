const BASE = 'https://apiv2.shiprocket.in/v1/external';
let cachedToken  = null;
let tokenExpiry  = null;

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
  cachedToken  = data.token;
  tokenExpiry  = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 din
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

    // ── Order create karo ───────────────────────────────────────────────
    if (action === 'create_order') {
      const r = await fetch(`${BASE}/orders/create/adhoc`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      return res.status(200).json(await r.json());
    }

    // ── Order cancel karo (AWB assign hone SE PEHLE) ────────────────────
    // Shiprocket order_id level par cancel
    if (action === 'cancel_order') {
      const r = await fetch(`${BASE}/orders/cancel`, {
        method: 'POST', headers,
        body:   JSON.stringify({ ids: [payload.shiprocket_order_id] }),
      });
      return res.status(200).json(await r.json());
    }

    // ── Shipment cancel karo (AWB assign hone KE BAAD) ──────────────────
    // AWB level par cancel — agar AWB assign ho chuka hai toh yahi use karo
    if (action === 'cancel_shipment') {
      const r = await fetch(`${BASE}/orders/cancel/shipment/awbs`, {
        method: 'POST', headers,
        body:   JSON.stringify({ awbs: [payload.awb_code] }),
      });
      return res.status(200).json(await r.json());
    }

    // ── AWB se live tracking ─────────────────────────────────────────────
    if (action === 'track_awb') {
      const r = await fetch(`${BASE}/courier/track/awb/${payload.awb}`, { headers });
      return res.status(200).json(await r.json());
    }

    // ── SR se order details fetch karo (AWB sync ke liye) ───────────────
    if (action === 'get_order_details') {
      const r = await fetch(`${BASE}/orders/show/${payload.shiprocket_order_id}`, { headers });
      return res.status(200).json(await r.json());
    }

    // ── Existing shipment par AWB generate karo ──────────────────────────
    // Ye tab kaam aata hai jab create_order ke waqt AWB auto-assign nahi hua
    // shipment_id required hai — create_order response se save hona chahiye
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
    return res.status(500).json({ error: err.message });
  }
}