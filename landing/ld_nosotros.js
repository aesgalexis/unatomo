(() => {
  const copies = Array.from(document.querySelectorAll("[data-legal-lang]"));
  if (!copies.length) return;

  const META = {
    es: {
      title: "Sobre nosotros | unatomo",
      desc: "Informacion sobre UNATOMO CORE SL.",
    },
    en: {
      title: "About us | unatomo",
      desc: "Information about UNATOMO CORE SL.",
    },
    it: {
      title: "Chi siamo | unatomo",
      desc: "Informazioni su UNATOMO CORE SL.",
    },
    el: {
      title: "Schetika me emas | unatomo",
      desc: "Plirofories gia tin UNATOMO CORE SL.",
    },
  };

  const normalize = (lang) => (["es", "en", "it", "el"].includes(lang) ? lang : "es");

  const applyLanguage = (lang) => {
    const active = normalize(lang);
    let visible = false;

    copies.forEach((el) => {
      const match = el.getAttribute("data-legal-lang") === active;
      el.hidden = !match;
      if (match) visible = true;
    });

    if (!visible) {
      const fallback = copies.find((el) => el.getAttribute("data-legal-lang") === "en");
      if (fallback) fallback.hidden = false;
    }

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
