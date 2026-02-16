(() => {
  const copies = Array.from(document.querySelectorAll("[data-legal-lang]"));
  if (!copies.length) return;

  const META = {
    es: {
      title: "Politica de privacidad y cookies | Laundry Services",
      desc: "Politica de privacidad y cookies de Laundry Services.",
    },
    en: {
      title: "Privacy and Cookies Policy | Laundry Services",
      desc: "Privacy and cookies policy for Laundry Services.",
    },
    el: {
      title: "Πολιτικη απορρητου και cookies | Laundry Services",
      desc: "Πολιτικη απορρητου και cookies του Laundry Services.",
    },
  };

  const normalize = (lang) => (["es", "en", "el"].includes(lang) ? lang : "es");

  const applyLanguage = (lang) => {
    const active = normalize(lang);
    copies.forEach((el) => {
      el.hidden = el.getAttribute("data-legal-lang") !== active;
    });

    const meta = META[active] || META.es;
    document.title = meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", meta.desc);
  };

  const initial =
    (window.unatomoI18n && typeof window.unatomoI18n.getLanguage === "function"
      ? window.unatomoI18n.getLanguage()
      : document.documentElement.lang) || "es";

  applyLanguage(initial);

  document.addEventListener("app:language-change", (event) => {
    applyLanguage(event?.detail?.lang || "es");
  });
})();
