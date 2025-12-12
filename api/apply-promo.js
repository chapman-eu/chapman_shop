import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    console.log(
  'PROMO typeof:',
  typeof process.env.PROMO_CODES_JSON,
  process.env.PROMO_CODES_JSON
);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Promo code required' });
  }

  let promoCodes;
  try {
    promoCodes = JSON.parse(process.env.PROMO_CODES_JSON);
  } catch (e) {
    return res.status(500).json({ error: 'Promo config error' });
  }

  const promo = promoCodes[code];
  if (!promo) {
    return res.status(404).json({ error: 'Invalid promo code' });
  }

  const redisKey = `promo_used:${code}`;

  const usedCount = (await redis.get(redisKey)) || 0;

  if (usedCount >= promo.limit) {
    return res.status(410).json({ error: 'Promo code limit reached' });
  }

  // атомарно увеличиваем
  await redis.incr(redisKey);

  return res.status(200).json({
    success: true,
    code,
    type: promo.type,   // percent | fixed
    value: promo.value
  });
  
}
