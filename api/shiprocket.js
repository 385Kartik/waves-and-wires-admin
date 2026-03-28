const BASE = 'https://apiv2.shiprocket.in/v1/external';
let cachedToken = null;
let tokenExpiry = null;

async function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
  });
  const data = await res.json();
  cachedToken = data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, payload } = req.body;
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    // ACTION: Create Order
    if (action === 'create_order') {
      const r = await fetch(`${BASE}/orders/create/adhoc`, { method: 'POST', headers, body: JSON.stringify(payload) });
      return res.status(200).json(await r.json());
    }

    // ACTION: Cancel Order
    if (action === 'cancel_order') {
      const r = await fetch(`${BASE}/orders/cancel`, { 
        method: 'POST', headers, body: JSON.stringify({ ids: [payload.shiprocket_order_id] }) 
      });
      return res.status(200).json(await r.json());
    }

    // ACTION: Track AWB
    if (action === 'track_awb') {
      const r = await fetch(`${BASE}/courier/track/awb/${payload.awb}`, { headers });
      return res.status(200).json(await r.json());
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}