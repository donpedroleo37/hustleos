import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type } = req.query;

  if (type === 'gigs.csv') {
    const result = await db.execute(`
      SELECT g.service_name, g.description, g.price, g.delivery_time, g.status, g.tags, g.created_at,
             COALESCE((SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE gig_id=g.id),0) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE gig_id=g.id) as review_count
      FROM gigs g ORDER BY g.created_at DESC
    `);
    const header = 'Service Name,Description,Price,Delivery,Status,Tags,Created,Avg Rating,Reviews\n';
    const rows = result.rows.map((g: any) => {
      const tags = JSON.parse((g.tags as string) || '[]').join(';');
      return [
        `"${g.service_name}"`, `"${(g.description || '').replace(/"/g, '""')}"`,
        g.price, `"${g.delivery_time}"`, g.status, `"${tags}"`, g.created_at,
        Number(g.avg_rating).toFixed(1), g.review_count,
      ].join(',');
    }).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hustleos-gigs.csv"');
    return res.send(header + rows);
  }

  if (type === 'earnings.csv') {
    const result = await db.execute(
      `SELECT service_name, client_name, price, delivery_time, renewal_status, hired_at FROM hired_gigs ORDER BY hired_at DESC`
    );
    const header = 'Service,Client,Amount,Delivery,Renewal Status,Hired At\n';
    const rows = result.rows.map((h: any) =>
      [`"${h.service_name}"`, `"${h.client_name}"`, h.price, `"${h.delivery_time}"`, h.renewal_status, h.hired_at].join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hustleos-earnings.csv"');
    return res.send(header + rows);
  }

  res.status(404).json({ error: 'Unknown export type' });
}
