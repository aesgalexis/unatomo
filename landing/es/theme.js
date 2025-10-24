(() => {
  'use strict';
  const STORAGE_KEY = 'ui-theme'; // 'light' | 'dark'
  const btn = document.getElementById('themeToggle');
  const metaColor = document.querySelector('meta[name="color-scheme"]');

  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = (saved === 'light' || saved === 'dark') ? saved : 'light';
  applyTheme(initial);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = (e) => {
    const hasManual = localStorage.getItem(STORAGE_KEY);
    if (hasManual) return;
    applyTheme(e.matches ? 'dark' : 'light');
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);

  btn?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  function applyTheme(mode) {
    document.documentElement.dataset.theme = mode;
    const icon  = mode === 'dark' ? '☀️' : '🌙';
    const text  = mode === 'dark' ? 'Claro' : 'Oscuro';
    const label = mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

    btn?.querySelector('.icon')?.replaceChildren(document.createTextNode(icon));
    btn?.querySelector('.label')?.replaceChildren(document.createTextNode(text));
    if (btn) {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
    metaColor?.setAttribute('content', mode === 'dark' ? 'dark light' : 'light dark');
  }
})();
