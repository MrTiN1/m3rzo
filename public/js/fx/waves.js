/**
 * Анимированные чёрно-красные волны на полноэкранном canvas.
 * 4 слоя синусоид с параллаксом; пауза при скрытой вкладке;
 * учёт prefers-reduced-motion (один статичный кадр).
 */
export function initWaves() {
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduced) draw(0);
  }

  const LAYERS = [
    { amp: 46, freq: 0.0055, speed: 0.00042, y: 0.62, color: [255, 30, 60], alpha: 0.10, width: 2 },
    { amp: 34, freq: 0.0075, speed: 0.00058, y: 0.68, color: [255, 60, 50], alpha: 0.13, width: 2 },
    { amp: 56, freq: 0.0040, speed: 0.00030, y: 0.76, color: [200, 10, 40], alpha: 0.16, width: 2.5 },
    { amp: 24, freq: 0.0110, speed: 0.00080, y: 0.84, color: [255, 90, 60], alpha: 0.09, width: 1.5 },
  ];

  function draw(t) {
    ctx.clearRect(0, 0, w, h);

    // лёгкое красное зарево у горизонта
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, Math.max(w, h) * 0.6);
    glow.addColorStop(0, 'rgba(255, 20, 50, 0.07)');
    glow.addColorStop(1, 'rgba(255, 20, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    for (const L of LAYERS) {
      ctx.beginPath();
      const baseY = h * L.y;
      for (let x = 0; x <= w; x += 6) {
        const y =
          baseY +
          Math.sin(x * L.freq + t * L.speed) * L.amp +
          Math.sin(x * L.freq * 2.3 - t * L.speed * 1.7) * L.amp * 0.35;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const [r, g, b] = L.color;
      ctx.strokeStyle = `rgba(${r},${g},${b},${L.alpha})`;
      ctx.lineWidth = L.width;
      ctx.shadowColor = `rgba(${r},${g},${b},${L.alpha * 2.2})`;
      ctx.shadowBlur = 18;
      ctx.stroke();

      // заполнение под волной — глубина
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},${L.alpha * 0.16})`;
      ctx.shadowBlur = 0;
      ctx.fill();
    }
  }

  function frame(t) {
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf && !reduced) {
      raf = requestAnimationFrame(frame);
    }
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  resize();
  if (!reduced) raf = requestAnimationFrame(frame);
}
