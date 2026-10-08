// Ограничение длины и trim для строковых полей.
export function str(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

// Простой in-memory token bucket per clientId.
const buckets = new Map();

export function rateLimit(key, maxTokens, refillPerSec) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: maxTokens, ts: now };
    buckets.set(key, b);
  }
  const elapsed = (now - b.ts) / 1000;
  b.tokens = Math.min(maxTokens, b.tokens + elapsed * refillPerSec);
  b.ts = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}

// Периодическая очистка старых бакетов, чтобы Map не рос бесконечно.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now - b.ts > 5 * 60 * 1000) buckets.delete(k);
  }
}, 60 * 1000).unref?.();
