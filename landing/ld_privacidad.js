(() => {
  const copies = Array.from(document.querySelectorAll("[data-legal-lang]"));
  if (!copies.length) return;

  const META = {
    es: {
      title: "Política de privacidad y cookies | unatomo",
      desc: "Política de privacidad y cookies de unatomo.",
    },
    en: {
      title: "Privacy and Cookies Policy | unatomo",
      desc: "Privacy and cookies policy for unatomo.",
    },
    it: {
      title: "Privacy e Cookie Policy | unatomo",
      desc: "Privacy e cookie policy per unatomo.",
    },
    el: {
      title: "Πολιτικη απορρητου και cookies | unatomo",
      desc: "Πολιτικη απορρητου και cookies της unatomo.",
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
