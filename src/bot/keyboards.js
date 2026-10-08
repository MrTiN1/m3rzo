import { InlineKeyboard } from 'grammy';
import { countNewOrders, totalUnread } from '../db.js';

export function mainMenuKeyboard() {
  const kb = new InlineKeyboard();
  const newOrders = countNewOrders();
  const unread = totalUnread();
  kb.text(`📦 Заказы${newOrders ? ` (${newOrders} новых)` : ''}`, 'o:list').row();
  kb.text(`💬 Чаты${unread ? ` (${unread})` : ''}`, 'c:list').row();
  kb.text('👥 Клиенты', 'cl:list').text('🔄 Обновить', 'm:main');
  return kb;
}

export function ordersListKeyboard(orders) {
  const kb = new InlineKeyboard();
  if (orders.length === 0) {
    kb.text('Заказов пока нет', 'noop').row();
  }
  for (const o of orders) {
    const emoji = { new: '🆕', accepted: '🟢', done: '✅', rejected: '❌' }[o.status] ?? '';
    kb.text(`#${o.id} ${o.project_type} — ${emoji}`, `o:open:${o.id}`).row();
  }
  kb.text('⬅ Назад', 'm:main');
  return kb;
}

export function orderDetailKeyboard(order) {
  const kb = new InlineKeyboard();
  if (order.status === 'new') {
    kb.text('✅ Взяться', `o:accept:${order.id}`).text('❌ Отклонить', `o:reject:${order.id}`).row();
  } else if (order.status === 'accepted') {
    kb.text('🏁 Отметить готово', `o:done:${order.id}`).row();
  }
  kb.text('💬 Чат клиента', `c:open:${order.client_id}`).text('⬅ Назад', 'o:list');
  return kb;
}

export function chatsListKeyboard(clients) {
  const kb = new InlineKeyboard();
  if (clients.length === 0) {
    kb.text('Чатов пока нет', 'noop').row();
  }
  for (const { client, preview, unread } of clients) {
    const name = client.display_name || `Клиент #${client.id}`;
    const badge = unread ? ` (${unread})` : '';
    const short = (preview || '').slice(0, 30);
    kb.text(`💬 ${name}${badge} — «${short}»`, `c:open:${client.id}`).row();
  }
  kb.text('⬅ Назад', 'm:main');
  return kb;
}

export function clientsListKeyboard(clients) {
  const kb = new InlineKeyboard();
  if (clients.length === 0) {
    kb.text('Клиентов пока нет', 'noop').row();
  }
  for (const c of clients) {
    const name = c.display_name || `Клиент #${c.id}`;
    kb.text(`👤 ${name}`, `cl:open:${c.id}`).row();
  }
  kb.text('⬅ Назад', 'm:main');
  return kb;
}

export function clientChatKeyboard(clientId, { replying }) {
  const kb = new InlineKeyboard();
  if (replying) {
    kb.text('⏹ Остановить ответы', 'stop:reply').row();
  } else {
    kb.text('✍️ Отвечать этому клиенту', `sel:${clientId}`).row();
  }
  kb.text('📦 Заказы клиента', `cl:open:${clientId}`).text('⬅ Назад', 'c:list');
  return kb;
}

export function clientDetailKeyboard(clientId) {
  const kb = new InlineKeyboard();
  kb.text('💬 Открыть чат', `c:open:${clientId}`).row();
  kb.text('⬅ Назад', 'cl:list');
  return kb;
}

export function openChatKeyboard(clientId) {
  const kb = new InlineKeyboard();
  kb.text('💬 Открыть чат', `c:open:${clientId}`).row();
  return kb;
}

export function backToOrderKeyboard(orderId) {
  const kb = new InlineKeyboard();
  kb.text('⬅ Назад к заказу', `o:open:${orderId}`);
  return kb;
}
