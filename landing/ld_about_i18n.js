(() => {
  const LANGS = ["es", "en", "it", "el"];

  const I18N = {
    es: {
      page_title: "Sobre nosotros | unatomo",
      page_desc: "Información sobre UNATOMO CORE SL.",
      lang_option_en: "English",
      lang_option_it: "Italiano",
      lang_option_es: "Español",
      lang_option_el: "ellinika",
      privacy_link: "Política de privacidad y cookies",
      nfc_link: "NFC",
      contact_link: "Contacto",
      topbar_about: "UNATOMO/Nosotros",
      topbar_contact: "UNATOMO/Contacto",
      topbar_about_mobile: "/Nosotros",
      topbar_contact_mobile: "/Contacto",
      contact_page_title: "Contacto · unatomo",
      contact_email_label: "Correo electrónico:",
      contact_phone_label: "Teléfono:",
      contact_hours_label: "Horario de atención:",
      contact_hours_value: "De lunes a viernes, de 09:00 a 15:00 (Horario de España / CET).",
      contact_address_label: "Dirección:",
      contact_form_title: "Formulario de contacto",
      contact_name_label: "Nombre",
      contact_company_label: "Empresa",
      contact_country_label: "País",
      contact_email_field_label: "Correo electrónico",
      contact_phone_field_label: "Teléfono",
      contact_subject_label: "Asunto",
      contact_subject_placeholder: "Selecciona un asunto...",
      contact_subject_laundry: "Laundry Services",
      contact_subject_gastrosat: "GastroSat",
      contact_subject_nfc: "UNATOMO NFC",
      contact_subject_other: "Otro",
      contact_message_label: "Mensaje",
      contact_send: "Enviar",
      legal_footer: "UNATOMO CORE SL \u00b7 Todos los derechos reservados.",
      page_nav_back: "Volver",
      page_nav_top: "Arriba",
    },
    en: {
      page_title: "About us | unatomo",
      page_desc: "Information about UNATOMO CORE SL.",
      lang_option_en: "English",
      lang_option_it: "Italiano",
      lang_option_es: "Español",
      lang_option_el: "ellinika",
      privacy_link: "Privacy and cookies policy",
      nfc_link: "NFC",
      contact_link: "Contact",
      topbar_about: "UNATOMO/About",
      topbar_contact: "UNATOMO/Contact",
      topbar_about_mobile: "/About",
      topbar_contact_mobile: "/Contact",
      contact_page_title: "Contact · unatomo",
      contact_email_label: "Email:",
      contact_phone_label: "Phone:",
      contact_hours_label: "Support hours:",
      contact_hours_value: "Monday to Friday, from 09:00 to 15:00 (Spain time / CET).",
      contact_address_label: "Address:",
      contact_form_title: "Contact form",
      contact_name_label: "Name",
      contact_company_label: "Company",
      contact_country_label: "Country",
      contact_email_field_label: "Email",
      contact_phone_field_label: "Phone",
      contact_subject_label: "Subject",
      contact_subject_placeholder: "Select a subject...",
      contact_subject_laundry: "Laundry Services",
      contact_subject_gastrosat: "GastroSat",
      contact_subject_nfc: "UNATOMO NFC",
      contact_subject_other: "Other",
      contact_message_label: "Message",
      contact_send: "Send",
      legal_footer: "UNATOMO CORE SL \u00b7 All rights reserved.",
      page_nav_back: "Back",
      page_nav_top: "Top",
    },
    it: {
      page_title: "Chi siamo | unatomo",
      page_desc: "Informazioni su UNATOMO CORE SL.",
      lang_option_en: "English",
      lang_option_it: "Italiano",
      lang_option_es: "Español",
      lang_option_el: "ellinika",
      privacy_link: "Politica sulla privacy e cookie",
      nfc_link: "NFC",
      contact_link: "Contatto",
      topbar_about: "UNATOMO/Chi siamo",
      topbar_contact: "UNATOMO/Contatto",
      topbar_about_mobile: "/Chi siamo",
      topbar_contact_mobile: "/Contatto",
      contact_page_title: "Contatto · unatomo",
      contact_email_label: "Email:",
      contact_phone_label: "Telefono:",
      contact_hours_label: "Orario di assistenza:",
      contact_hours_value: "Dal lunedi al venerdi, dalle 09:00 alle 15:00 (Orario della Spagna / CET).",
      contact_address_label: "Indirizzo:",
      contact_form_title: "Modulo di contatto",
      contact_name_label: "Nome",
      contact_company_label: "Azienda",
      contact_country_label: "Paese",
      contact_email_field_label: "Email",
      contact_phone_field_label: "Telefono",
      contact_subject_label: "Oggetto",
      contact_subject_placeholder: "Seleziona un oggetto...",
      contact_subject_laundry: "Laundry Services",
      contact_subject_gastrosat: "GastroSat",
      contact_subject_nfc: "UNATOMO NFC",
      contact_subject_other: "Altro",
      contact_message_label: "Messaggio",
      contact_send: "Invia",
      legal_footer: "UNATOMO CORE SL \u00b7 Tutti i diritti riservati.",
      page_nav_back: "Indietro",
      page_nav_top: "Su",
    },
    el: {
      page_title: "Schetika me emas | unatomo",
      page_desc: "Plirofories gia tin UNATOMO CORE SL.",
      lang_option_en: "English",
      lang_option_it: "Italiano",
      lang_option_es: "Español",
      lang_option_el: "ellinika",
      privacy_link: "Politiki aporritou kai cookies",
      nfc_link: "NFC",
      contact_link: "Epikoinonia",
      topbar_about: "UNATOMO/Schetika me emas",
      topbar_contact: "UNATOMO/Epikoinonia",
      topbar_about_mobile: "/Schetika me emas",
      topbar_contact_mobile: "/Epikoinonia",
      contact_page_title: "Epikoinonia · unatomo",
      contact_email_label: "Email:",
      contact_phone_label: "Tilefono:",
      contact_hours_label: "Ores ypostirixis:",
      contact_hours_value: "Deftera eos Paraskevi, apo 09:00 eos 15:00 (Ora Ispanias / CET).",
      contact_address_label: "Dieythynsi:",
      contact_form_title: "Forma epikoinonias",
      contact_name_label: "Onoma",
      contact_company_label: "Etaireia",
      contact_country_label: "Chora",
      contact_email_field_label: "Email",
      contact_phone_field_label: "Tilefono",
      contact_subject_label: "Thema",
      contact_subject_placeholder: "Epilexte thema...",
      contact_subject_laundry: "Laundry Services",
      contact_subject_gastrosat: "GastroSat",
      contact_subject_nfc: "UNATOMO NFC",
      contact_subject_other: "Allo",
      contact_message_label: "Minima",
      contact_send: "Apostoli",
      legal_footer: "UNATOMO CORE SL \u00b7 Me epifylaxi pantos dikaiomatos.",
      page_nav_back: "Piso",
      page_nav_top: "Pano",
    },
  };

  const normalize = (lang) => (LANGS.includes(lang) ? lang : "es");

  const setLanguage = (lang) => {
    const next = normalize(lang);
    const t = I18N[next];

    document.documentElement.lang = next;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key || typeof t[key] !== "string") return;
      el.textContent = t[key];
    });

    document.title = t.page_title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t.page_desc);

    const label = document.querySelector(".lang-label");
    if (label) {
      label.textContent = ({ es: "ES", en: "EN", it: "IT", el: "EL" })[next] || "ES";
    }

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
