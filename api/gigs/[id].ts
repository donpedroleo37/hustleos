import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema } from '../../lib/db';
import { nanoid } from 'nanoid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  const { id } = req.query;

  // GET /api/gigs/[id]
  if (req.method === 'GET' && id) {
    const result = await db.execute({
      sql: `
        SELECT g.*,
               COALESCE((SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE gig_id = g.id), 0) as avg_rating,
               (SELECT COUNT(*) FROM reviews WHERE gig_id = g.id) as review_count
        FROM gigs g WHERE g.id = ?
      `,
      args: [id as string],
    });
    if (!result.rows[0]) return res.status(404).json({ error: 'Gig not found' });
    return res.json(result.rows[0]);
  }

  // PUT /api/gigs/[id]
  if (req.method === 'PUT' && id) {
    const { service_name, description, price, delivery_time, status, tags = [] } = req.body;
    await db.execute({
      sql: `UPDATE gigs SET service_name=?, description=?, price=?, delivery_time=?, status=?, tags=? WHERE id=?`,
      args: [service_name, description, price, delivery_time, status, JSON.stringify(tags), id as string],
    });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
