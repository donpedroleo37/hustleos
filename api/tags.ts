import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT tags FROM gigs');
    const tagSet = new Set<string>();
    result.rows.forEach(row => {
      try { JSON.parse((row.tags as string) || '[]').forEach((t: string) => tagSet.add(t)); } catch {}
    });
    return res.json(Array.from(tagSet).sort());
  }

  res.status(405).json({ error: 'Method not allowed' });
}
