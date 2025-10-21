// /static/js/theme.js
(() => {
  'use strict';

  const STORAGE_KEY = 'ui-theme'; // 'light' | 'dark'
  const btn = document.getElementById('themeToggle');
  const metaColor = document.querySelector('meta[name="color-scheme"]');
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  // Aplica tema. Si mode === null, usa el del sistema sin fijarlo en data-theme.
  function applyTheme(mode /* 'light' | 'dark' | null */) {
    // Limpia primero
    if (mode === null) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.dataset.theme = mode;
    }

    // Tema efectivo (si no hay manual, el del SO)
    const effective = mode ?? (mq.matches ? 'dark' : 'light');

    // UI del botón
    const icon  = effective === 'dark' ? '☀️' : '🌙';
    const text  = effective === 'dark' ? 'Light' : 'Dark';
    const label = effective === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

    btn?.querySelector('.icon')?.replaceChildren(document.createTextNode(icon));
    btn?.querySelector('.label')?.replaceChildren(document.createTextNode(text));
    if (btn) {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }

    // Meta color-scheme para que el UA pinte formularios/barras correctamente
    metaColor?.setAttribute('content', effective === 'dark' ? 'dark light' : 'light dark');
  }

  // Estado inicial
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);           // preferencia manual
  } else {
    applyTheme(null);            // respeta el SO
  }

  // Cambios del SO: solo si NO hay preferencia manual
  const onSystemChange = (e) => {
    const hasManual = localStorage.getItem(STORAGE_KEY);
    if (hasManual !== 'light' && hasManual !== 'dark') {
      applyTheme(null);
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
  else if (mq.addListener) mq.addListener(onSystemChange); // compat

  // Toggle manual
  btn?.addEventListener('click', () => {
    // Tema actual efectivo
    const effectiveNow = (document.documentElement.dataset.theme)
      ? document.documentElement.dataset.theme
      : (mq.matches ? 'dark' : 'light');

    const next = (effectiveNow === 'dark') ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });

  // (Opcional) Doble clic para volver a seguir el SO (olvida preferencia manual)
  btn?.addEventListener('dblclick', () => {
    localStorage.removeItem(STORAGE_KEY);
    applyTheme(null);
  });
})();
