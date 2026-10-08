import { api } from './api.js';
import { onFrame, onWsStatus, startWs } from './ws.js';

export const state = {
  me: null, // {id, displayName}
  orders: [],
  messages: [], // {id, sender, body, createdAt, pending?}
  wsConnected: false,
};

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emit() {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      console.error('[state] listener error:', err);
    }
  }
}

function lastSeenId() {
  let max = 0;
  for (const m of state.messages) if (!m.pending && m.id > max) max = m.id;
  return max;
}

export async function resyncMe() {
  const data = await api.me();
  state.me = data.client;
  state.orders = data.orders;
}

export async function resyncMessages() {
  const data = await api.getMessages(lastSeenId());
  for (const m of data.messages) appendMessage(m);
}

function appendMessage(m) {
  if (state.messages.some((x) => x.id === m.id)) return false;
  state.messages.push(m);
  state.messages.sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? 1 : -1; // pending-внизу
    return (a.id ?? 0) - (b.id ?? 0);
  });
  return true;
}

export function addPendingMessage(clientMsgId, body) {
  state.messages.push({
    id: null,
    pending: true,
    clientMsgId,
    sender: 'client',
    body,
    createdAt: Date.now(),
  });
  emit();
}

export function resolvePending(clientMsgId, realMessage) {
  const idx = state.messages.findIndex((m) => m.pending && m.clientMsgId === clientMsgId);
  if (idx >= 0) state.messages.splice(idx, 1);
  if (realMessage) appendMessage(realMessage);
  emit();
}

export function updateOrder(orderInfo) {
  const idx = state.orders.findIndex((o) => o.id === orderInfo.id);
  if (idx >= 0) state.orders[idx] = { ...state.orders[idx], ...orderInfo };
  else state.orders.unshift({ ...orderInfo, title: `Заказ #${orderInfo.id}`, projectType: '' });
}

export function setMyName(name) {
  if (state.me) state.me.displayName = name;
  emit();
}

let started = false;

export function initState() {
  if (started) return;
  started = true;

  onFrame('ws:open', async () => {
    try {
      await resyncMe();
      await resyncMessages();
      emit();
    } catch (err) {
      console.error('[state] resync failed:', err);
    }
  });

  onFrame('order.status', (frame) => {
    updateOrder(frame.order);
    emit();
  });

  onFrame('chat.message', (frame) => {
    if (appendMessage(frame.message)) emit();
  });

  onWsStatus((ok) => {
    state.wsConnected = ok;
    emit();
  });

  startWs();
}

export async function bootState() {
  await resyncMe();
  await resyncMessages();
  initState();
  emit();
}
