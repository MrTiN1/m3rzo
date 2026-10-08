export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const STATUS_LABELS = {
  new: '🆕 Новый',
  accepted: '🟢 В работе',
  done: '✅ Готово',
  rejected: '❌ Отклонён',
};

// Короткий текст статуса для сайта (без эмодзи — бейдж сам добавит).
export const STATUS_TEXT = {
  new: 'Новый — ожидает подтверждения',
  accepted: 'В работе',
  done: 'Готово',
  rejected: 'Отклонён',
};

export function statusText(status) {
  return STATUS_TEXT[status] ?? status;
}

export function fmtDate(ms) {
  return new Date(ms).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function clientLabel(client) {
  return client?.display_name || `Клиент #${client?.id ?? '?'}`;
}
