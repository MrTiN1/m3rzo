/**
 * Красное пятно-прожектор, следующее за курсором.
 * Дёшево: обновляем только CSS-переменные на overlay-элементе.
 */
export function initSpotlight() {
  const el = document.getElementById('spotlight');
  if (!el) return;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;
  let raf = null;

  function tick() {
    // плавное следование с инерцией
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;
    el.style.setProperty('--mx', `${cx}px`);
    el.style.setProperty('--my', `${cy}px`);
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener(
    'mousemove',
    (ev) => {
      mx = ev.clientX;
      my = ev.clientY;
    },
    { passive: true }
  );

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      raf = requestAnimationFrame(tick);
    }
  });

  raf = requestAnimationFrame(tick);
}
