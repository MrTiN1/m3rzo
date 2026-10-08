import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';

const dataDir = path.join(config.ROOT, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'site.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    token         TEXT    NOT NULL UNIQUE,
    display_name  TEXT,
    created_at    INTEGER NOT NULL,
    last_seen_at  INTEGER NOT NULL,
    unread_owner  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status        TEXT    NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','accepted','done','rejected')),
    project_type  TEXT    NOT NULL,
    title         TEXT    NOT NULL,
    description   TEXT    NOT NULL,
    budget        TEXT,
    deadline      TEXT,
    contact       TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sender      TEXT    NOT NULL CHECK (sender IN ('client','owner')),
    body        TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    delivered   INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_messages_client ON messages(client_id, id);
  CREATE INDEX IF NOT EXISTS idx_orders_client   ON orders(client_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
`);

// --- prepared statements ---
const st = {
  getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
  setMeta: db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ),
  insertClient: db.prepare(
    'INSERT INTO clients (token, display_name, created_at, last_seen_at) VALUES (?, NULL, ?, ?)'
  ),
  clientByToken: db.prepare('SELECT * FROM clients WHERE token = ?'),
  clientById: db.prepare('SELECT * FROM clients WHERE id = ?'),
  touchClient: db.prepare('UPDATE clients SET last_seen_at = ? WHERE id = ?'),
  setClientName: db.prepare('UPDATE clients SET display_name = ? WHERE id = ?'),
  bumpUnread: db.prepare('UPDATE clients SET unread_owner = unread_owner + 1 WHERE id = ?'),
  clearUnread: db.prepare('UPDATE clients SET unread_owner = 0 WHERE id = ?'),
  listClients: db.prepare('SELECT * FROM clients ORDER BY last_seen_at DESC LIMIT 50'),

  insertOrder: db.prepare(
    `INSERT INTO orders (client_id, project_type, title, description, budget, deadline, contact, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  orderById: db.prepare(
    `SELECT o.*, c.display_name AS client_name FROM orders o
     JOIN clients c ON c.id = o.client_id WHERE o.id = ?`
  ),
  ordersByClient: db.prepare(
    `SELECT o.*, c.display_name AS client_name FROM orders o
     JOIN clients c ON c.id = o.client_id WHERE o.client_id = ? ORDER BY o.id DESC LIMIT 20`
  ),
  listOrders: db.prepare(
    `SELECT o.*, c.display_name AS client_name FROM orders o
     JOIN clients c ON c.id = o.client_id ORDER BY o.id DESC LIMIT 50`
  ),
  setOrderStatus: db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'),
  countOrdersByStatus: db.prepare('SELECT COUNT(*) AS n FROM orders WHERE status = ?'),

  insertMessage: db.prepare(
    'INSERT INTO messages (client_id, sender, body, created_at) VALUES (?, ?, ?, ?)'
  ),
  messageById: db.prepare('SELECT * FROM messages WHERE id = ?'),
  listMessages: db.prepare(
    'SELECT * FROM messages WHERE client_id = ? AND id > ? ORDER BY id ASC LIMIT ?'
  ),
  lastMessages: db.prepare(
    'SELECT * FROM (SELECT * FROM messages WHERE client_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC'
  ),
  markDelivered: db.prepare('UPDATE messages SET delivered = 1 WHERE id = ?'),
  totalUnread: db.prepare('SELECT COALESCE(SUM(unread_owner), 0) AS n FROM clients'),
};

const now = () => Date.now();

// --- helpers ---
export function getOwnerId() {
  const row = st.getMeta.get('owner_id');
  return row ? Number(row.value) : null;
}

export function setOwnerId(id) {
  st.setMeta.run('owner_id', String(id));
}

export function createClient(token) {
  const t = now();
  const res = st.insertClient.run(token, t, t);
  return { id: Number(res.lastInsertRowid), token, display_name: null, created_at: t, last_seen_at: t, unread_owner: 0 };
}

export function getClientByToken(token) {
  return st.clientByToken.get(token) ?? null;
}

export function getClient(id) {
  return st.clientById.get(id) ?? null;
}

export function touchClient(id) {
  st.touchClient.run(now(), id);
}

export function updateClientName(id, name) {
  const current = st.clientById.get(id);
  if (current && !current.display_name) st.setClientName.run(name, id);
}

export function bumpUnread(id) {
  st.bumpUnread.run(id);
}

export function clearUnread(id) {
  st.clearUnread.run(id);
}

export function totalUnread() {
  return Number(st.totalUnread.get().n);
}

export function listClients() {
  return st.listClients.all();
}

export function createOrder({ clientId, projectType, title, description, budget, deadline, contact }) {
  const t = now();
  const res = st.insertOrder.run(clientId, projectType, title, description, budget ?? null, deadline ?? null, contact ?? null, t, t);
  return getOrder(Number(res.lastInsertRowid));
}

export function getOrder(id) {
  return st.orderById.get(id) ?? null;
}

export function ordersByClient(clientId) {
  return st.ordersByClient.all(clientId);
}

export function listOrders() {
  return st.listOrders.all();
}

export function countNewOrders() {
  return Number(st.countOrdersByStatus.get('new').n);
}

export function setOrderStatus(id, status) {
  st.setOrderStatus.run(status, now(), id);
  return getOrder(id);
}

export function addMessage(clientId, sender, body) {
  const t = now();
  const res = st.insertMessage.run(clientId, sender, body, t);
  return st.messageById.get(Number(res.lastInsertRowid));
}

export function listMessages(clientId, afterId = 0, limit = 200) {
  return st.listMessages.all(clientId, afterId, Math.min(limit, 500));
}

export function lastMessages(clientId, limit = 10) {
  return st.lastMessages.all(clientId, limit);
}

export function markDelivered(id) {
  st.markDelivered.run(id);
}

export function closeDb() {
  db.close();
}
