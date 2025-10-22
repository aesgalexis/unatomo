// Lógica sin textos: solo engancha eventos y usa mensajes del HTML (data-attrs)
window.initContacto = function initContacto(){
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = form.querySelector('.form-status');

  const setStatus = (msg, type = 'info') => {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.dataset.type = type; // por si quieres estilizar [data-type="success|error|info"]
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form.dataset.error || '', 'error');
      return;
    }

    // 👉 aquí iría tu fetch real al backend
    // fetch('/api/contacto', { method:'POST', body: new FormData(form) })...

    // Demo OK
    setStatus(form.dataset.success || '', 'success');
    form.reset();
  });
};
