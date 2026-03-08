import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('hustle.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT DEFAULT 'Hustler',
    bio TEXT DEFAULT 'Professional Freelancer',
    total_earned REAL DEFAULT 0,
    profile_image TEXT,
    theme TEXT DEFAULT 'dark'
  );

  CREATE TABLE IF NOT EXISTS gigs (
    id TEXT PRIMARY KEY,
    service_name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    delivery_time TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hired_gigs (
    id TEXT PRIMARY KEY,
    gig_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    delivery_time TEXT NOT NULL,
    client_name TEXT DEFAULT 'Anonymous Client',
    renewal_status TEXT DEFAULT 'none',
    hired_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contract_requests (
    id TEXT PRIMARY KEY,
    gig_id TEXT NOT NULL,
    hired_gig_id TEXT,
    type TEXT NOT NULL,
    client_name TEXT DEFAULT 'Anonymous Client',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    gig_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    client_name TEXT DEFAULT 'Anonymous Client',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO user_profile (id, name, bio, total_earned, theme)
  VALUES (1, 'Alex Hustle', 'High-end digital solutions for modern brands.', 0, 'dark');
`);

const migrations = [
  "ALTER TABLE user_profile ADD COLUMN profile_image TEXT",
  "ALTER TABLE user_profile ADD COLUMN theme TEXT DEFAULT 'dark'",
  "ALTER TABLE hired_gigs ADD COLUMN renewal_status TEXT DEFAULT 'none'",
  "ALTER TABLE hired_gigs ADD COLUMN client_name TEXT DEFAULT 'Anonymous Client'",
  "ALTER TABLE contract_requests ADD COLUMN hired_gig_id TEXT",
  "ALTER TABLE contract_requests ADD COLUMN client_name TEXT DEFAULT 'Anonymous Client'",
  "ALTER TABLE gigs ADD COLUMN status TEXT DEFAULT 'active'",
  "ALTER TABLE gigs ADD COLUMN tags TEXT DEFAULT '[]'",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) {}
}

function createNotification(type, title, message, metadata = {}) {
  db.prepare(`INSERT INTO notifications (id, type, title, message, metadata) VALUES (?, ?, ?, ?, ?)`)
    .run(nanoid(), type, title, message, JSON.stringify(metadata));
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json({ limit: '10mb' }));

  // Profile
  app.get('/api/profile', (req, res) => {
    res.json(db.prepare('SELECT * FROM user_profile WHERE id = 1').get());
  });

  app.post('/api/profile', (req, res) => {
    const { bio, profile_image, name, theme } = req.body;
    if (profile_image && profile_image.length > 7_000_000)
      return res.status(400).json({ error: 'Image too large. Max 5MB.' });
    const fields = [];
    const vals = [];
    if (bio !== undefined)           { fields.push('bio = ?');           vals.push(bio); }
    if (profile_image !== undefined) { fields.push('profile_image = ?'); vals.push(profile_image); }
    if (name !== undefined)          { fields.push('name = ?');          vals.push(name); }
    if (theme !== undefined)         { fields.push('theme = ?');         vals.push(theme); }
    if (fields.length > 0)
      db.prepare(`UPDATE user_profile SET ${fields.join(', ')} WHERE id = 1`).run(...vals);
    res.json({ success: true });
  });

  // Gigs
  app.get('/api/gigs', (req, res) => {
    const { tag, search, minPrice, maxPrice, sortBy, sortOrder } = req.query;
    let q = `
      SELECT g.*,
             ROUND((SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE gig_id = g.id), 1) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE gig_id = g.id) as review_count
      FROM gigs g WHERE 1=1`;
    const p = [];
    if (search) { q += ` AND (LOWER(g.service_name) LIKE ? OR LOWER(g.description) LIKE ?)`; p.push(`%${String(search).toLowerCase()}%`, `%${String(search).toLowerCase()}%`); }
    if (minPrice) { q += ` AND g.price >= ?`; p.push(parseFloat(String(minPrice))); }
    if (maxPrice) { q += ` AND g.price <= ?`; p.push(parseFloat(String(maxPrice))); }
    if (tag) { q += ` AND g.tags LIKE ?`; p.push(`%"${tag}"%`); }
    const validSort = ['created_at','price','avg_rating'];
    const col = validSort.includes(String(sortBy)) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    q += ` ORDER BY g.${col} ${order}`;
    res.json(db.prepare(q).all(...p));
  });

  app.get('/api/gigs/:id', (req, res) => {
    const gig = db.prepare(`
      SELECT g.*, ROUND((SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE gig_id = g.id),1) as avg_rating,
             (SELECT COUNT(*) FROM reviews WHERE gig_id = g.id) as review_count
      FROM gigs g WHERE g.id = ?`).get(req.params.id);
    if (!gig) return res.status(404).json({ error: 'Not found' });
    res.json(gig);
  });

  app.post('/api/gigs', (req, res) => {
    const { service_name, description, price, delivery_time, tags = [] } = req.body;
    const id = nanoid();
    db.prepare(`INSERT INTO gigs (id, service_name, description, price, delivery_time, status, tags) VALUES (?, ?, ?, ?, ?, 'active', ?)`)
      .run(id, service_name, description, price, delivery_time, JSON.stringify(tags));
    res.status(201).json({ success: true, id });
  });

  app.put('/api/gigs/:id', (req, res) => {
    const { service_name, description, price, delivery_time, status, tags = [] } = req.body;
    db.prepare(`UPDATE gigs SET service_name=?, description=?, price=?, delivery_time=?, status=?, tags=? WHERE id=?`)
      .run(service_name, description, price, delivery_time, status, JSON.stringify(tags), req.params.id);
    res.json({ success: true });
  });

  // Tags
  app.get('/api/tags', (req, res) => {
    const rows = db.prepare('SELECT tags FROM gigs').all();
    const tagSet = new Set();
    for (const { tags } of rows) { try { JSON.parse(tags).forEach(t => tagSet.add(t)); } catch(_){} }
    res.json(Array.from(tagSet).sort());
  });

  // Hired
  app.get('/api/hired', (req, res) => {
    res.json(db.prepare('SELECT * FROM hired_gigs ORDER BY hired_at DESC').all());
  });

  // Contract requests
  app.get('/api/contracts/requests', (req, res) => {
    res.json(db.prepare(`
      SELECT r.*, g.service_name, g.price FROM contract_requests r
      JOIN gigs g ON r.gig_id = g.id WHERE r.status = 'pending' ORDER BY r.created_at DESC`).all());
  });

  app.post('/api/contracts/request/:id', (req, res) => {
    const { type, client_name, hired_gig_id } = req.body;
    if (type === 'renewal') {
      const existing = db.prepare(`SELECT id FROM contract_requests WHERE gig_id = ? AND type = 'renewal' AND status = 'pending'${hired_gig_id ? ' AND hired_gig_id = ?' : ''}`)
        .get(...(hired_gig_id ? [req.params.id, hired_gig_id] : [req.params.id]));
      if (existing) return res.status(400).json({ error: 'Renewal already pending' });
      if (hired_gig_id) db.prepare(`UPDATE hired_gigs SET renewal_status = 'pending' WHERE id = ?`).run(hired_gig_id);
    }
    const id = nanoid();
    db.prepare(`INSERT INTO contract_requests (id, gig_id, type, client_name, hired_gig_id) VALUES (?, ?, ?, ?, ?)`)
      .run(id, req.params.id, type || 'initial', client_name || 'Anonymous Client', hired_gig_id || null);
    const gig = db.prepare('SELECT service_name FROM gigs WHERE id = ?').get(req.params.id);
    const svc = gig?.service_name ?? 'a service';
    const isRenewal = type === 'renewal';
    createNotification(isRenewal ? 'renewal_request' : 'contract_request',
      isRenewal ? 'Contract Renewal Request' : 'New Contract Request',
      `${client_name || 'Someone'} wants to ${isRenewal ? 'renew' : 'hire'} "${svc}"`,
      { gig_id: req.params.id, request_id: id });
    res.status(201).json({ success: true, id });
  });

  app.post('/api/contracts/respond/:id', (req, res) => {
    const { status } = req.body;
    const request = db.prepare('SELECT * FROM contract_requests WHERE id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE contract_requests SET status = ? WHERE id = ?').run(status, req.params.id);
    if (request.type === 'renewal' && request.hired_gig_id) {
      db.prepare('UPDATE hired_gigs SET renewal_status = ? WHERE id = ?')
        .run(status === 'accepted' ? 'accepted' : 'rejected', request.hired_gig_id);
    }
    const gig = db.prepare('SELECT * FROM gigs WHERE id = ?').get(request.gig_id);
    if (status === 'accepted' && gig) {
      const hireId = nanoid();
      db.prepare(`INSERT INTO hired_gigs (id, gig_id, service_name, description, price, delivery_time, client_name, renewal_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'none')`)
        .run(hireId, gig.id, gig.service_name, gig.description, gig.price, gig.delivery_time, request.client_name);
      db.prepare('UPDATE user_profile SET total_earned = total_earned + ? WHERE id = 1').run(gig.price);
      createNotification('contract_accepted', 'Contract Accepted! 🎉',
        `"${gig.service_name}" with ${request.client_name} is now active.`, { gig_id: gig.id });
    }
    res.json({ success: true });
  });

  // Reviews
  app.get('/api/reviews/:gigId', (req, res) => {
    res.json(db.prepare('SELECT * FROM reviews WHERE gig_id = ? ORDER BY created_at DESC').all(req.params.gigId));
  });

  app.post('/api/reviews/:gigId', (req, res) => {
    const { rating, comment, client_name } = req.body;
    const id = nanoid();
    db.prepare(`INSERT INTO reviews (id, gig_id, rating, comment, client_name) VALUES (?, ?, ?, ?, ?)`)
      .run(id, req.params.gigId, rating, comment, client_name || 'Anonymous Client');
    const gig = db.prepare('SELECT service_name FROM gigs WHERE id = ?').get(req.params.gigId);
    if (gig) createNotification('new_review', 'New Review ⭐',
      `${client_name || 'A client'} left ${rating} stars for "${gig.service_name}"`, { gig_id: req.params.gigId });
    res.status(201).json({ success: true, id });
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
    const { count } = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE read = 0').get();
    res.json({ notifications, unread: count });
  });

  app.post('/api/notifications/read', (req, res) => {
    const { ids } = req.body;
    if (ids?.length > 0) {
      db.prepare(`UPDATE notifications SET read = 1 WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
    } else {
      db.prepare('UPDATE notifications SET read = 1').run();
    }
    res.json({ success: true });
  });

  app.delete('/api/notifications/:id', (req, res) => {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Analytics
  app.get('/api/analytics', (req, res) => {
    const { total_earned } = db.prepare('SELECT total_earned FROM user_profile WHERE id = 1').get();
    const { c: totalGigs } = db.prepare('SELECT COUNT(*) as c FROM gigs').get();
    const { c: activeGigs } = db.prepare("SELECT COUNT(*) as c FROM gigs WHERE status='active'").get();
    const { c: totalContracts } = db.prepare('SELECT COUNT(*) as c FROM hired_gigs').get();
    const { r: avgRating } = db.prepare('SELECT ROUND(AVG(CAST(rating AS REAL)),1) as r FROM reviews').get();
    const { c: totalReviews } = db.prepare('SELECT COUNT(*) as c FROM reviews').get();

    const monthlyEarnings = db.prepare(`
      SELECT strftime('%Y-%m', hired_at) as month, SUM(price) as earnings, COUNT(*) as contracts
      FROM hired_gigs WHERE hired_at >= date('now', '-12 months')
      GROUP BY month ORDER BY month ASC`).all();

    const topGigs = db.prepare(`
      SELECT g.service_name, g.price, COUNT(h.id) as hires, COALESCE(SUM(h.price),0) as revenue,
             ROUND((SELECT AVG(CAST(r.rating AS REAL)) FROM reviews r WHERE r.gig_id = g.id),1) as avg_rating
      FROM gigs g LEFT JOIN hired_gigs h ON h.gig_id = g.id
      GROUP BY g.id ORDER BY revenue DESC LIMIT 5`).all();

    const ratingDist = db.prepare('SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating ORDER BY rating DESC').all();
    const contractBreakdown = db.prepare('SELECT renewal_status, COUNT(*) as count FROM hired_gigs GROUP BY renewal_status').all();

    res.json({
      summary: { totalEarned: total_earned, totalGigs, activeGigs, totalContracts, avgRating, totalReviews },
      monthlyEarnings, topGigs, ratingDist, contractBreakdown,
    });
  });

  // Export
  app.get('/api/export/gigs.csv', (req, res) => {
    const gigs = db.prepare('SELECT * FROM gigs ORDER BY created_at DESC').all();
    const headers = ['id','service_name','description','price','delivery_time','status','tags','created_at'];
    const escape = v => { const s = String(v ?? '').replace(/"/g,'""'); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s; };
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hustleos-gigs.csv"');
    res.send([headers.join(','), ...gigs.map(g => headers.map(h => escape(g[h])).join(','))].join('\n'));
  });

  app.get('/api/export/earnings.csv', (req, res) => {
    const hired = db.prepare('SELECT * FROM hired_gigs ORDER BY hired_at DESC').all();
    const headers = ['id','service_name','client_name','price','delivery_time','renewal_status','hired_at'];
    const escape = v => { const s = String(v ?? '').replace(/"/g,'""'); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s; };
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hustleos-earnings.csv"');
    res.send([headers.join(','), ...hired.map(h => headers.map(k => escape(h[k])).join(','))].join('\n'));
  });

  // Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`HustleOS running on http://localhost:${PORT}`));
}

startServer();
