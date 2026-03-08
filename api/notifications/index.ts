import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();
  const { action } = req.query;

  // GET /api/notifications/index  → list all
  if (req.method === 'GET' && !action) {
    const result = await db.execute('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    return res.json(result.rows);
  }

  // GET /api/notifications/index?action=unread-count
  if (req.method === 'GET' && action === 'unread-count') {
    const result = await db.execute("SELECT COUNT(*) as count FROM notifications WHERE read=0");
    return res.json({ count: result.rows[0]?.count ?? 0 });
  }

  // POST /api/notifications/index?action=read-all
  if (req.method === 'POST' && action === 'read-all') {
    await db.execute("UPDATE notifications SET read=1");
    return res.json({ success: true });
  }

  // POST /api/notifications/index?action=read&id=xxx
  if (req.method === 'POST' && action === 'read') {
    const { id } = req.query;
    await db.execute({ sql: "UPDATE notifications SET read=1 WHERE id=?", args: [id as string] });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
