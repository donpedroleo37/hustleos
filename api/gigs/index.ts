import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema } from '../../lib/db';
import { nanoid } from 'nanoid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  // GET /api/gigs/index
  if (req.method === 'GET') {
    const { tag, search, minPrice, maxPrice, sortBy, sortOrder, status } = req.query;

    let sql = `
      SELECT g.*,
             COALESCE((SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE gig_id = g.id), 0) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE gig_id = g.id) as review_count
      FROM gigs g WHERE 1=1
    `;
    const args: any[] = [];

    if (search)   { sql += ` AND (g.service_name LIKE ? OR g.description LIKE ?)`; args.push(`%${search}%`, `%${search}%`); }
    if (minPrice) { sql += ` AND g.price >= ?`; args.push(parseFloat(minPrice as string)); }
    if (maxPrice) { sql += ` AND g.price <= ?`; args.push(parseFloat(maxPrice as string)); }
    if (status)   { sql += ` AND g.status = ?`; args.push(status); }
    if (tag)      { sql += ` AND g.tags LIKE ?`; args.push(`%"${tag}"%`); }

    const validSort: Record<string, string> = { price: 'g.price', created_at: 'g.created_at', rating: 'avg_rating' };
    const sortCol = validSort[sortBy as string] || 'g.created_at';
    sql += ` ORDER BY ${sortCol} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;

    const result = await db.execute({ sql, args });
    return res.json(result.rows);
  }

  // POST /api/gigs/index
  if (req.method === 'POST') {
    const { service_name, description, price, delivery_time, tags = [] } = req.body;
    const id = nanoid();
    await db.execute({
      sql: `INSERT INTO gigs (id, service_name, description, price, delivery_time, status, tags) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      args: [id, service_name, description, price, delivery_time, JSON.stringify(tags)],
    });
    return res.status(201).json({ success: true, id });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
