import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM hired_gigs ORDER BY hired_at DESC');
    return res.json(result.rows);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
