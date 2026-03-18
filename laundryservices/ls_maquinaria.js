(() => {
  const copies = Array.from(document.querySelectorAll("[data-legal-lang]"));
  if (!copies.length) return;

  const META = {
    es: {
      title: "Maquinaria de ocasión | Laundry Services",
      desc: "Listado de maquinaria de ocasión de Laundry Services.",
    },
    en: {
      title: "Used Machinery | Laundry Services",
      desc: "Used machinery listing from Laundry Services.",
    },
    it: {
      title: "Macchinari usati | Laundry Services",
      desc: "Elenco di macchinari usati di Laundry Services.",
    },
    el: {
      title: "Μεταχειρισμενα μηχανηματα | Laundry Services",
      desc: "Λιστα μεταχειρισμενων μηχανηματων απο το Laundry Services.",
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

  copies.forEach((copy) => {
    const buttons = Array.from(copy.querySelectorAll(".ls-filter-btn"));
    const rows = Array.from(
      copy.querySelectorAll(".ls-table tbody tr[data-machine-id]")
    );
    if (!buttons.length || !rows.length) return;

    const applyFilter = (filter) => {
      rows.forEach((row) => {
        const typeCell = row.querySelector("td[data-type]");
        const subrow =
          row.nextElementSibling && row.nextElementSibling.classList.contains("ls-table-subrow")
            ? row.nextElementSibling
            : null;
        const galleryRow =
          subrow && subrow.nextElementSibling && subrow.nextElementSibling.classList.contains("ls-table-gallery-row")
            ? subrow.nextElementSibling
            : null;
        const matches = filter === "all" || (typeCell && typeCell.dataset.type === filter);
        row.hidden = !matches;
        if (galleryRow) {
          galleryRow.hidden = !matches || galleryRow.dataset.galleryOpen !== "true";
        }
        if (subrow && subrow.classList.contains("ls-table-subrow")) {
          subrow.hidden = !matches;
        }
      });

      buttons.forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === filter);
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter || "all"));
    });

    applyFilter("all");
  });
})();
