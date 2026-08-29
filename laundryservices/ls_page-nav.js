(() => {
  const COPY = {
    es: {back: "Volver", top: "Arriba"},
    en: {back: "Back", top: "Top"},
    it: {back: "Indietro", top: "In alto"},
    el: {back: "Πίσω", top: "Επάνω"},
  };
  const BACK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m14.7 5.3-1.4-1.4L5.2 12l8.1 8.1 1.4-1.4L9 13h10v-2H9l5.7-5.7Z"></path></svg>';
  const TOP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 4-8.1 8.1 1.4 1.4 5.7-5.7V20h2V7.8l5.7 5.7 1.4-1.4L12 4Z"></path></svg>';
  const language = (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
  const labels = COPY[language] || COPY.es;
  const backHref = (document.body.dataset.backHref || "").trim();

  if (document.querySelector(".ls-minimal-page-nav")) return;
  const createButton = (label, icon) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ls-minimal-page-nav-button";
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;
    return button;
  };

  const nav = document.createElement("nav");
  nav.className = "ls-minimal-page-nav";
  nav.setAttribute("aria-label", `${labels.back} / ${labels.top}`);
  const backButton = createButton(labels.back, BACK_ICON);
  const topButton = createButton(labels.top, TOP_ICON);
  topButton.hidden = true;

  backButton.addEventListener("click", () => {
    if (backHref) window.location.href = backHref;
    else window.history.back();
  });
  topButton.addEventListener("click", () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top: 0, behavior: reducedMotion ? "auto" : "smooth"});
  });

  let scrollFrame = 0;
  const syncTopButton = () => {
    scrollFrame = 0;
    topButton.hidden = window.scrollY < 24;
  };
  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(syncTopButton);
  }, {passive: true});

  nav.append(backButton, topButton);
  document.body.appendChild(nav);
  syncTopButton();
})();
