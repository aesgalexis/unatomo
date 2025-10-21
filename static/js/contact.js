// /static/js/contact.js
(() => {
  'use strict';

  const FORM_ENDPOINT = 'https://formspree.io/f/XXXXXXXX'; // <-- PÓN TU ENDPOINT
  const SECTION_SELECTOR = '#section-seccion-7';
  const ROOT_ID = 'contact-root';
  let mounted = false;

  const formHTML = `
    
    <form id="contactForm" novalidate>
      <input type="text" name="company_website" autocomplete="off" tabindex="-1" aria-hidden="true" class="hp" placeholder="No rellenar">

      <div class="grid">
        <div class="field">
          <label for="name">Nombre *</label>
          <input id="name" name="name" type="text" required autocomplete="name" />
          <small class="err" data-for="name"></small>
        </div>

        <div class="field">
          <label for="email">Email *</label>
          <input id="email" name="email" type="email" required autocomplete="email" />
          <small class="err" data-for="email"></small>
        </div>

        <div class="field">
          <label for="phone">Teléfono</label>
          <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" />
        </div>

        <div class="field">
          <label for="company">Empresa</label>
          <input id="company" name="company" type="text" autocomplete="organization" />
        </div>

        <div class="field">
          <label for="country">País</label>
          <input id="country" name="country" type="text" autocomplete="country-name" />
        </div>

        <div class="field">
          <label for="topic">Tema *</label>
          <select id="topic" name="topic" required>
            <option value="">Selecciona…</option>
            <option>Asistencia técnica</option>
            <option>Mantenimiento</option>
            <option>Optimización de procesos</option>
            <option>Control de producción</option>
            <option>Formación</option>
            <option>Asesoría en compra de maquinaria</option>
            <option>Otro</option>
          </select>
          <small class="err" data-for="topic"></small>
        </div>

        <div class="field wide">
          <label for="message">Mensaje *</label>
          <textarea id="message" name="message" rows="6" required></textarea>
          <small class="err" data-for="message"></small>
        </div>

        <div class="field wide compact">
          <label class="check">
            <input type="checkbox" id="consent" name="consent" required />
            Acepto el tratamiento de mis datos conforme al RGPD y la política de privacidad. *
          </label>
          <small class="err" data-for="consent"></small>
        </div>
      </div>

      <div class="actions">
        <button id="submitBtn" type="submit">Enviar</button>
        <p id="formStatus" role="status" aria-live="polite"></p>
      </div>
 
    </form>
  `;

  function mountForm() {
    if (mounted) return;
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.innerHTML = formHTML;
    wireForm();
    mounted = true;
  }

  function onSectionActivated(sectionEl) {
    if (!sectionEl.classList.contains('is-active')) return;
    mountForm();
  }

  function boot() {
    const section = document.querySelector(SECTION_SELECTOR);
    if (!section) return;
    // Si ya está activa al cargar
    if (section.classList.contains('is-active')) mountForm();

    // Observa cambios de clase para activar cuando se muestre
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          onSectionActivated(section);
        }
      }
    });
    obs.observe(section, { attributes: true });
  }

  function wireForm() {
    const form = document.getElementById('contactForm');
    const btn  = document.getElementById('submitBtn');
    const status = document.getElementById('formStatus');

    const setStatus = (msg, ok = true) => {
      status.textContent = msg || '';
      status.style.color = ok ? 'inherit' : '#b91c1c';
    };
    const fieldError = (id, msg) => {
      const small = form.querySelector(`.err[data-for="${id}"]`);
      if (small) small.textContent = msg || '';
    };
    const clearErrors = () => {
      form.querySelectorAll('.err').forEach(s => s.textContent = '');
      setStatus('');
    };

    const validate = () => {
      clearErrors();
      let ok = true;
      ['name','email','topic','message','consent'].forEach(id => {
        const el = form.querySelector('#' + id);
        if (!el) return;
        const empty = (el.type === 'checkbox') ? !el.checked : !(el.value || '').trim();
        if (empty) { ok = false; fieldError(id, 'Campo obligatorio'); }
      });
      const email = form.querySelector('#email')?.value.trim() || '';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ok = false; fieldError('email', 'Email no válido');
      }
      const hp = form.querySelector('input[name="company_website"]')?.value;
      if (hp && hp.trim() !== '') return false; // spam
      return ok;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate()) { setStatus('Revisa los campos marcados.', false); return; }

      try {
        btn.disabled = true;
        setStatus('Enviando…');

        const data = new FormData(form);
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('Network');

        form.reset();
        setStatus('Mensaje enviado. Gracias, te contactaremos pronto.');
      } catch (err) {
        setStatus('No se pudo enviar. Inténtalo de nuevo o escríbenos a hola@unatomo.com.', false);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // arranque
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

