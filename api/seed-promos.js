import { redis } from '../lib/redis';

export default async function handler(req, res) {
  try {
    const promos = {
      NEW: { type: 'percent', value: 10, limit: 9999 },
      NEWYEAR22: { type: 'percent', value: 20, limit: 50 }
    };

    for (const code in promos) {
      await redis.set(`promo:${code}`, promos[code].limit);
      await redis.set(
        `promo_meta:${code}`,
        JSON.stringify({
          type: promos[code].type,
          value: promos[code].value
        })
      );
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'seed failed' });
  }
}
