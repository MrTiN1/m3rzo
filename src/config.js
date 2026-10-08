import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  console.error('[config] Файл .env не найден. Скопируйте .env.example в .env и заполните BOT_TOKEN.');
  process.exit(1);
}

const BOT_TOKEN = process.env.BOT_TOKEN?.trim();
if (!BOT_TOKEN || !/^\d+:[\w-]+$/.test(BOT_TOKEN)) {
  console.error('[config] BOT_TOKEN не задан или некорректен в .env');
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 3000;

export const config = { ROOT, BOT_TOKEN, PORT };
