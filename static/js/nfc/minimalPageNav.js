const BACK_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="m14.7 5.3-1.4-1.4L5.2 12l8.1 8.1 1.4-1.4L9 13h10v-2H9l5.7-5.7Z"></path>
  </svg>
`;

const TOP_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="m12 4-8.1 8.1 1.4 1.4 5.7-5.7V20h2V7.8l5.7 5.7 1.4-1.4L12 4Z"></path>
  </svg>
`;

const createControl = (label, icon) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nfc-minimal-page-nav-button";
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;
  return button;
};

export const mountNfcMinimalPageNav = ({
  backLabel = "Volver",
  topLabel = "Arriba",
  backHref = "",
  hideBackOnDashboard = false
} = {}) => {
  const existing = document.querySelector(".nfc-minimal-page-nav");
  if (existing) return existing;

  const nav = document.createElement("nav");
  nav.className = "nfc-minimal-page-nav";
  nav.setAttribute("aria-label", `${backLabel} / ${topLabel}`);

  const backButton = createControl(backLabel, BACK_ICON);
  const topButton = createControl(topLabel, TOP_ICON);
  topButton.hidden = true;

  const syncBackButton = () => {
    if (!hideBackOnDashboard) {
      backButton.hidden = false;
      return;
    }
    const section = (window.location.hash || "")
      .replace(/^#/, "")
      .replace(/^\/+/, "")
      .trim()
      .toLowerCase();
    backButton.hidden = !section || section === "dashboard";
  };

  backButton.addEventListener("click", () => {
    if (backHref) window.location.href = backHref;
    else window.history.back();
  });
  topButton.addEventListener("click", () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  let scrollFrame = 0;
  const syncTopButton = () => {
    scrollFrame = 0;
    topButton.hidden = window.scrollY < 24;
  };
  const queueTopButtonSync = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(syncTopButton);
  };

  window.addEventListener("scroll", queueTopButtonSync, { passive: true });
  window.addEventListener("hashchange", syncBackButton);
  syncBackButton();
  syncTopButton();
  nav.append(backButton, topButton);
  document.body.appendChild(nav);
  return nav;
};
