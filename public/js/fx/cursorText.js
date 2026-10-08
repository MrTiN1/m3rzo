/**
 * Превращает текст элемента в отдельные буквы (span), которые реагируют
 * на курсор: nearby-буквы приподнимаются, наклоняются и светятся красным.
 */
export function makeCursorReactive(el, { staggerMs = 70, baseDelayMs = 250 } = {}) {
  const text = el.textContent;
  el.textContent = '';
  const letters = [];

  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'cursor-letter';
    span.textContent = ch;
    // поочерёдная задержка анимации появления (каскадом)
    span.style.setProperty('--letter-delay', `${baseDelayMs + letters.length * staggerMs}ms`);
    el.appendChild(span);
    letters.push(span);
  }

  let mx = -9999;
  let my = -9999;
  let ticking = false;

  const RADIUS = 170;

  function update() {
    ticking = false;
    for (const span of letters) {
      const r = span.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = cx - mx;
      const dy = cy - my;
      const dist = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - dist / RADIUS); // 1 у курсора, 0 вдали
      if (f > 0) {
        const push = dx * 0.045 * f;
        span.style.transform = `translateY(${-12 * f}px) translateX(${push}px) rotate(${dx * 0.03 * f}deg) scale(${1 + 0.18 * f})`;
        span.style.filter = `drop-shadow(0 0 ${16 * f}px rgba(255, 30, 60, ${0.9 * f}))`;
      } else if (span.style.transform) {
        span.style.transform = '';
        span.style.filter = '';
      }
    }
  }

  function onMove(ev) {
    mx = ev.clientX;
    my = ev.clientY;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function onLeave() {
    mx = -9999;
    my = -9999;
    requestAnimationFrame(update);
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  el.addEventListener('mouseleave', onLeave);
}
