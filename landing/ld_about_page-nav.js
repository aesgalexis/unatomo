(() => {
  const topBtn = document.getElementById("scroll-top-button");
  const backBtn = document.getElementById("back-button");

  const updateLabels = (dict) => {
    if (backBtn) backBtn.textContent = dict?.page_nav_back || "Volver";
    if (topBtn) topBtn.textContent = dict?.page_nav_top || "Arriba";
  };

  if (topBtn) {
    const syncTopButton = () => {
      topBtn.hidden = window.scrollY < 24;
    };

    syncTopButton();
    window.addEventListener("scroll", syncTopButton, { passive: true });

    topBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (backBtn) {
    const backHref = (document.body.dataset.backHref || "").trim();
    const backMode = (document.body.dataset.backMode || "").trim();

    if (backHref) {
      backBtn.hidden = false;
      backBtn.addEventListener("click", () => (window.location.href = backHref));
    } else if (backMode === "history") {
      backBtn.hidden = false;
      backBtn.addEventListener("click", () => history.back());
    } else {
      backBtn.hidden = true;
    }
  }

  const currentLang = document.documentElement.lang || "es";
  updateLabels(
    currentLang === "en"
      ? { page_nav_back: "Back", page_nav_top: "Top" }
      : currentLang === "it"
        ? { page_nav_back: "Indietro", page_nav_top: "Su" }
        : currentLang === "el"
          ? { page_nav_back: "Piso", page_nav_top: "Pano" }
          : null
  );

  document.addEventListener("app:language-change", (event) => {
    updateLabels(event?.detail?.dict || null);
  });
})();
