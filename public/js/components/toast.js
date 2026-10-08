const root = document.getElementById('toast-root');

export function toast(text, duration = 4200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}
