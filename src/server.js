import http from 'node:http';
import path from 'node:path';
import express from 'express';

import { config } from './config.js';
import { closeDb } from './db.js';
import { attachWs } from './wsHub.js';
import { apiRouter } from './routes/api.js';
import { createBot, setupBotCommands } from './bot/bot.js';

const ROOT = config.ROOT;
const publicDir = path.join(ROOT, 'public');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static(publicDir));
app.use('/api', apiRouter);

// JSON-ошибка парсера тела → 400, а не падение.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON' });
  }
  console.error('[http]', err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const server = http.createServer(app);
const { closeAll } = attachWs(server);

const bot = createBot();

let shuttingDown = false;
async function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[server] Завершение работы (${reason})...`);

  const force = setTimeout(() => {
    console.error('[server] Принудительный выход по таймауту');
    process.exit(1);
  }, 5000);
  force.unref();

  try {
    await bot.stop();
  } catch (err) {
    console.error('[server] bot.stop:', err.message);
  }
  try {
    closeAll();
  } catch (err) {
    console.error('[server] ws closeAll:', err.message);
  }
  await new Promise((resolve) => server.close(resolve));
  try {
    closeDb();
  } catch {
    /* ignore */
  }

  console.log('[server] Завершено.');
  clearTimeout(force);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGBREAK', () => shutdown('SIGBREAK'));
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err);
});

async function main() {
  server.listen(config.PORT, () => {
    console.log(`[server] Сайт: http://localhost:${config.PORT}`);
  });
  await setupBotCommands(bot);
  await bot.start({
    onStart: (info) => console.log(`[bot] Поллинг запущен для @${info.username}`),
  });
}

main().catch((err) => {
  console.error('[server] Критическая ошибка запуска:', err);
  process.exit(1);
});
