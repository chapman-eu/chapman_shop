import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  try {
    const promos = {
      NEW: { type: 'percent', value: 10, limit: 9999 },
      NEWYEAR22: { type: 'percent', value: 20, limit: 50 }
    };

    for (const code in promos) {
      const key = `promo:${code}`;
      await redis.set(key, promos[code].limit);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('SEED ERROR:', err);
    return res.status(500).json({ error: 'seed failed' });
  }
}
