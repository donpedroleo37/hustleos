import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema, createNotification } from '../../lib/db';
import { nanoid } from 'nanoid';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  const { action } = req.query;
  // Routes:
  //   GET  /api/contracts/requests         → list pending requests
  //   POST /api/contracts/request/[gigId]  → create request   (action = 'request', gigId in body)
  //   POST /api/contracts/respond/[id]     → respond          (action = 'respond', id in body)

  // GET pending requests
  if (req.method === 'GET' && action === 'requests') {
    const result = await db.execute(`
      SELECT r.*, g.service_name, g.price
      FROM contract_requests r JOIN gigs g ON r.gig_id = g.id
      WHERE r.status = 'pending' ORDER BY r.created_at DESC
    `);
    return res.json(result.rows);
  }

  // POST create contract request
  if (req.method === 'POST' && !action) {
    const gigId = (req.query.gigId as string) || req.body.gigId;
    const { type, client_name, hired_gig_id } = req.body;

    if (type === 'renewal') {
      const check = hired_gig_id
        ? await db.execute({ sql: `SELECT id FROM contract_requests WHERE gig_id=? AND type='renewal' AND status='pending' AND hired_gig_id=?`, args: [gigId, hired_gig_id] })
        : await db.execute({ sql: `SELECT id FROM contract_requests WHERE gig_id=? AND type='renewal' AND status='pending'`, args: [gigId] });
      if (check.rows.length > 0) return res.status(400).json({ error: 'Renewal already pending' });
      if (hired_gig_id) {
        await db.execute({ sql: `UPDATE hired_gigs SET renewal_status='pending' WHERE id=?`, args: [hired_gig_id] });
      }
    }

    const gigResult = await db.execute({ sql: 'SELECT service_name FROM gigs WHERE id=?', args: [gigId] });
    const gig = gigResult.rows[0];
    const id = nanoid();
    await db.execute({
      sql: `INSERT INTO contract_requests (id, gig_id, type, client_name, hired_gig_id) VALUES (?, ?, ?, ?, ?)`,
      args: [id, gigId, type || 'initial', client_name || 'Anonymous Client', hired_gig_id || null],
    });
    await createNotification(
      type === 'renewal' ? 'renewal_request' : 'contract_request',
      type === 'renewal' ? 'Renewal Request' : 'New Contract Request',
      `${client_name || 'A client'} ${type === 'renewal' ? 'wants to renew' : 'requested'} "${gig?.service_name}"`,
      { requestId: id, gigId }
    );
    return res.status(201).json({ success: true, id });
  }

  // POST respond to contract
  if (req.method === 'POST' && action === 'respond') {
    const { requestId, status } = req.body;
    const reqResult = await db.execute({ sql: 'SELECT * FROM contract_requests WHERE id=?', args: [requestId] });
    const request = reqResult.rows[0];
    if (!request) return res.status(404).json({ error: 'Not found' });

    await db.execute({ sql: 'UPDATE contract_requests SET status=? WHERE id=?', args: [status, requestId] });

    if (request.type === 'renewal' && request.hired_gig_id) {
      await db.execute({
        sql: 'UPDATE hired_gigs SET renewal_status=? WHERE id=?',
        args: [status === 'accepted' ? 'accepted' : 'rejected', request.hired_gig_id],
      });
    }

    const gigResult = await db.execute({ sql: 'SELECT * FROM gigs WHERE id=?', args: [request.gig_id as string] });
    const gig = gigResult.rows[0];

    if (status === 'accepted' && gig) {
      const hireId = nanoid();
      await db.execute({
        sql: `INSERT INTO hired_gigs (id, gig_id, service_name, description, price, delivery_time, client_name, renewal_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'none')`,
        args: [hireId, gig.id, gig.service_name, gig.description, gig.price, gig.delivery_time, request.client_name],
      });
      await db.execute({ sql: 'UPDATE user_profile SET total_earned = total_earned + ? WHERE id=1', args: [gig.price] });
      await createNotification('contract_accepted', 'Contract Accepted! 🎉',
        `Contract for "${gig.service_name}" accepted — $${gig.price} earned`, { gigId: gig.id });
    } else if (gig) {
      await createNotification('contract_declined', 'Contract Declined',
        `You declined the request for "${gig.service_name}"`, { gigId: gig.id });
    }

    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
