// /static/js/contacto.js
(() => {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  // Mensaje inline: crea uno si no existe
  let statusEl = form.querySelector('.form-status');
  if (!statusEl) {
    statusEl = document.createElement('p');
    statusEl.className = 'form-status';
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    statusEl.hidden = true;
    form.appendChild(statusEl);
  }

  // Toast superior (opcional)
  function showToast(msg, variant = 'ok', timeout = 4000) {
    const t = document.createElement('div');
    t.className = `toast ${variant}`;
    t.textContent = msg;
    document.body.appendChild(t);
    // fuerza reflow para la animación
    // eslint-disable-next-line no-unused-expressions
    t.offsetHeight; 
    t.classList.add('show');
    setTimeout(() => {
      t.classList.remove('show');
      t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, timeout);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn?.setAttribute('disabled', 'true');

    // Construye el cuerpo
    const data = new FormData(form);

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' } // evita redirección de Formspree
      });

      if (res.ok) {
        // Mensaje inline
        statusEl.textContent = 'Su mensaje ha sido enviado correctamente. Responderemos lo antes posible.';
        statusEl.classList.remove('error');
        statusEl.classList.add('success');
        statusEl.hidden = false;

        // Toast opcional arriba
        showToast('Mensaje enviado ✅', 'ok', 3500);

        // Limpia y oculta el inline a los 5s
        form.reset();
        setTimeout(() => { statusEl.hidden = true; }, 5000);
      } else {
        // Intenta leer error de Formspree
        let errText = 'Ha ocurrido un problema. Inténtelo de nuevo.';
        try {
          const j = await res.json();
          if (j?.errors?.length) {
            errText = j.errors.map(e => e.message).join(' · ');
          }
        } catch {}
        statusEl.textContent = errText;
        statusEl.classList.remove('success');
        statusEl.classList.add('error');
        statusEl.hidden = false;
        showToast('No se pudo enviar 😕', 'error', 4000);
      }
    } catch (err) {
      statusEl.textContent = 'No hay conexión o el servicio no responde. Vuelva a intentarlo en unos segundos.';
      statusEl.classList.remove('success');
      statusEl.classList.add('error');
      statusEl.hidden = false;
      showToast('Error de red', 'error', 4000);
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  }

  form.addEventListener('submit', handleSubmit, { passive: false });
})();
