import { api, getStoredName, setStoredName } from '../api.js';
import { state, subscribe, addPendingMessage, resolvePending, setMyName } from '../state.js';
import { toast } from './toast.js';

const widget = document.getElementById('chat-widget');
const toggleBtn = document.getElementById('chat-toggle');
const panel = document.getElementById('chat-panel');
const closeBtn = document.getElementById('chat-close');
const messagesEl = document.getElementById('chat-messages');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const statusLine = document.getElementById('chat-status-line');
const unreadDot = document.getElementById('chat-unread-dot');

let open = false;
let unread = 0;
let renderedCount = -1;

function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function renderMessages() {
  if (renderedCount === state.messages.length) return; // ничего не изменилось
  renderedCount = state.messages.length;

  messagesEl.replaceChildren();

  if (state.messages.length === 0) {
    const sys = document.createElement('div');
    sys.className = 'chat-system';
    sys.textContent = 'Напишите первым — m3rzo отвечает здесь же 👋';
    messagesEl.appendChild(sys);
  }

  for (const m of state.messages) {
    const el = document.createElement('div');
    el.className = `chat-msg ${m.sender}${m.pending ? ' pending' : ''}`;
    const body = document.createElement('span');
    body.textContent = m.body;
    const time = document.createElement('span');
    time.className = 'msg-time';
    time.textContent = m.pending ? '…' : fmtTime(m.createdAt);
    el.append(body, time);
    messagesEl.appendChild(el);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderStatusLine() {
  if (!state.wsConnected) {
    statusLine.textContent = 'Переподключение...';
    statusLine.classList.add('ws-down');
  } else {
    const active = state.orders.find((o) => o.status === 'accepted');
    if (active) {
      statusLine.textContent = '🟢 Ваш заказ в работе';
    } else {
      statusLine.textContent = 'Напишите мне — отвечаю быстро';
    }
    statusLine.classList.remove('ws-down');
  }
}

function refresh() {
  renderMessages();
  renderStatusLine();
}

subscribe(refresh);

function setOpen(value) {
  open = value;
  panel.hidden = !value;
  if (value) {
    unread = 0;
    unreadDot.hidden = true;
    renderedCount = -1;
    renderMessages();
    input.focus();
  }
}

toggleBtn.addEventListener('click', () => setOpen(!open));
closeBtn.addEventListener('click', () => setOpen(false));

// Уведомление о новых сообщениях владельца, когда панель закрыта.
let knownOwnerMsgs = 0;
let firstEmit = true;
subscribe(() => {
  const ownerCount = state.messages.filter((m) => m.sender === 'owner').length;
  if (firstEmit) {
    // первичная загрузка истории — не уведомляем о старых сообщениях
    firstEmit = false;
    knownOwnerMsgs = ownerCount;
    return;
  }
  if (ownerCount > knownOwnerMsgs) {
    const newest = [...state.messages].reverse().find((m) => m.sender === 'owner');
    if (newest) {
      if (!open) {
        unread++;
        unreadDot.hidden = false;
      }
      toast(`💬 m3rzo: ${newest.body.slice(0, 60)}`);
    }
  }
  knownOwnerMsgs = ownerCount;
});

async function ensureName() {
  let name = state.me?.displayName || getStoredName();
  if (name) return name;
  name = window.prompt('Как к вам обращаться? (имя или @telegram)');
  if (name && name.trim()) {
    name = name.trim().slice(0, 80);
    setStoredName(name);
    setMyName(name);
    return name;
  }
  return null;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const body = input.value.trim();
  if (!body) return;

  const name = await ensureName();
  if (!name) {
    toast('Укажите имя, чтобы продолжить переписку');
    return;
  }

  input.value = '';
  const clientMsgId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  addPendingMessage(clientMsgId, body);

  try {
    const data = await api.sendMessage(body, clientMsgId, name);
    resolvePending(clientMsgId, data.message);
  } catch (err) {
    resolvePending(clientMsgId, null);
    toast(err.message || 'Не удалось отправить сообщение');
    input.value = body;
  }
});
