(() => {
  const mount = document.getElementById("ls-upperfooter-mount");
  if (!mount) return;

  mount.innerHTML = `
    <section class="ls-upperfooter" aria-label="Laundry Services upperfooter">
      <div class="ls-upperfooter-col ls-upperfooter-brand is-logo-right">
        <a class="ls-upperfooter-logo-link" href="https://unatomo.com/" aria-label="unatomo.com">
          <img src="/static/img/logo-unatomo-v1.5.svg" alt="unatomo" class="ls-upperfooter-logo" loading="lazy" />
        </a>
      </div>

      <div class="ls-upperfooter-col ls-upperfooter-col-main">
        <p class="ls-upperfooter-kicker">Laundry Services</p>
        <ul class="ls-upperfooter-list">
          <li data-i18n="card1_title">Auditoría t\u00e9cnica y mejora de procesos</li>
          <li data-i18n="card4_title">Asistencia t\u00e9cnica y resoluci\u00f3n de problemas</li>
          <li data-i18n="card2_title">Inversiones y equipamiento</li>
          <li data-i18n="card3_title">Productividad y herramientas digitales</li>
        </ul>
      </div>

    </section>
  `;

  const i18n = window.unatomoI18n;
  if (i18n && typeof i18n.setLanguage === "function") {
    const lang = document.documentElement.lang || (i18n.getLanguage && i18n.getLanguage()) || "es";
    i18n.setLanguage(lang);
  }

})();
