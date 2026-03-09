import { createClient, Client } from '@libsql/client';

let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    if (!process.env.TURSO_DATABASE_URL) throw new Error('Missing TURSO_DATABASE_URL');
    if (!process.env.TURSO_AUTH_TOKEN) throw new Error('Missing TURSO_AUTH_TOKEN');
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  const db = getDb();
  const statements = [
    \CREATE TABLE IF NOT EXISTS user_profile (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT DEFAULT 'Hustler', bio TEXT DEFAULT 'Professional Freelancer', total_earned REAL DEFAULT 0, profile_image TEXT, theme TEXT DEFAULT 'dark')\,
    \CREATE TABLE IF NOT EXISTS gigs (id TEXT PRIMARY KEY, service_name TEXT NOT NULL, description TEXT NOT NULL, price REAL NOT NULL, delivery_time TEXT NOT NULL, status TEXT DEFAULT 'active', tags TEXT DEFAULT '[]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)\,
    \CREATE TABLE IF NOT EXISTS hired_gigs (id TEXT PRIMARY KEY, gig_id TEXT NOT NULL, service_name TEXT NOT NULL, description TEXT NOT NULL, price REAL NOT NULL, delivery_time TEXT NOT NULL, client_name TEXT DEFAULT 'Anonymous Client', renewal_status TEXT DEFAULT 'none', hired_at DATETIME DEFAULT CURRENT_TIMESTAMP)\,
    \CREATE TABLE IF NOT EXISTS contract_requests (id TEXT PRIMARY KEY, gig_id TEXT NOT NULL, hired_gig_id TEXT, type TEXT NOT NULL, client_name TEXT DEFAULT 'Anonymous Client', status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)\,
    \CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, gig_id TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT, client_name TEXT DEFAULT 'Anonymous Client', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)\,
    \CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER DEFAULT 0, data TEXT DEFAULT '{}', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)\,
    \INSERT OR IGNORE INTO user_profile (id, name, bio, total_earned) VALUES (1, 'Alex Hustle', 'High-end digital solutions for modern brands.', 0)\,
  ];
  for (const sql of statements) { await db.execute(sql); }
  schemaReady = true;
}

export async function createNotification(type: string, title: string, message: string, data: object = {}) {
  const { nanoid } = await import('nanoid');
  const db = getDb();
  await db.execute({ sql: \INSERT INTO notifications (id, type, title, message, data) VALUES (?, ?, ?, ?, ?)\, args: [nanoid(), type, title, message, JSON.stringify(data)] });
}

export const db = new Proxy({} as Client, { get(_target, prop) { return (getDb() as any)[prop]; } });
