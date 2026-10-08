import {
  listOrders, getOrder, setOrderStatus, ordersByClient, listClients, getClient,
  lastMessages, addMessage, clearUnread, countNewOrders, totalUnread,
} from '../db.js';
import { broadcastTo } from '../wsHub.js';
import { escapeHtml, STATUS_LABELS, statusText, fmtDate, clientLabel } from './text.js';
import {
  mainMenuKeyboard, ordersListKeyboard, orderDetailKeyboard,
  chatsListKeyboard, clientsListKeyboard, clientChatKeyboard, clientDetailKeyboard,
} from './keyboards.js';

const esc = escapeHtml;

async function sendOrEdit(ctx, text, kb) {
  const opts = { parse_mode: 'HTML', reply_markup: kb, disable_web_page_preview: true };
  if (ctx.callbackQuery && ctx.message) {
    try {
      await ctx.editMessageText(text, opts);
      return;
    } catch (err) {
      // «message is not modified» — контент тот же (например, кнопка «Обновить»), это не ошибка
      if (String(err.message).includes('not modified')) return;
      /* иначе (сообщение недоступно для правки) — шлём новое ниже */
    }
  }
  try {
    await ctx.reply(text, opts);
  } catch (err) {
    console.error('[bot] sendOrEdit:', err.message);
  }
}

// ---------- views ----------

export function renderMainMenu() {
  const newOrders = countNewOrders();
  const unread = totalUnread();
  let text = '🎛 <b>Панель m3rzo</b>\n\n';
  text += `📦 Новых заказов: <b>${newOrders}</b>\n`;
  text += `💬 Непрочитанных сообщений: <b>${unread}</b>\n\n`;
  text += 'Выберите раздел:';
  return { text, kb: mainMenuKeyboard() };
}

export function renderOrdersList() {
  const orders = listOrders();
  let text = '📦 <b>Заказы</b>\n\n';
  if (orders.length === 0) {
    text += 'Заказов пока нет.';
  } else {
    text += orders
      .map((o) => `#${o.id} • ${esc(o.project_type)} • ${esc(o.title)} — ${STATUS_LABELS[o.status]}`)
      .join('\n');
  }
  return { text, kb: ordersListKeyboard(orders) };
}

export function renderOrderDetail(order) {
  let text = `🧾 <b>Заказ #${order.id}</b>\n\n`;
  text += `👤 Клиент: <b>${esc(clientLabel(getClient(order.client_id)))}</b>\n`;
  text += `📦 Тип: ${esc(order.project_type)}\n`;
  text += `📝 Тема: ${esc(order.title)}\n\n`;
  text += `${esc(order.description)}\n\n`;
  if (order.budget) text += `💰 Бюджет: ${esc(order.budget)}\n`;
  if (order.deadline) text += `⏳ Срок: ${esc(order.deadline)}\n`;
  if (order.contact) text += `📞 Контакт: ${esc(order.contact)}\n`;
  text += `\nСтатус: ${STATUS_LABELS[order.status]}`;
  text += `\n🕒 ${fmtDate(order.created_at)}`;
  return { text, kb: orderDetailKeyboard(order) };
}

export function renderChatsList() {
  const clients = listClients();
  const rows = [];
  for (const c of clients) {
    const msgs = lastMessages(c.id, 1);
    const preview = msgs.length ? msgs[msgs.length - 1].body : 'нет сообщений';
    if (msgs.length || c.unread_owner) rows.push({ client: c, preview, unread: c.unread_owner });
  }
  let text = '💬 <b>Чаты</b>\n\n';
  if (rows.length === 0) {
    text += 'Активных чатов пока нет.';
  } else {
    text += rows
      .map(({ client, preview, unread }) => {
        const badge = unread ? ` 🔴${unread}` : '';
        return `${esc(clientLabel(client))}${badge}: «${esc(preview.slice(0, 40))}»`;
      })
      .join('\n');
  }
  return { text, kb: chatsListKeyboard(rows) };
}

export function renderClientsList() {
  const clients = listClients();
  let text = '👥 <b>Клиенты</b>\n\n';
  if (clients.length === 0) {
    text += 'Клиентов пока нет.';
  } else {
    text += clients
      .map((c) => `${esc(clientLabel(c))} • id ${c.id}`)
      .join('\n');
  }
  return { text, kb: clientsListKeyboard(clients) };
}

export function renderClientChat(client, { replying }) {
  const msgs = lastMessages(client.id, 12);
  let text = `✉️ <b>Чат с ${esc(clientLabel(client))}</b>\n\n`;
  if (msgs.length === 0) {
    text += '_Сообщений пока нет._\n\n';
  } else {
    for (const m of msgs) {
      const who = m.sender === 'owner' ? '🫵 Вы' : '👤 Клиент';
      text += `${who}: ${esc(m.body)}\n`;
    }
    text += '\n';
  }
  if (replying) {
    text += `▶️ Режим ответов <b>включён</b>. Просто напишите сообщение — оно уйдёт клиенту.`;
  } else {
    text += `Нажмите «✍️ Отвечать этому клиенту», затем пишите сообщения — они уйдут клиенту.`;
  }
  return { text, kb: clientChatKeyboard(client.id, { replying }) };
}

export function renderClientDetail(client) {
  const orders = ordersByClient(client.id);
  const msgs = lastMessages(client.id, 5);
  let text = `👤 <b>${esc(clientLabel(client))}</b> (id ${client.id})\n\n`;
  text += `📦 <b>Заказы:</b>\n`;
  text += orders.length
    ? orders.map((o) => `  #${o.id} ${esc(o.title)} — ${STATUS_LABELS[o.status]}`).join('\n')
    : '  нет';
  text += `\n\n💬 <b>Последние сообщения:</b>\n`;
  text += msgs.length
    ? msgs.map((m) => `  ${m.sender === 'owner' ? 'Вы' : 'Клиент'}: ${esc(m.body.slice(0, 40))}`).join('\n')
    : '  нет';
  return { text, kb: clientDetailKeyboard(client.id) };
}

// ---------- navigation ----------

export async function showMainMenu(ctx) {
  const { text, kb } = renderMainMenu();
  await sendOrEdit(ctx, text, kb);
}

async function show(ctx, view) {
  await sendOrEdit(ctx, view.text, view.kb);
}

/** Роутер callback_query. Владелец уже проверен в bot.js. */
export async function handleCallback(ctx) {
  const data = ctx.callbackQuery?.data ?? '';
  await ctx.answerCallbackQuery();
  const session = ctx.session;

  if (data === 'noop') return;

  if (data === 'm:main') {
    session.view = 'main';
    session.selectedClientId = null;
    return show(ctx, renderMainMenu());
  }

  if (data === 'o:list') {
    session.view = 'orders';
    return show(ctx, renderOrdersList());
  }

  if (data.startsWith('o:open:')) {
    const order = getOrder(Number(data.slice(7)));
    if (!order) return show(ctx, renderOrdersList());
    session.view = 'order';
    session.focusOrderId = order.id;
    return show(ctx, renderOrderDetail(order));
  }

  if (data.startsWith('o:accept:')) return changeOrderStatus(ctx, Number(data.slice(9)), 'accepted');
  if (data.startsWith('o:done:')) return changeOrderStatus(ctx, Number(data.slice(7)), 'done');
  if (data.startsWith('o:reject:')) return changeOrderStatus(ctx, Number(data.slice(10)), 'rejected');

  if (data === 'c:list') {
    session.view = 'chats';
    return show(ctx, renderChatsList());
  }

  if (data.startsWith('c:open:')) {
    const client = getClient(Number(data.slice(7)));
    if (!client) return show(ctx, renderChatsList());
    clearUnread(client.id);
    session.selectedClientId = client.id;
    session.view = 'client';
    return show(ctx, renderClientChat(client, { replying: true }));
  }

  if (data.startsWith('sel:')) {
    const client = getClient(Number(data.slice(4)));
    if (!client) return;
    session.selectedClientId = client.id;
    return show(ctx, renderClientChat(client, { replying: true }));
  }

  if (data === 'stop:reply') {
    session.selectedClientId = null;
    return show(ctx, renderMainMenu());
  }

  if (data === 'cl:list') {
    session.view = 'clients';
    return show(ctx, renderClientsList());
  }

  if (data.startsWith('cl:open:')) {
    const client = getClient(Number(data.slice(8)));
    if (!client) return show(ctx, renderClientsList());
    return show(ctx, renderClientDetail(client));
  }
}

async function changeOrderStatus(ctx, orderId, status) {
  const order = getOrder(orderId);
  if (!order) return show(ctx, renderOrdersList());
  if (order.status === status) return show(ctx, renderOrderDetail(order)); // идемпотентно

  const updated = setOrderStatus(orderId, status);
  broadcastTo(updated.client_id, {
    type: 'order.status',
    order: { id: updated.id, status: updated.status, statusText: statusText(updated.status), updatedAt: updated.updated_at },
  });

  // callback_query уже отвечен в handleCallback — второй ответ вызвал бы ошибку Telegram
  return show(ctx, renderOrderDetail(updated));
}

/** Маршрутизация обычного текста от владельца в выбранный чат. */
export async function handleText(ctx) {
  const session = ctx.session;
  const body = ctx.message.text.trim();

  if (!session.selectedClientId) {
    return ctx.reply('Сначала выберите клиента в разделе «💬 Чаты» или «👥 Клиенты», затем пишите сообщения.');
  }
  const client = getClient(session.selectedClientId);
  if (!client) {
    session.selectedClientId = null;
    return ctx.reply('Клиент не найден. Выберите заново.');
  }

  const message = addMessage(client.id, 'owner', body);
  const sent = broadcastTo(client.id, {
    type: 'chat.message',
    message: { id: message.id, sender: 'owner', body: message.body, createdAt: message.created_at },
  });

  if (sent === 0) {
    // клиент офлайн — сообщаем владельцу, что доставится позже
    await ctx.reply(
      `💤 Клиент сейчас не в сети. Сообщение сохранено и придёт ему при следующем заходе на сайт.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Клиент онлайн: тихое подтверждение реакцией 👍 на сообщение владельца.
  try {
    await ctx.api.setMessageReaction(ctx.chat.id, ctx.message.message_id, {
      reaction: [{ type: 'emoji', emoji: '👍' }],
    });
  } catch {
    /* реакция недоступна (например, не премиум-эмодзи) — не критично */
  }
}
