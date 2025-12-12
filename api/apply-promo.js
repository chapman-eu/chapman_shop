import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const PROMOS = {
  NEW: { type: 'percent', value: 10 },
  NEWYEAR22: { type: 'percent', value: 20 }
};

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body;
  if (!code)
    return res.status(400).json({ error: 'Promo code required' });

  const promo = PROMOS[code];
  if (!promo)
    return res.status(404).json({ error: 'Invalid promo code' });

  const left = await redis.get(`promo:${code}`);

  if (left === null || Number(left) <= 0) {
    return res.status(410).json({ error: 'Promo code exhausted' });
  }

  return res.status(200).json({
    success: true,
    code,
    type: promo.type,
    value: promo.value,
    left: Number(left)
  });
}
