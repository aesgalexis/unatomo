(() => {
  const LANGS = ["es", "en", "it", "el"];

  const I18N = {
    es: {
      page_title: "unatomo",
      claim: "Nos gustan las máquinas",
      privacy_link: "Política de privacidad y cookies",
      contact_email_aria: "Correo electrónico",
      contact_phone_aria: "Teléfono",
      contact_hours_aria: "Horario",
      contact_address_aria: "Dirección",
      contact_hours_html: "De lunes a viernes, de 09:00 a 15:00<br>(Horario de España / CET).",
      legal_footer: "UNATOMO CORE SL - Todos los derechos reservados.",
    },
    en: {
      page_title: "unatomo",
      claim: "We like machines",
      privacy_link: "Privacy and cookies policy",
      contact_email_aria: "Email",
      contact_phone_aria: "Phone",
      contact_hours_aria: "Hours",
      contact_address_aria: "Address",
      contact_hours_html: "Monday to Friday, from 09:00 to 15:00<br>(Spain time / CET).",
      legal_footer: "UNATOMO CORE SL - All rights reserved.",
    },
    it: {
      page_title: "unatomo",
      claim: "Ci piacciono le macchine",
      privacy_link: "Politica sulla privacy e cookie",
      contact_email_aria: "Email",
      contact_phone_aria: "Telefono",
      contact_hours_aria: "Orario",
      contact_address_aria: "Indirizzo",
      contact_hours_html: "Dal lunedì al venerdì, dalle 09:00 alle 15:00<br>(Orario della Spagna / CET).",
      legal_footer: "UNATOMO CORE SL - Tutti i diritti riservati.",
    },
    el: {
      page_title: "unatomo",
      claim: "Μας αρέσουν οι μηχανές",
      privacy_link: "Πολιτικη απορρητου και cookies",
      contact_email_aria: "Email",
      contact_phone_aria: "Τηλέφωνο",
      contact_hours_aria: "Ωράριο",
      contact_address_aria: "Διεύθυνση",
      contact_hours_html: "Δευτέρα έως Παρασκευή, 09:00 έως 15:00<br>(Ώρα Ισπανίας / CET).",
      legal_footer: "UNATOMO CORE SL - Με επιφύλαξη παντός δικαιώματος.",
    },
  };

  const normalize = (lang) => (LANGS.includes(lang) ? lang : "es");

  const setLanguage = (lang) => {
    const next = normalize(lang);
    const t = I18N[next];

    document.documentElement.lang = next;
    document.title = t.page_title;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key || typeof t[key] !== "string") return;
      el.textContent = t[key];
    });

    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (!key || typeof t[key] !== "string") return;
      el.innerHTML = t[key];
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria-label");
      if (!key || typeof t[key] !== "string") return;
      el.setAttribute("aria-label", t[key]);
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (!key || typeof t[key] !== "string") return;
      el.setAttribute("title", t[key]);
    });

    try {
      localStorage.setItem("lang", next);
    } catch {}

    document.dispatchEvent(
      new CustomEvent("app:language-change", { detail: { lang: next, dict: t } })
    );
  };

  const getLanguage = () => {
    try {
      const stored = localStorage.getItem("lang");
      if (stored) return normalize(stored);
    } catch {}

    const fromBrowser =
      (navigator.languages && navigator.languages[0]) ||
      navigator.language ||
      document.documentElement.lang ||
      "es";

    return normalize(String(fromBrowser).slice(0, 2).toLowerCase());
  };

  window.unatomoI18n = { setLanguage, getLanguage, supported: [...LANGS] };
  setLanguage(getLanguage());
})();
