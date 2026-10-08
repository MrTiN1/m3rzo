import crypto from 'node:crypto';

export function newToken() {
  return crypto.randomUUID();
}
