import { Router } from 'express';
import {
  createClient, getClientByToken, touchClient, updateClientName,
  createOrder, ordersByClient, listMessages, addMessage, bumpUnread,
} from '../db.js';
import { broadcastTo } from '../wsHub.js';
import { newToken } from '../util/ids.js';
import { str, rateLimit } from '../util/validate.js';
import { statusText } from '../bot/text.js';
import { notifyNewOrder, notifyClientMessage, notifyNewClientRegistered } from '../bot/notify.js';

export const apiRouter = Router();

// POST /api/session — выпустить новый токен (первый визит).
apiRouter.post('/session', (req, res) => {
  const token = newToken();
  const client = createClient(token);
  notifyNewClientRegistered(client);
  res.json({ clientId: token });
});

// Middleware: резолвит x-client-id (токен) в клиента.
function auth(req, res, next) {
  const token = req.get('x-client-id');
  if (!token) return res.status(401).json({ error: 'missing x-client-id' });
  const client = getClientByToken(token);
  if (!client) return res.status(401).json({ error: 'unknown token' });
  touchClient(client.id);
  req.client = client;
  next();
}

function orderDto(o) {
  return {
    id: o.id,
    status: o.status,
    statusText: statusText(o.status),
    projectType: o.project_type,
    title: o.title,
    updatedAt: o.updated_at,
    createdAt: o.created_at,
  };
}

// GET /api/me — профиль клиента, его заказы, непрочитанные.
apiRouter.get('/me', auth, (req, res) => {
  const orders = ordersByClient(req.client.id).map(orderDto);
  res.json({
    client: { id: req.client.id, displayName: req.client.display_name },
    orders,
  });
});

// POST /api/orders — новая заявка.
apiRouter.post('/orders', auth, (req, res) => {
  if (!rateLimit(`orders:${req.client.id}`, 5, 5 / 60)) {
    return res.status(429).json({ error: 'Слишком много заявок. Попробуйте позже.' });
  }

  const b = req.body ?? {};
  const projectType = str(b.projectType, 60);
  const title = str(b.title, 120);
  const description = str(b.description, 4000);
  const contact = str(b.contact, 120);
  const displayName = str(b.displayName, 80);

  const errors = [];
  if (!projectType) errors.push('Укажите тип сайта');
  if (!title) errors.push('Укажите название/тему');
  if (!description || description.length < 10) errors.push('Опишите задачу (минимум 10 символов)');
  if (!displayName) errors.push('Укажите имя или Telegram');
  if (!contact) errors.push('Укажите контакт для связи');
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  updateClientName(req.client.id, displayName);

  const order = createOrder({
    clientId: req.client.id,
    projectType,
    title,
    description,
    budget: str(b.budget, 80) || null,
    deadline: str(b.deadline, 80) || null,
    contact,
  });

  notifyNewOrder(order);
  res.status(201).json({ order: orderDto(order) });
});

// GET /api/messages — история чата (по возрастанию id).
apiRouter.get('/messages', auth, (req, res) => {
  const afterId = Number(req.query.afterId) || 0;
  const limit = Number(req.query.limit) || 100;
  const messages = listMessages(req.client.id, afterId, limit).map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    createdAt: m.created_at,
  }));
  res.json({ messages });
});

// POST /api/messages — сообщение клиента владельцу.
apiRouter.post('/messages', auth, (req, res) => {
  if (!rateLimit(`msgs:${req.client.id}`, 10, 1)) {
    return res.status(429).json({ error: 'Слишком часто. Подождите немного.' });
  }

  const b = req.body ?? {};
  const body = str(b.body, 4000);
  if (!body) return res.status(400).json({ error: 'Пустое сообщение' });

  // Клиент мог указать имя прямо в чате (первое сообщение формата "Имя: ..." не используем —
  // имя приходит из формы заказа или отдельным полем).
  const displayName = str(b.displayName, 80);
  if (displayName) updateClientName(req.client.id, displayName);

  const isFirst = !req.client.display_name && !displayName &&
    listMessages(req.client.id, 0, 1).length === 0;

  const message = addMessage(req.client.id, 'client', body);
  bumpUnread(req.client.id);

  notifyClientMessage(message, { firstMessage: isFirst });

  res.status(201).json({
    message: { id: message.id, sender: 'client', body: message.body, createdAt: message.created_at },
    clientMsgId: b.clientMsgId ?? null,
  });
});
