export function aboutView(app) {
  app.replaceChildren();
  const view = document.createElement('div');
  view.className = 'view';

  const title = document.createElement('h2');
  title.className = 'section-title';
  const t1 = document.createElement('span');
  t1.textContent = 'Обо ';
  const t2 = document.createElement('span');
  t2.className = 'iridescent';
  t2.textContent = 'мне';
  title.append(t1, t2);

  const grid = document.createElement('div');
  grid.className = 'about-grid';

  const bio = document.createElement('div');
  bio.className = 'card';
  const paragraphs = [
    'Привет! Я m3rzo — веб-разработчик. Занимаюсь созданием сайтов: от простых лендингов до полноценных интернет-магазинов с личным кабинетом и оплатой.',
    'Мне важно, чтобы сайт не просто красиво выглядел, но и решал задачу: приносил заявки, продавал, рассказывал о деле. Поэтому я вникаю в суть проекта, а не делаю «как у всех».',
    'Работаю напрямую, без посредников: ты общаешься со мной через чат на сайте или в Telegram, а я держу в курсе на каждом этапе — от идеи до запуска.',
  ];
  for (const p of paragraphs) {
    const el = document.createElement('p');
    el.textContent = p;
    bio.appendChild(el);
  }

  const stackCard = document.createElement('div');
  stackCard.className = 'card';
  const stackTitle = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = 'С чем работаю:';
  stackTitle.appendChild(strong);
  const skills = document.createElement('div');
  skills.className = 'skills';
  for (const s of ['HTML / CSS', 'JavaScript', 'Node.js', 'React', 'Адаптивная вёрстка', 'Анимации', 'Telegram-боты', 'Оптимизация']) {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.textContent = s;
    skills.appendChild(tag);
  }
  stackCard.append(stackTitle, skills);

  const contact = document.createElement('div');
  contact.className = 'card';
  const cTitle = document.createElement('p');
  const cStrong = document.createElement('strong');
  cStrong.textContent = 'Как связаться:';
  cTitle.appendChild(cStrong);
  const cText = document.createElement('p');
  cText.textContent = 'Напиши в чат на сайте (кнопка справа внизу) или оставь заявку во вкладке «Сделать заказ» — я отвечу в Telegram. Также я доступен напрямую: @m3rzo';
  contact.append(cTitle, cText);

  grid.append(bio, stackCard, contact);
  view.append(title, grid);
  app.appendChild(view);
}
