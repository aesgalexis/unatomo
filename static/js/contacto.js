// /static/js/contacto.js
(() => {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"], [type="submit"]');
  if (!submitBtn) return;

  // Crear/colocar el mensaje a la IZQUIERDA del botón
  let statusEl = form.querySelector('.form-status-inline');
  if (!statusEl) {
    statusEl = document.createElement('span');
    statusEl.className = 'form-status-inline';
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    statusEl.hidden = true;
  }

  // Asegurar contenedor en fila para status + botón
  let actions = submitBtn.parentElement;
  if (!actions || !actions.classList.contains('form-actions')) {
    actions = document.createElement('div');
    actions.className = 'form-actions';
    submitBtn.replaceWith(actions);
    actions.appendChild(statusEl);       // primero el mensaje
    actions.appendChild(submitBtn);      // luego el botón
  } else {
    actions.insertBefore(statusEl, submitBtn);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    submitBtn.setAttribute('disabled', 'true');
    const data = new FormData(form);

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' } // evita redirección de Formspree
      });

      if (res.ok) {
        statusEl.textContent = 'Su mensaje ha sido enviado correctamente. Responderemos lo antes posible.';
        statusEl.classList.remove('error');
        statusEl.classList.add('success');
        statusEl.hidden = false;
        form.reset();

        // Ocultar a los 5s
        setTimeout(() => { statusEl.hidden = true; }, 5000);
      } else {
        let errText = 'Ha ocurrido un problema. Inténtelo de nuevo.';
        try {
          const j = await res.json();
          if (j?.errors?.length) errText = j.errors.map(e => e.message).join(' · ');
        } catch {}
        statusEl.textContent = errText;
        statusEl.classList.remove('success');
        statusEl.classList.add('error');
        statusEl.hidden = false;
      }
    } catch {
      statusEl.textContent = 'No hay conexión o el servicio no responde. Vuelva a intentarlo.';
      statusEl.classList.remove('success');
      statusEl.classList.add('error');
      statusEl.hidden = false;
    } finally {
      submitBtn.removeAttribute('disabled');
    }
  }

  form.addEventListener('submit', handleSubmit, { passive: false });
})();
