// /static/js/contacto.js
window.initContacto = function initContacto(){
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = form.querySelector('.form-status');

  const setStatus = (msg, type = 'info') => {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.dataset.type = type; // úsalo en CSS si quieres estilos por estado
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
        setStatus(form.dataset.success || 'Enviado correctamente.', 'success');
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data && data.errors && data.errors.map(e => e.message).join(', ')) ||
          form.dataset.error ||
          'No se pudo enviar. Inténtalo más tarde.';
        setStatus(msg, 'error');
      }
    } catch {
      setStatus('Error de red. Inténtalo de nuevo.', 'error');
    }
  });
};
