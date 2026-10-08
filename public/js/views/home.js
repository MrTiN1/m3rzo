import { makeCursorReactive } from '../fx/cursorText.js';

export function homeView(app) {
  app.replaceChildren();
  const view = document.createElement('div');
  view.className = 'view';

  const hero = document.createElement('section');
  hero.className = 'hero';

  const kicker = document.createElement('span');
  kicker.className = 'hero-kicker';
  kicker.textContent = 'Веб-разработка под ключ';

  const h1 = document.createElement('h1');
  const line1 = document.createElement('span');
  line1.textContent = 'Привет, я ';
  const line2 = document.createElement('span');
  line2.className = 'iridescent';
  line2.textContent = 'm3rzo';
  h1.append(line1, document.createElement('br'), line2);

  const sub = document.createElement('p');
  sub.className = 'hero-sub';
  sub.textContent =
    'Создаю современные сайты: от лендингов до интернет-магазинов. Быстро, красиво и с душой. Расскажи о своей идее — воплотим её вместе.';

  const actions = document.createElement('div');
  actions.className = 'hero-actions';
  const orderBtn = document.createElement('a');
  orderBtn.className = 'btn btn-primary';
  orderBtn.href = '#/order';
  orderBtn.textContent = 'Сделать заказ';
  const aboutBtn = document.createElement('a');
  aboutBtn.className = 'btn btn-ghost';
  aboutBtn.href = '#/about';
  aboutBtn.textContent = 'Обо мне';
  actions.append(orderBtn, aboutBtn);

  hero.append(kicker, h1, sub, actions);

  const features = document.createElement('section');
  features.className = 'features';
  const cards = [
    { icon: '⚡', title: 'Быстро', text: 'Сжатые сроки без потери качества. Первый результат — уже через несколько дней.' },
    { icon: '🎨', title: 'Красиво', text: 'Продуманный дизайн, плавные анимации и современный вид, который цепляет.' },
    { icon: '🛠️', title: 'Надёжно', text: 'Чистый код, адаптив под все устройства и поддержка после запуска.' },
  ];
  for (const c of cards) {
    const card = document.createElement('div');
    card.className = 'feature-card';
    const icon = document.createElement('div');
    icon.className = 'icon';
    icon.textContent = c.icon;
    const title = document.createElement('h3');
    title.textContent = c.title;
    const text = document.createElement('p');
    text.textContent = c.text;
    card.append(icon, title, text);
    features.appendChild(card);
  }

  view.append(hero, features);
  app.appendChild(view);

  // Буквы «m3rzo» реагируют на курсор.
  makeCursorReactive(line2);
}
