import { WebSocketServer } from 'ws';
import { getClientByToken } from './db.js';

// clientId (int) -> Set<WebSocket>
const hub = new Map();

function safeSend(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    try {
      ws.send(JSON.stringify(obj));
    } catch {
      /* ignore */
    }
  }
}

export function broadcastTo(clientId, frame) {
  const set = hub.get(clientId);
  if (!set) return 0;
  let sent = 0;
  for (const ws of set) {
    safeSend(ws, frame);
    sent++;
  }
  return sent;
}

/**
 * Привязывает ws-сервер к http-серверу. Аутентификация по ?clientId=<token>
 * выполняется ДО завершения handshake.
 */
export function attachWs(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const token = url.searchParams.get('clientId');
    const client = token ? getClientByToken(token) : null;
    if (!client) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, client);
    });
  });

  wss.on('connection', (ws, req, client) => {
    const clientId = client.id;
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    let set = hub.get(clientId);
    if (!set) {
      set = new Set();
      hub.set(clientId, set);
    }
    set.add(ws);

    safeSend(ws, { type: 'hello', clientId, serverTime: Date.now() });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg && msg.type === 'ping') safeSend(ws, { type: 'pong' });
    });

    const remove = () => {
      const s = hub.get(clientId);
      if (s) {
        s.delete(ws);
        if (s.size === 0) hub.delete(clientId);
      }
    };
    ws.on('close', remove);
    ws.on('error', remove);
  });

  // heartbeat: пингуем каждые 30с, терминируем мёртвые сокеты
  const interval = setInterval(() => {
    for (const set of hub.values()) {
      for (const ws of set) {
        if (ws.isAlive === false) {
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        try {
          ws.ping();
        } catch {
          ws.terminate();
        }
      }
    }
  }, 30000);
  interval.unref?.();

  function closeAll() {
    clearInterval(interval);
    for (const set of hub.values()) for (const ws of set) {
      try {
        ws.close(1001, 'server shutdown');
      } catch {
        /* ignore */
      }
    }
    hub.clear();
    wss.close();
  }

  return { wss, closeAll };
}
