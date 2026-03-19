(() => {
  const mount = document.getElementById("ls-upperfooter-mount");
  if (!mount) return;

  mount.innerHTML = `
    <section class="ls-upperfooter" aria-label="Laundry Services upperfooter">
      <div class="ls-upperfooter-col ls-upperfooter-brand">
        <img src="/static/img/logo-unatomo-v1.5.svg" alt="unatomo" class="ls-upperfooter-logo js-upperfooter-logo" loading="lazy" />
        <a href="/laundryservices/ls_sobre-nosotros/" class="ls-upperfooter-about-link" data-i18n="about_us_link">Sobre nosotros</a>
      </div>

      <div class="ls-upperfooter-col ls-upperfooter-col-main">
        <p class="ls-upperfooter-kicker">Laundry Services</p>
        <ul class="ls-upperfooter-list">
          <li data-i18n="card1_title">Auditoría t\u00e9cnica y de procesos</li>
          <li data-i18n="card2_title">Asesor\u00eda independiente de equipamiento</li>
          <li data-i18n="card3_title">Control de productividad, consumos y captura de datos</li>
          <li data-i18n="card6_title">Maquinaria</li>
          <li data-i18n="card5_title">Recambios</li>
          <li data-i18n="card4_title">Asistencia t\u00e9cnica</li>
        </ul>
      </div>

      <div class="ls-upperfooter-col ls-upperfooter-contact">
        <div class="contact-info">
          <div class="contact-info-item">
            <a class="contact-icon-link" href="mailto:info@unatomo.com" aria-label="Email" title="Email">
              <span class="contact-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v.01L12 13 20 6.01V6H4zm0 12h16V8l-8 7-8-7v10z"></path>
                </svg>
              </span>
            </a>
            <p>
              <a href="mailto:info@unatomo.com">info@unatomo.com</a>
            </p>
          </div>

          <div class="contact-info-item">
            <a class="contact-icon-link" href="tel:+34871252049" aria-label="Tel\u00e9fono" title="Tel\u00e9fono">
              <span class="contact-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2h2.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.21 2.22z"></path>
                </svg>
              </span>
            </a>
            <p>
              <a href="tel:+34871252049">+34 871 25 20 49</a>
            </p>
          </div>

          <div class="contact-info-item">
            <span class="contact-icon-link" role="img" aria-label="Horario" title="Horario">
              <span class="contact-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.009 8.009 0 01-8 8zm.5-13h-1v6l5 3 .5-.86-4.5-2.64z"></path>
                </svg>
              </span>
            </span>
            <p>
              <span data-i18n="contact_hours_value">De lunes a viernes, de 09:00 a 15:00 (Horario de Espa\u00f1a / CET).</span>
            </p>
          </div>

          <div class="contact-info-item">
            <span class="contact-icon-link" role="img" aria-label="Direcci\u00f3n" title="Direcci\u00f3n">
              <span class="contact-info-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2a7 7 0 00-7 7c0 4.25 5.13 10.21 6.38 11.57a1 1 0 001.48 0C13.87 19.21 19 13.25 19 9a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1114.5 9 2.5 2.5 0 0112 11.5z"></path>
                </svg>
              </span>
            </span>
            <p>CL. Lluna 2 1, 07440 Muro, Mallorca, Espa\u00f1a</p>
          </div>
        </div>
      </div>
    </section>
  `;

  const i18n = window.unatomoI18n;
  if (i18n && typeof i18n.setLanguage === "function") {
    const lang = document.documentElement.lang || (i18n.getLanguage && i18n.getLanguage()) || "es";
    i18n.setLanguage(lang);
  }

  const logo = mount.querySelector(".js-upperfooter-logo");
  const brandCol = mount.querySelector(".ls-upperfooter-brand");
  if (logo && brandCol) {
    logo.addEventListener("click", () => {
      brandCol.classList.toggle("is-logo-right");
    });
  }
})();
