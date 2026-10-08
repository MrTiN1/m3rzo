const TOKEN_KEY = 'm3rzo_client_token';
const NAME_KEY = 'm3rzo_display_name';

let token = null;

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* приватный режим — работаем без персистентности */
  }
}

export function getToken() {
  if (token) return token;
  token = readStorage(TOKEN_KEY);
  return token;
}

export function getStoredName() {
  return readStorage(NAME_KEY) || '';
}
export function setStoredName(name) {
  writeStorage(NAME_KEY, name);
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['x-client-id'] = token;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Ошибка сервера (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Получает токен: из хранилища или выпускает новый на сервере. */
export async function ensureSession() {
  token = readStorage(TOKEN_KEY);
  if (token) {
    try {
      await request('GET', '/api/me');
      return token;
    } catch (err) {
      if (err.status === 401) token = null; // токен протух/неизвестен — перевыпустим
      else throw err;
    }
  }
  const data = await request('POST', '/api/session');
  token = data.clientId;
  writeStorage(TOKEN_KEY, token);
  return token;
}

export const api = {
  me: () => request('GET', '/api/me'),
  createOrder: (payload) => request('POST', '/api/orders', payload),
  getMessages: (afterId = 0) => request('GET', `/api/messages?afterId=${afterId}`),
  sendMessage: (body, clientMsgId, displayName) =>
    request('POST', '/api/messages', { body, clientMsgId, displayName }),
};
