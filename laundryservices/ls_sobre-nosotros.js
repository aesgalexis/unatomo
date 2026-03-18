(() => {
  const copies = Array.from(document.querySelectorAll("[data-legal-lang]"));
  if (!copies.length) return;

  const META = {
    es: {
      title: "Sobre nosotros | Laundry Services",
      desc: "Información sobre Laundry Services y UNATOMO CORE SL.",
    },
    en: {
      title: "About us | Laundry Services",
      desc: "Information about Laundry Services and UNATOMO CORE SL.",
    },
    it: {
      title: "Chi siamo | Laundry Services",
      desc: "Informazioni su Laundry Services e UNATOMO CORE SL.",
    },
    el: {
      title: "Σχετικα με εμας | Laundry Services",
      desc: "Πληροφοριες για το Laundry Services και την UNATOMO CORE SL.",
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
