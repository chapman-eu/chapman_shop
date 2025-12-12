import { redis } from '../lib/redis.js';

export default async function handler(req, res) {
  await redis.hset('promo:NEW10', {
    type: 'percent',
    value: 10,
    remaining: 5
  });

  await redis.hset('promo:MINUS5', {
    type: 'fixed',
    value: 5,
    remaining: 10
  });

  res.json({ ok: true });
}
