import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM user_profile WHERE id = 1');
    return res.json(result.rows[0] ?? {});
  }

  if (req.method === 'POST') {
    const { bio, profile_image, name, theme } = req.body;

    if (profile_image && profile_image.length > 2_800_000) {
      return res.status(400).json({ error: 'Image too large. Please use an image under 2MB.' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    if (bio !== undefined)           { updates.push('bio = ?');           values.push(bio); }
    if (name !== undefined)          { updates.push('name = ?');          values.push(name); }
    if (profile_image !== undefined) { updates.push('profile_image = ?'); values.push(profile_image); }
    if (theme !== undefined)         { updates.push('theme = ?');         values.push(theme); }

    if (updates.length > 0) {
      values.push(1);
      await db.execute({ sql: `UPDATE user_profile SET ${updates.join(', ')} WHERE id = ?`, args: values });
    }
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
