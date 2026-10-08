import { getOwnerId, getClient } from '../db.js';
import { escapeHtml, clientLabel, fmtDate } from './text.js';
import { orderDetailKeyboard, openChatKeyboard } from './keyboards.js';

let botRef = null;
export function setBot(bot) {
  botRef = bot;
}

async function toOwner(text, keyboard) {
  const ownerId = getOwnerId();
  if (!botRef || ownerId === null) return; // владелец ещё не нажал /start — данные не теряются, они в БД
  try {
    await botRef.api.sendMessage(ownerId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('[notify] Не удалось отправить сообщение владельцу:', err.message);
  }
}

export function notifyNewOrder(order) {
  const client = getClient(order.client_id);
  const text =
    `🛎 <b>Новый заказ #${order.id}</b>\n\n` +
    `👤 Клиент: <b>${escapeHtml(clientLabel(client))}</b>\n` +
    `📦 Тип: ${escapeHtml(order.project_type)}\n` +
    `📝 Тема: ${escapeHtml(order.title)}\n\n` +
    `${escapeHtml(order.description)}\n\n` +
    (order.budget ? `💰 Бюджет: ${escapeHtml(order.budget)}\n` : '') +
    (order.deadline ? `⏳ Срок: ${escapeHtml(order.deadline)}\n` : '') +
    (order.contact ? `📞 Контакт: ${escapeHtml(order.contact)}\n` : '') +
    `\n🕒 ${fmtDate(order.created_at)}`;
  return toOwner(text, orderDetailKeyboard(order));
}

export function notifyClientMessage(message, { firstMessage }) {
  const client = getClient(message.client_id);
  const label = clientLabel(client);
  const head = firstMessage
    ? `🆕 <b>Новый клиент</b> ${escapeHtml(label)} написал:`
    : `💬 <b>${escapeHtml(label)}</b> написал:`;
  const text = `${head}\n\n«${escapeHtml(message.body)}»`;
  return toOwner(text, openChatKeyboard(message.client_id));
}

export function notifyNewClientRegistered(client) {
  // Тихо логируем — отдельный пуш не нужен, чтобы не спамить; первый контакт придёт через notifyClientMessage.
  console.log(`[notify] Новый клиент #${client.id}`);
}
