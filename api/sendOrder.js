// filename: api/sendOrder.js
// Vercel Serverless Function (Node.js 18+)
// Endpoint: POST /api/sendOrder

export default async function handler(req, res) {
  // === CORS headers ===
  res.setHeader('Access-Control-Allow-Origin', '*'); // можно ограничить на https://chapman-eu.github.io
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-webhook-secret');

  // Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Optional secret validation
    const configuredSecret = process.env.WEBHOOK_SECRET;
    if (configuredSecret) {
      const incoming = req.headers['x-webhook-secret'] || '';
      if (!incoming || incoming !== configuredSecret) {
        console.error('Unauthorized request: invalid webhook secret');
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const body = req.body || {};
    const order = body.order || body.orderText || null;
    const source = body.source || 'unknown';
    if (!order) return res.status(400).json({ error: 'Missing order' });

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const ADMIN_ID = process.env.ADMIN_ID;
    if (!BOT_TOKEN || !ADMIN_ID) {
      console.error('Missing BOT_TOKEN or ADMIN_ID env vars');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: ADMIN_ID,
      text: typeof order === 'string' ? order : String(order),
      parse_mode: 'HTML',
      disable_web_page_preview: true
    };

    const r = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('Telegram API error', r.status, txt);
      return res.status(500).json({ error: 'Telegram API error', details: txt });
    }

    const data = await r.json();
    console.log('Order sent to admin via Telegram. source=', source);
    return res.status(200).json({ ok: true, telegram: data });

  } catch (err) {
    console.error('sendOrder error', err);
    return res.status(500).json({ error: String(err) });
  }
}
