const BADGE_CLASS = {
  new: 'status-new',
  accepted: 'status-accepted',
  done: 'status-done',
  rejected: 'status-rejected',
};

/**
 * Пилюля статуса заказа.
 * Возвращает {el, setStatus(order)} — setStatus обновляет содержимое с анимацией.
 */
export function createStatusBadge(order) {
  const el = document.createElement('div');
  let current = null;

  function setStatus(o) {
    if (!o) return;
    const changed = current && current.status !== o.status;
    current = o;
    el.className = `status-badge ${BADGE_CLASS[o.status] ?? 'status-new'}`;
    el.replaceChildren();
    const dot = document.createElement('span');
    dot.className = 'dot';
    const label = document.createElement('span');
    label.textContent = o.statusText ?? o.status;
    el.append(dot, label);
    if (changed) {
      el.classList.remove('status-updated');
      void el.offsetWidth; // перезапуск анимации
      el.classList.add('status-updated');
    }
  }

  setStatus(order);
  return { el, setStatus };
}
