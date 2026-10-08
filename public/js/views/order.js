import { api, getStoredName, setStoredName } from '../api.js';
import { state, subscribe, updateOrder, setMyName, emit } from '../state.js';
import { createStatusBadge } from '../components/statusBadge.js';
import { toast } from '../components/toast.js';

const PROJECT_TYPES = ['Лендинг', 'Корпоративный сайт', 'Интернет-магазин', 'Портфолио', 'Другое'];

function field(labelText, required, inputEl, hint) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const label = document.createElement('label');
  label.textContent = labelText;
  if (required) {
    const req = document.createElement('span');
    req.className = 'req';
    req.textContent = ' *';
    label.appendChild(req);
  }
  label.appendChild(document.createTextNode(''));
  wrap.append(label, inputEl);
  if (hint) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = hint;
    wrap.appendChild(h);
  }
  inputEl.id = `f-${inputEl.name}`;
  label.setAttribute('for', inputEl.id);
  return wrap;
}

function renderStatusColumn(statusCard, orders) {
  statusCard.replaceChildren();
  const h3 = document.createElement('h3');
  h3.textContent = 'Мои заказы';
  statusCard.appendChild(h3);

  if (!orders.length) {
    const empty = document.createElement('div');
    empty.className = 'status-empty';
    empty.textContent =
      'У вас пока нет заказов. Заполните анкету — заявка мгновенно появится у меня в Telegram, и я сразу отреагирую. Статус заказа будет виден здесь.';
    statusCard.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'status-list';
  for (const o of orders) {
    const item = document.createElement('div');
    const badge = createStatusBadge(o);
    const titleEl = document.createElement('div');
    titleEl.className = 'status-order-title';
    titleEl.textContent = `#${o.id} • ${o.projectType ? o.projectType + ' • ' : ''}${o.title}`;
    item.append(badge.el, titleEl);
    list.appendChild(item);
  }
  statusCard.appendChild(list);
}

export function orderView(app) {
  app.replaceChildren();
  const view = document.createElement('div');
  view.className = 'view';

  const title = document.createElement('h2');
  title.className = 'section-title';
  const t1 = document.createElement('span');
  t1.textContent = 'Сделать ';
  const t2 = document.createElement('span');
  t2.className = 'iridescent';
  t2.textContent = 'заказ';
  title.append(t1, t2);

  const sub = document.createElement('p');
  sub.className = 'hero-sub';
  sub.style.textAlign = 'left';
  sub.style.margin = '0 0 24px';
  sub.textContent = 'Заполните анкету — заявка сразу придёт мне в Telegram, и я отвечу в чате на сайте. Статус заказа обновляется в реальном времени.';

  const layout = document.createElement('div');
  layout.className = 'order-layout';

  // --- form card ---
  const formCard = document.createElement('div');
  formCard.className = 'card';
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.noValidate = true;

  const typeSelect = document.createElement('select');
  typeSelect.name = 'projectType';
  for (const t of PROJECT_TYPES) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  }

  const titleInput = document.createElement('input');
  titleInput.name = 'title';
  titleInput.type = 'text';
  titleInput.maxLength = 120;
  titleInput.placeholder = 'Например: сайт для кофейни';

  const descInput = document.createElement('textarea');
  descInput.name = 'description';
  descInput.maxLength = 4000;
  descInput.placeholder = 'Расскажите, какой сайт нужен, какие страницы и функции важны...';

  const nameInput = document.createElement('input');
  nameInput.name = 'displayName';
  nameInput.type = 'text';
  nameInput.maxLength = 80;
  nameInput.placeholder = 'Имя или @telegram';
  nameInput.value = state.me?.displayName || getStoredName();

  const contactInput = document.createElement('input');
  contactInput.name = 'contact';
  contactInput.type = 'text';
  contactInput.maxLength = 120;
  contactInput.placeholder = '@telegram, email или телефон';

  const budgetInput = document.createElement('input');
  budgetInput.name = 'budget';
  budgetInput.type = 'text';
  budgetInput.maxLength = 80;
  budgetInput.placeholder = 'Например: до 30 000 ₽';

  const deadlineInput = document.createElement('input');
  deadlineInput.name = 'deadline';
  deadlineInput.type = 'text';
  deadlineInput.maxLength = 80;
  deadlineInput.placeholder = 'Например: 2 недели';

  const row1 = document.createElement('div');
  row1.className = 'form-row';
  row1.append(field('Имя / Telegram', true, nameInput), field('Контакт для связи', true, contactInput));

  const row2 = document.createElement('div');
  row2.className = 'form-row';
  row2.append(field('Бюджет', false, budgetInput, 'Необязательно'), field('Желаемый срок', false, deadlineInput, 'Необязательно'));

  const errorBox = document.createElement('div');
  errorBox.className = 'form-error';

  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn btn-primary';
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Отправить заявку';

  form.append(
    field('Тип сайта', true, typeSelect),
    field('Название / тема проекта', true, titleInput),
    field('Описание задачи', true, descInput, 'Чем подробнее — тем точнее оценка'),
    row1,
    row2,
    errorBox,
    submitBtn
  );

  formCard.appendChild(form);

  // --- status card ---
  const statusCard = document.createElement('div');
  statusCard.className = 'card order-status-card';
  renderStatusColumn(statusCard, state.orders);

  const unsubs = [subscribe(() => renderStatusColumn(statusCard, state.orders))];

  layout.append(formCard, statusCard);
  view.append(title, sub, layout);
  app.appendChild(view);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errorBox.classList.remove('visible');

    const payload = {
      projectType: typeSelect.value,
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      displayName: nameInput.value.trim(),
      contact: contactInput.value.trim(),
      budget: budgetInput.value.trim(),
      deadline: deadlineInput.value.trim(),
    };

    const errors = [];
    if (!payload.title) errors.push('Укажите название/тему проекта');
    if (payload.description.length < 10) errors.push('Опишите задачу подробнее (минимум 10 символов)');
    if (!payload.displayName) errors.push('Укажите имя или Telegram');
    if (!payload.contact) errors.push('Укажите контакт для связи');
    if (errors.length) {
      errorBox.textContent = errors.join('. ');
      errorBox.classList.add('visible');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';
    try {
      const data = await api.createOrder(payload);
      setStoredName(payload.displayName);
      setMyName(payload.displayName);
      updateOrder({ ...data.order });
      emit();

      // экран успеха
      formCard.replaceChildren();
      const ok = document.createElement('div');
      const icon = document.createElement('div');
      icon.className = 'success-icon';
      icon.textContent = '🚀';
      const h = document.createElement('h3');
      h.className = 'section-title';
      h.style.fontSize = '1.4rem';
      h.textContent = 'Заявка отправлена!';
      const p = document.createElement('p');
      p.style.color = 'var(--muted)';
      p.style.marginTop = '8px';
      p.textContent =
        'Она уже у меня в Telegram. Как только я возьмусь за работу — статус справа изменится на «В работе», и вы получите сообщение в чате. Оставайтесь на странице — обновления приходят в реальном времени.';
      const badgeWrap = document.createElement('div');
      badgeWrap.style.marginTop = '18px';
      const badge = createStatusBadge(data.order);
      badgeWrap.appendChild(badge.el);
      unsubs.push(
        subscribe(() => {
          const fresh = state.orders.find((o) => o.id === data.order.id);
          if (fresh) badge.setStatus(fresh);
        })
      );
      ok.append(icon, h, p, badgeWrap);
      formCard.appendChild(ok);

      toast('✅ Заявка отправлена! Ждите ответа в чате.');
    } catch (err) {
      errorBox.textContent = err.message || 'Не удалось отправить заявку. Попробуйте ещё раз.';
      errorBox.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    }
  });

  view.addEventListener('view:leave', () => {
    for (const unsub of unsubs) unsub();
  });
}
