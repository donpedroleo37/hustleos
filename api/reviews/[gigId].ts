import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema, createNotification } from '../../lib/db';
import { nanoid } from 'nanoid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();
  const { gigId } = req.query;

  if (req.method === 'GET') {
    const result = await db.execute({
      sql: 'SELECT * FROM reviews WHERE gig_id=? ORDER BY created_at DESC',
      args: [gigId as string],
    });
    return res.json(result.rows);
  }

  if (req.method === 'POST') {
    const { rating, comment, client_name } = req.body;
    const id = nanoid();
    await db.execute({
      sql: `INSERT INTO reviews (id, gig_id, rating, comment, client_name) VALUES (?, ?, ?, ?, ?)`,
      args: [id, gigId as string, rating, comment, client_name || 'Anonymous Client'],
    });
    const gigResult = await db.execute({ sql: 'SELECT service_name FROM gigs WHERE id=?', args: [gigId as string] });
    const gig = gigResult.rows[0];
    await createNotification('new_review', `New ${rating}★ Review`,
      `${client_name || 'A client'} reviewed "${gig?.service_name}": "${comment?.slice(0, 60)}"`,
      { gigId });
    return res.status(201).json({ success: true, id });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
