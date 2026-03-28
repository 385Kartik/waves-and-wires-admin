import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { payment_id, amount } = req.body;
    if (!payment_id || !amount) return res.status(400).json({ error: 'payment_id and amount required' });

    const key_id     = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    const result = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ amount: Math.round(amount * 100), speed: 'normal' });
      const auth = Buffer.from(`${key_id}:${key_secret}`).toString('base64');

      const reqHttp = https.request({
        hostname: 'api.razorpay.com',
        path:     `/v1/payments/${payment_id}/refund`,
        method:   'POST',
        headers: {
          'Authorization':  `Basic ${auth}`,
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, r => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve({ status: r.statusCode, body: JSON.parse(data) }));
      });

      reqHttp.on('error', reject);
      reqHttp.write(body);
      reqHttp.end();
    });

    if (result.status === 200 || result.status === 201) {
      return res.status(200).json({ success: true, refund_id: result.body.id });
    } else {
      return res.status(400).json({ success: false, error: result.body.error?.description ?? 'Refund failed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}