import { ensureSession } from './api.js';
import { bootState } from './state.js';
import { initWaves } from './fx/waves.js';
import { initSpotlight } from './fx/spotlight.js';
import { homeView } from './views/home.js';
import { aboutView } from './views/about.js';
import { orderView } from './views/order.js';
import './components/chat.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');

const routes = {
  '#/': homeView,
  '#/about': aboutView,
  '#/order': orderView,
};

let currentViewEl = null;

function render() {
  const hash = location.hash || '#/';
  const viewFn = routes[hash] ?? homeView;

  if (currentViewEl) {
    currentViewEl.dispatchEvent(new CustomEvent('view:leave'));
  }

  viewFn(app);
  currentViewEl = app.firstElementChild;

  for (const link of nav.querySelectorAll('a')) {
    link.classList.toggle('active', link.dataset.route === hash);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

window.addEventListener('hashchange', render);

async function boot() {
  initWaves();
  initSpotlight();

  try {
    await ensureSession();
    await bootState();
  } catch (err) {
    console.error('[app] boot failed:', err);
  }

  render();
}

boot();
