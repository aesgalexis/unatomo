// /static/js/contacto.js
window.initContacto = function initContacto(){
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = form.querySelector('.form-status'); // opcional: si quieres seguir mostrando estado inline
  const toast = document.getElementById('contact-toast');

  const setStatus = (msg, type = 'info') => {
    if (statusEl) {
      statusEl.textContent = msg || '';
      statusEl.dataset.type = type;
    }
  };

  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg || form.dataset.success || 'Enviado correctamente.';
    toast.hidden = false;
    toast.classList.add('is-visible');
  };

  const hideToast = () => {
    if (!toast) return;
    toast.classList.remove('is-visible');
    // usa un ligero retardo para ocultar (si hay transición CSS)
    setTimeout(() => { toast.hidden = true; }, 150);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form.dataset.error || 'Error en el formulario.', 'error');
      return;
    }

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });

      if (res.ok) {
        const successMsg = form.dataset.success || 'Enviado correctamente.';
        setStatus(successMsg, 'success'); // por si quieres además el mensaje inline
        showToast(successMsg);
        form.reset();

        const duration = parseInt(form.dataset.toastDuration || '3000', 10);
        const redirectTo = (form.dataset.redirectAfter || '').trim();

        setTimeout(() => {
          hideToast();
          if (redirectTo) {
            // Mantiene SPA: cambia hash si es ruta interna tipo "/es/#inicio"
            if (redirectTo.startsWith('#') || redirectTo.includes('#')) {
              location.hash = redirectTo.replace(/.*#/, '#');
            } else {
              location.href = redirectTo;
            }
          }
        }, isNaN(duration) ? 3000 : duration);

      } else {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data && data.errors && data.errors.map(e => e.message).join(', ')) ||
          form.dataset.error ||
          'No se pudo enviar. Inténtalo más tarde.';
        setStatus(msg, 'error');
        showToast(msg);
        setTimeout(hideToast, 3000);
      }
    } catch {
      const msg = 'Error de red. Inténtalo de nuevo.';
      setStatus(msg, 'error');
      showToast(msg);
      setTimeout(hideToast, 3000);
    }
  });
};
