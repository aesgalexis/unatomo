
(() => {
  const y = document.getElementById('year-now');
  if (y) y.textContent = String(new Date().getFullYear());

  document.querySelectorAll('#site-footer a[data-section]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const key = a.getAttribute('data-section');
      if (!key) return;
      // sin pushState: activa y listo
      const ev = new Event('click', { bubbles: true, cancelable: true });

      const side = document.querySelector(`#sidebar-menu a[data-section="${key}"]`);
      if (side) side.dispatchEvent(ev);
    });
  });
})();
