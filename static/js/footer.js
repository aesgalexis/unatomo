(() => {
  const y = document.getElementById('year-now');
  if (y) y.textContent = String(new Date().getFullYear());

  // Si tienes enlaces con data-section en el footer inline:
  document.querySelectorAll('#site-footer a[data-section]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const key = a.getAttribute('data-section');
      if (!key) return;
      history.pushState({ key, from: 'top' }, '', `#${key}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      document.getElementById('app')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  });
})();
