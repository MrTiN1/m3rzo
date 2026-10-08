import { Bot, session, GrammyError, HttpError } from 'grammy';
import { config } from '../config.js';
import { getOwnerId, setOwnerId } from '../db.js';
import { setBot } from './notify.js';
import { showMainMenu, handleCallback, handleText } from './handlers.js';

export function createBot() {
  const bot = new Bot(config.BOT_TOKEN);

  bot.use(
    session({
      initial: () => ({ view: 'main', selectedClientId: null, focusOrderId: null }),
    })
  );

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`[bot] Ошибка при обработке update ${ctx.update.update_id}:`, err.error);
    if (err.error instanceof GrammyError) {
      console.error('[bot] GrammyError:', err.error.message);
    } else if (err.error instanceof HttpError) {
      console.error('[bot] HttpError:', err.error.message);
    }
  });

  // Проверка владельца: авто-захват по первому /start.
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    let ownerId = getOwnerId();
    if (ownerId === null) {
      if (ctx.message?.text?.startsWith('/start')) {
        setOwnerId(userId);
        ownerId = userId;
        await ctx.reply(
          '✅ Ты зарегистрирован как <b>владелец панели</b>.\n\nТеперь тебе сюда будут приходить заказы и сообщения клиентов с сайта.',
          { parse_mode: 'HTML' }
        );
      } else {
        return; // до регистрации владельца любые другие апдейты игнорируем
      }
    }

    if (userId !== ownerId) return; // не владелец — молча игнорируем
    await next();
  });

  bot.command('start', showMainMenu);
  bot.command('menu', showMainMenu);
  bot.command('stop', async (ctx) => {
    ctx.session.selectedClientId = null;
    await ctx.reply('Режим ответов выключен. Выбери клиента заново в разделе «💬 Чаты».');
  });

  bot.on('callback_query', handleCallback);
  bot.on('message:text', handleText);

  setBot(bot);
  return bot;
}

export async function setupBotCommands(bot) {
  try {
    await bot.api.setMyCommands([
      { command: 'start', description: 'Главное меню' },
      { command: 'menu', description: 'Главное меню' },
      { command: 'stop', description: 'Выключить режим ответов' },
    ]);
  } catch (err) {
    console.error('[bot] setMyCommands:', err.message);
  }
}
