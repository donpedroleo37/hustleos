import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [profile, monthlyRevenue, topGigs, contractStats, reviewStats, gigStats] = await Promise.all([
    db.execute('SELECT total_earned FROM user_profile WHERE id=1'),
    db.execute(`
      SELECT strftime('%Y-%m', hired_at) as month, SUM(price) as revenue, COUNT(*) as contracts
      FROM hired_gigs WHERE hired_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', hired_at) ORDER BY month ASC
    `),
    db.execute(`
      SELECT g.service_name, g.id, COUNT(h.id) as total_contracts,
             COALESCE(SUM(h.price), 0) as total_revenue,
             COALESCE(AVG(CAST(r.rating AS REAL)), 0) as avg_rating
      FROM gigs g
      LEFT JOIN hired_gigs h ON h.gig_id = g.id
      LEFT JOIN reviews r ON r.gig_id = g.id
      GROUP BY g.id ORDER BY total_revenue DESC LIMIT 5
    `),
    db.execute(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status='declined' THEN 1 ELSE 0 END) as declined,
        SUM(CASE WHEN status='pending'  THEN 1 ELSE 0 END) as pending
      FROM contract_requests
    `),
    db.execute(`SELECT COUNT(*) as total, AVG(CAST(rating AS REAL)) as avg_rating FROM reviews`),
    db.execute(`SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM gigs`),
  ]);

  res.json({
    totalEarned:    (profile.rows[0] as any)?.total_earned ?? 0,
    monthlyRevenue: monthlyRevenue.rows,
    topGigs:        topGigs.rows,
    contractStats:  contractStats.rows[0],
    reviewStats:    reviewStats.rows[0],
    gigStats:       gigStats.rows[0],
  });
}
