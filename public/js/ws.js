import { getToken } from './api.js';

const handlers = new Map(); // type -> Set<fn>
let ws = null;
let retryDelay = 1000;
let closedByUs = false;
let connected = false;

const statusListeners = new Set();

function emitStatus() {
  for (const fn of statusListeners) {
    try {
      fn(connected);
    } catch {
      /* ignore */
    }
  }
}

export function onWsStatus(fn) {
  statusListeners.add(fn);
  fn(connected);
}

export function onFrame(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
}

function dispatch(frame) {
  const set = handlers.get(frame.type);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(frame);
    } catch (err) {
      console.error('[ws] handler error:', err);
    }
  }
}

function connect() {
  const token = getToken();
  if (!token) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws?clientId=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    connected = true;
    retryDelay = 1000;
    emitStatus();
    dispatch({ type: 'ws:open' });
  };

  ws.onmessage = (ev) => {
    let frame;
    try {
      frame = JSON.parse(ev.data);
    } catch {
      return;
    }
    dispatch(frame);
  };

  ws.onclose = () => {
    connected = false;
    emitStatus();
    if (!closedByUs) {
      setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 1.7, 30000);
    }
  };

  ws.onerror = () => {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  };
}

export function startWs() {
  closedByUs = false;
  connect();

  // keepalive ping каждые 25с
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 25000);

  window.addEventListener('online', () => {
    if (!connected) {
      retryDelay = 1000;
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      connect();
    }
  });
}
